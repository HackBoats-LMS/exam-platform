'use server'

import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import ExamConfig from '@/models/ExamConfig'
import Question from '@/models/Question'
import QuestionSet from '@/models/QuestionSet'
import College from '@/models/College'
import Department from '@/models/Department'
import ExamAttempt from '@/models/ExamAttempt'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { revalidatePath } from 'next/cache'
import { getFromRedisOrDb, invalidateRedisTag } from '@/lib/redis'
// --- Cached Helpers ---
const getCachedValidSets = async () => getFromRedisOrDb(
    'valid-question-sets',
    async () => {
        await dbConnect()
        const setsWithQuestions = await Question.distinct('setName')
        return setsWithQuestions.filter((s: string) => s && s.trim() !== '')
    }
)

const getCachedQuestionsForSet = async (setName: string) => getFromRedisOrDb(
    `questions-by-set:${setName}`,
    async () => {
        await dbConnect()
        const questions = await Question.find(
            { setName },
            { correctOption: 0 }
        ).sort({ sectionName: 1, createdAt: 1 }).lean()
        return JSON.parse(JSON.stringify(questions))
    }
)

const getCachedQuestionsWithAnswersForSet = async (setName: string) => getFromRedisOrDb(
    `questions-answers-by-set:${setName}`,
    async () => {
        await dbConnect()
        const questions = await Question.find({ setName }).lean()
        return JSON.parse(JSON.stringify(questions)) // Contains correctOption
    }
)
// --- Helpers ---
const getSessionUser = async () => {
    const session = await getServerSession(authOptions)
    return session?.user as any
}

const isAdmin = async () => {
    const user = await getSessionUser()
    if (!user) return false
    // Hardcoded admin check
    if (user.id === 'admin-id') return true

    // Since we put role in session, we can check directly or verify against DB
    if (user.role === 'admin') return true

    await dbConnect()
    // Safe check for ObjectId
    if (!user.id.match(/^[0-9a-fA-F]{24}$/)) return false

    const dbUser = await User.findById(user.id)
    return dbUser?.role === 'admin'
}

// ... Admin Actions ...

export async function fetchAdminData() {
    if (!await isAdmin()) throw new Error("Unauthorized")
    await dbConnect()

    // config
    let config = await ExamConfig.findOne({}).lean()
    if (!config) config = await ExamConfig.create({ timeLimit: 30, numQuestions: 10 })

    // sets — ensure Default Set always exists
    let sets = await QuestionSet.find({}).sort({ createdAt: 1 }).lean()
    if (sets.length === 0) {
        await QuestionSet.create({ name: 'Default Set' })
        sets = await QuestionSet.find({}).sort({ createdAt: 1 }).lean()
    }

    // questions — .lean() returns plain JS objects (no Mongoose overhead)
    const questions = await Question.find({}).sort({ createdAt: 1 }).lean()

    // users (excluding admin)
    const users = await User.find({ role: { $ne: 'admin' } }).sort({ createdAt: -1 }).lean()

    // ── FIX: Single batch query instead of N+1 per-user queries ──────────────
    // Collect all user IDs, then fetch all relevant attempts in ONE query.
    const userIds = users.map((u: any) => u._id.toString())
    const allAttempts = await ExamAttempt.find({ userId: { $in: userIds } })
        .sort({ startedAt: -1 })
        .lean()

    // Build a map: userId → most recent attempt
    const attemptMap = new Map<string, any>()
    for (const attempt of allAttempts) {
        const uid = attempt.userId.toString()
        // allAttempts is sorted by startedAt DESC, so first one per user = most recent
        if (!attemptMap.has(uid)) {
            attemptMap.set(uid, attempt)
        }
    }

    const usersWithAttempts = users.map((u: any) => {
        const attempt = attemptMap.get(u._id.toString())
        return {
            ...u,
            _id: u._id.toString(),
            exam_attempts: attempt ? [{
                score: attempt.score,
                totalQuestions: attempt.totalQuestions,
                status: attempt.status,
                completed_at: attempt.completedAt
            }] : []
        }
    })
    // ─────────────────────────────────────────────────────────────────────────

    // colleges
    const colleges = await College.find({}).lean()
    // departments
    const departments = await Department.find({}).populate('collegeId').lean()

    return {
        config: JSON.parse(JSON.stringify(config)),
        sets: JSON.parse(JSON.stringify(sets)),
        questions: JSON.parse(JSON.stringify(questions)),
        users: JSON.parse(JSON.stringify(usersWithAttempts)),
        colleges: JSON.parse(JSON.stringify(colleges)),
        departments: JSON.parse(JSON.stringify(departments))
    }
}

/**
 * Creates a new question set for exams.
 *
 * @param name - The desired set name; leading/trailing whitespace is trimmed and the resulting name must not be empty
 * @returns The created question set object (plain JSON with at least `id`/`_id` and `name`)
 * @throws Error if the caller is not an admin
 * @throws Error if the trimmed `name` is empty
 * @throws Error if a set with the trimmed name already exists
 */
export async function createSet(name: string) {
    if (!await isAdmin()) throw new Error('Unauthorized')
    await dbConnect()
    const trimmed = name.trim()
    if (!trimmed) throw new Error('Set name cannot be empty')
    // Check if already exists
    const existing = await QuestionSet.findOne({ name: trimmed })
    if (existing) throw new Error(`Set "${trimmed}" already exists`)
    const set = await QuestionSet.create({ name: trimmed })
    revalidatePath('/admin')
    await invalidateRedisTag('question')
    return JSON.parse(JSON.stringify(set))
}

/**
 * Deletes a question set and all questions that belong to it, then revalidates the admin path and invalidates question caches.
 *
 * @param id - The ID of the question set to delete
 * @returns An object with `success: true` when deletion completes
 * @throws Error - If the caller is not an admin ('Unauthorized')
 * @throws Error - If no set exists with the given ID ('Set not found')
 */
export async function deleteSet(id: string) {
    if (!await isAdmin()) throw new Error('Unauthorized')
    await dbConnect()
    const set = await QuestionSet.findById(id)
    if (!set) throw new Error('Set not found')
    // Delete all questions in this set
    await Question.deleteMany({ setName: set.name })
    await QuestionSet.findByIdAndDelete(id)
    revalidatePath('/admin')
    await invalidateRedisTag('question')
    return { success: true }
}

/**
 * Update the exam configuration's time limit and number of questions.
 *
 * @param timeLimit - Exam duration in minutes
 * @param numQuestions - Number of questions per exam
 * @throws Error when the current user is not an administrator
 * @returns An object with `success: true` on successful update
 */
export async function updateConfig(timeLimit: number, numQuestions: number) {
    if (!await isAdmin()) throw new Error("Unauthorized")
    await dbConnect()
    await ExamConfig.findOneAndUpdate({}, { timeLimit, numQuestions, updatedAt: new Date() }, { upsert: true })
    revalidatePath('/admin')
    await invalidateRedisTag('config')
    return { success: true }
}

/**
 * Creates a new question in the specified set and section.
 *
 * @param text - The question text; must be non-empty.
 * @param options - Array of answer option strings; must contain at least four items.
 * @param correctOption - Index of the correct option within `options`.
 * @param setName - Target question set name; defaults to "Default Set" when empty.
 * @param sectionName - Section name within the set; defaults to "General" when empty.
 * @returns An object with `success: true` when the question is created.
 * @throws Error - If the caller is not an admin.
 * @throws Error - If `text` is empty or `options` has fewer than four items.
 */
export async function addQuestion(text: string, options: string[], correctOption: number, setName: string, sectionName: string) {
    if (!await isAdmin()) throw new Error("Unauthorized")
    await dbConnect()

    const cleanSetName = (setName || '').trim() || 'Default Set'
    const cleanSectionName = (sectionName || '').trim() || 'General'

    console.log('[addQuestion] setName:', cleanSetName, '| sectionName:', cleanSectionName)

    if (!text || options.length < 4) throw new Error('Invalid question data')

    const q = await Question.create({
        questionText: text.trim(),
        options: options.map(o => o.trim()),
        correctOption: Number(correctOption),
        setName: cleanSetName,
        sectionName: cleanSectionName
    })
    console.log('[addQuestion] saved _id:', q._id, 'setName:', q.setName, 'sectionName:', q.sectionName)
    revalidatePath('/admin')
    await invalidateRedisTag('question')
    return { success: true }
}

/**
 * Update an existing question's text, options, correct answer, and set/section.
 *
 * Connects to the database, replaces the stored fields for the question with the
 * provided values (trimming strings and normalizing empty set/section names to
 * defaults), triggers admin page revalidation and question cache invalidation,
 * and returns a success marker.
 *
 * @param id - The question's document ID
 * @param text - The question text; leading/trailing whitespace will be trimmed
 * @param options - Array of answer option strings; each option will be trimmed
 * @param correctOption - The index of the correct option within `options`
 * @param setName - The target question set name; empty or missing values become "Default Set"
 * @param sectionName - The question's section name; empty or missing values become "General"
 * @returns An object with `success: true` when the update completes
 * @throws Error - Thrown with message "Unauthorized" if the current user is not an admin
 */
export async function updateQuestion(id: string, text: string, options: string[], correctOption: number, setName: string, sectionName: string) {
    if (!await isAdmin()) throw new Error("Unauthorized")
    await dbConnect()

    const cleanSetName = (setName || '').trim() || 'Default Set'
    const cleanSectionName = (sectionName || '').trim() || 'General'

    console.log('[updateQuestion] id:', id, '| setName:', cleanSetName, '| sectionName:', cleanSectionName)

    await Question.findByIdAndUpdate(id, {
        questionText: text.trim(),
        options: options.map(o => o.trim()),
        correctOption: Number(correctOption),
        setName: cleanSetName,
        sectionName: cleanSectionName
    }, { new: true })
    revalidatePath('/admin')
    await invalidateRedisTag('question')
    return { success: true }
}

/**
 * Deletes a question by its ID and refreshes related caches and the admin page.
 *
 * @param id - ID of the question to delete
 * @returns An object with `success: true` when deletion completes
 * @throws Error "Unauthorized" if the caller is not an admin
 */
export async function deleteQuestion(id: string) {
    if (!await isAdmin()) throw new Error("Unauthorized")
    await dbConnect()
    await Question.findByIdAndDelete(id)
    revalidatePath('/admin')
    await invalidateRedisTag('question')
    return { success: true }
}

export async function addCollege(name: string) {
    if (!await isAdmin()) throw new Error("Unauthorized")
    await dbConnect()
    await College.create({ name })
    revalidatePath('/admin')
    return { success: true }
}

export async function deleteCollege(id: string) {
    if (!await isAdmin()) throw new Error("Unauthorized")
    await dbConnect()
    await College.findByIdAndDelete(id)
    revalidatePath('/admin')
    return { success: true }
}

export async function addDepartment(name: string, collegeId: string) {
    if (!await isAdmin()) throw new Error("Unauthorized")
    await dbConnect()
    await Department.create({ name, collegeId })
    revalidatePath('/admin')
    return { success: true }
}

export async function deleteDepartment(id: string) {
    if (!await isAdmin()) throw new Error("Unauthorized")
    await dbConnect()
    await Department.findByIdAndDelete(id)
    revalidatePath('/admin')
    return { success: true }
}

export async function deleteUser(id: string) {
    if (!await isAdmin()) throw new Error("Unauthorized")
    await dbConnect()
    await User.findByIdAndDelete(id)
    await ExamAttempt.deleteMany({ userId: id })
    revalidatePath('/admin')
    return { success: true }
}

export async function resetExam(userId: string) {
    if (!await isAdmin()) throw new Error("Unauthorized")
    await dbConnect()

    const attempt = await ExamAttempt.findOne({ userId }).sort({ startedAt: -1 })
    if (!attempt) return { success: false, message: "No exam attempt found" }

    // Remember old set to prevent assigning it again if possible
    const oldSet = attempt.assignedSet

    // We physically delete the old attempt so that the frontend gets a brand new attempt._id.
    // This completely bypasses the stale 'localStorage' state from the previous attempt.
    await ExamAttempt.findByIdAndDelete(attempt._id)

    // Assign a guaranteed DIFFERENT set if more than 1 set exists
    const validSets = await getCachedValidSets()
    let assignedSet = 'Default Set'
    if (validSets.length > 1) {
        const otherSets = validSets.filter(s => s !== oldSet)
        assignedSet = otherSets[Math.floor(Math.random() * otherSets.length)]
    } else if (validSets.length === 1) {
        assignedSet = validSets[0]
    }

    await ExamAttempt.create({
        userId,
        status: 'started',
        startedAt: new Date(),
        assignedSet
    })

    revalidatePath('/admin')
    return { success: true }
}

/**
 * Change the currently signed-in admin user's password.
 *
 * @param newPassword - The new password to set; must be at least 6 characters.
 * @returns An object with `success: true` when the update completes.
 * @throws Error("Unauthorized") if the current session user is not an admin.
 * @throws Error("Password must be at least 6 characters") if `newPassword` is missing or shorter than 6 characters.
 * @throws Error("Admin not found") if the session user cannot be found in the database or does not have the `admin` role.
 */
export async function changeAdminPassword(newPassword: string) {
    if (!await isAdmin()) throw new Error("Unauthorized")
    if (!newPassword || newPassword.length < 6) throw new Error("Password must be at least 6 characters")

    await dbConnect()
    const user = await getSessionUser()
    const adminUser = await User.findById(user.id)

    if (!adminUser || adminUser.role !== 'admin') throw new Error("Admin not found")

    adminUser.password = newPassword
    await adminUser.save()

    return { success: true }
}



// --- User Actions ---

export async function getProfile(id: string) {
    if (id === 'admin-id') {
        return {
            _id: 'admin-id',
            fullName: 'Administrator',
            email: 'admin@hackboats.com',
            role: 'admin'
        }
    }

    await dbConnect()
    if (!id.match(/^[0-9a-fA-F]{24}$/)) return null

    const user = await User.findById(id)
    return user ? JSON.parse(JSON.stringify(user)) : null
}


export async function upsertProfile(data: any) {
    const user = await getSessionUser()
    // data.id comes from client session, verify matches server session
    if (!user || user.id !== data.id) throw new Error("Unauthorized")

    await dbConnect()

    const update = {
        email: data.email,
        fullName: data.full_name, // Map correctly from form
        college: data.college,
        department: data.department,
        section: data.section,
        rollNo: data.roll_no, // Map correctly
        year: data.year,
        mobile: data.mobile,
        whatsapp: data.whatsapp,
        role: data.role
    }

    await User.findByIdAndUpdate(data.id, update, { new: true }) // Using findById since ID is Mongo ID now
    return { success: true }
}

export async function getColleges() {
    await dbConnect()
    const colleges = await College.find({})
    return JSON.parse(JSON.stringify(colleges))
}

export async function getDepartments() {
    await dbConnect()
    const departments = await Department.find({}).populate('collegeId')
    const flatDepts = departments.map((d: any) => ({
        id: d._id.toString(), // frontend expects id? or _id? Onboarding refactored to check both.
        name: d.name,
        college_id: d.collegeId?._id.toString(),
        colleges: { name: d.collegeId?.name }
    }))
    return JSON.parse(JSON.stringify(flatDepts))
}

// --- Exam Actions ---

export async function checkExamStatus(userId: string) {
    await dbConnect()
    const attempt = await ExamAttempt.findOne({ userId }).sort({ startedAt: -1 }).lean()
    if (attempt && (attempt.status === 'completed' || attempt.status === 'terminated')) {
        return 'completed'
    }
    return attempt ? attempt.status : null
}

export async function startExam(userId: string) {
    await dbConnect()

    // If student already has an attempt, return it — BUT verify the set still has questions
    const existing = await ExamAttempt.findOne({ userId }).sort({ startedAt: -1 })
    const validSets = await getCachedValidSets()

    if (existing && existing.status === 'started') {
        // Re-assign if: set was cleared by a reset OR set no longer has questions
        const needsReassign = !existing.assignedSet ||
            existing.assignedSet.trim() === '' ||
            !validSets.includes(existing.assignedSet)

        if (!needsReassign) {
            return JSON.parse(JSON.stringify(existing))
        }
        console.log(`[startExam] re-assigning: assignedSet="${existing.assignedSet}"`)
    } else if (existing) {
        // Completed or terminated — return as-is
        return JSON.parse(JSON.stringify(existing))
    }

    const assignedSet = validSets.length > 0
        ? validSets[Math.floor(Math.random() * validSets.length)]
        : 'Default Set'

    console.log('[startExam] randomly assigned set:', assignedSet, '| pool:', validSets)

    if (existing) {
        existing.assignedSet = assignedSet
        await existing.save()
        return JSON.parse(JSON.stringify(existing))
    }

    const newAttempt = await ExamAttempt.create({
        userId,
        status: 'started',
        startedAt: new Date(),
        assignedSet
    })
    return JSON.parse(JSON.stringify(newAttempt))
}




export const getExamConfig = async () => getFromRedisOrDb(
    'exam-config',
    async () => {
        await dbConnect()
        const config = await ExamConfig.findOne({}).lean()
        return config ? JSON.parse(JSON.stringify(config)) : { timeLimit: 30 }
    }
)

/**
 * Retrieves the questions (excluding correct answers) for the exam attempt's assigned set.
 *
 * @param attemptId - The ID of the exam attempt to load the assigned question set from
 * @returns An array of question objects for the attempt's assigned set (answers omitted); returns an empty array if the attempt is not found
 */
export async function fetchQuestions(attemptId: string) {
    await dbConnect()
    const attempt = await ExamAttempt.findById(attemptId).lean()
    if (!attempt) return []

    // Fetch questions securely from cache (omits answers)
    // The DB query already sorts by sectionName (alphabetically) and createdAt (insertion order)
    return await getCachedQuestionsForSet(attempt.assignedSet)
}

export async function submitExam(attemptId: string, answers: Record<string, number>, status: string) {
    await dbConnect()
    const attempt = await ExamAttempt.findById(attemptId)
    if (!attempt) throw new Error("Attempt not found")

    // Calculate score by retrieving correct answers from cache rather than DB queries per user
    let score = 0
    const questions = await getCachedQuestionsWithAnswersForSet(attempt.assignedSet)
    const questionMap = new Map<string, { correctOption: number, [key: string]: any }>(
        questions.map((q: any) => [q._id.toString(), q])
    )

    // Evaluate answers
    for (const [qId, selectedOpt] of Object.entries(answers)) {
        const q = questionMap.get(qId)
        if (q && q.correctOption === selectedOpt) {
            score++
        }
    }

    const totalQuestions = questions.length

    await ExamAttempt.findByIdAndUpdate(attemptId, {
        score,
        status,
        totalQuestions,
        completedAt: new Date()
    })

    return { success: true }
}

export async function getResult(userId: string) {
    await dbConnect()
    const attempt = await ExamAttempt.findOne({ userId }).sort({ startedAt: -1 }).lean()
    return attempt ? JSON.parse(JSON.stringify(attempt)) : null
}


// End of actions
