'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Users, HelpCircle, Settings, Search, Plus, Trash2,
    RotateCcw, School, Building2, ChevronRight, Loader2, LogOut,
    FileSpreadsheet, BookOpen, Layers, CheckCircle2,
    PencilLine, X, ChevronLeft, ChevronDown, Filter, Lock, Menu
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import { motion, AnimatePresence } from 'framer-motion'
import {
    fetchAdminData,
    updateConfig,
    addQuestion,
    deleteQuestion,
    addCollege,
    deleteCollege,
    addDepartment,
    deleteDepartment,
    deleteUser,
    resetExam,
    updateQuestion,
    createSet,
    deleteSet,
    changeAdminPassword
} from '../actions'
import { signOut } from 'next-auth/react'

// ─── Types ────────────────────────────────────────────────────────────────────
type QView = 'sets' | 'set' | 'section'

interface QForm {
    text: string
    opt1: string; opt2: string; opt3: string; opt4: string
    correct: number
}

const emptyForm = (): QForm => ({ text: '', opt1: '', opt2: '', opt3: '', opt4: '', correct: 0 })

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getSetsFromQuestions(questions: any[]): string[] {
    const sets = new Set<string>()
    questions.forEach(q => sets.add((q.setName || 'Default Set').trim()))
    return Array.from(sets).sort((a, b) => a === 'Default Set' ? -1 : b === 'Default Set' ? 1 : a.localeCompare(b))
}

function getSectionsForSet(questions: any[], setName: string): string[] {
    const sections = new Set<string>()
    questions
        .filter(q => (q.setName || 'Default Set').trim() === setName)
        .forEach(q => sections.add((q.sectionName || 'General').trim()))
    return Array.from(sections)
}

function getQuestionsForSection(questions: any[], setName: string, sectionName: string): any[] {
    return questions.filter(
        q => (q.setName || 'Default Set').trim() === setName &&
            (q.sectionName || 'General').trim() === sectionName
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
export default function AdminDashboard() {
    const [activeTab, setActiveTab] = useState<'users' | 'questions' | 'config' | 'master' | 'security'>('users')
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [loading, setLoading] = useState(true)
    const [data, setData] = useState<any>({ users: [], questions: [], sets: [], config: {}, colleges: [], departments: [] })
    const [searchTerm, setSearchTerm] = useState('')

    // ── Question Management State (clean, explicit) ──────────────────────────
    const [qView, setQView] = useState<QView>('sets')          // which screen
    const [currentSet, setCurrentSet] = useState('')           // e.g. "Biology"
    const [currentSection, setCurrentSection] = useState('')   // e.g. "Chapter 1"
    const [newSetInput, setNewSetInput] = useState('')         // input for creating new set
    const [newSectionInput, setNewSectionInput] = useState('') // input for new section
    const [qForm, setQForm] = useState<QForm>(emptyForm())
    const [editingId, setEditingId] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)

    // Refs mirror state — never stale inside async handlers
    const currentSetRef = useRef('')
    const currentSectionRef = useRef('')

    // Wrapped setters keep both state (for rendering) and refs (for handlers) in sync
    const setSet = (name: string) => { currentSetRef.current = name; setCurrentSet(name) }
    const setSection = (name: string) => { currentSectionRef.current = name; setCurrentSection(name) }

    // ── Other State ──────────────────────────────────────────────────────────
    const [newCollege, setNewCollege] = useState('')
    const [newDepartment, setNewDepartment] = useState({ name: '', collegeId: '' })
    const [newAdminPassword, setNewAdminPassword] = useState('') // New admin password
    const router = useRouter()

    // ── Export State ─────────────────────────────────────────────────────────
    const [exportCollege, setExportCollege] = useState('')   // '' = all colleges
    const [showExportMenu, setShowExportMenu] = useState(false)

    const tabs = [
        { id: 'users', label: 'Students', icon: Users },
        { id: 'questions', label: 'Questions', icon: HelpCircle },
        { id: 'config', label: 'Exam Config', icon: Settings },
        { id: 'master', label: 'Master Data', icon: School },
        { id: 'security', label: 'Security', icon: Lock },
    ]

    useEffect(() => { loadData() }, [])

    // Initial load — shows full-page spinner
    const loadData = async () => {
        setLoading(true)
        try {
            const adminData = await fetchAdminData()
            setData(adminData)
        } catch (error: any) {
            if (error.message?.includes('Unauthorized')) {
                toast.error('Session expired. Redirecting to login.')
                router.push('/admin-login')
            } else {
                toast.error('Failed to load data')
            }
        } finally {
            setLoading(false)
        }
    }

    // Background refresh — does NOT show full spinner or reset any navigation state
    const silentRefresh = async () => {
        try {
            const adminData = await fetchAdminData()
            setData(adminData)
        } catch (e: any) {
            // Surface the error so we know something is wrong
            console.error('[silentRefresh] failed:', e)
            toast.error('Data refresh failed: ' + (e?.message || 'Unknown error'))
        }
    }

    // ── Question Flow Handlers ───────────────────────────────────────────────

    /** Step 1 → Step 2: user selects or creates a set */
    const openSet = (setName: string) => {
        setSet(setName)             // updates both state AND ref
        setSection('')              // clear section
        setNewSectionInput('')
        setQForm(emptyForm())
        setEditingId(null)
        setQView('set')
    }

    const handleCreateSet = async () => {
        const name = newSetInput.trim()
        if (!name) { toast.error('Enter a set name'); return }
        try {
            await createSet(name)
            setNewSetInput('')
            openSet(name)              // navigate FIRST — before any refresh
            await silentRefresh()      // then refresh data silently in background
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    const handleDeleteSet = async (setId: string, setName: string) => {
        if (!confirm(`Delete "${setName}" and ALL its questions? This cannot be undone.`)) return
        try {
            await deleteSet(setId)
            toast.success(`"${setName}" deleted`)
            setQView('sets')
            setSet('')          // clear both ref and state
            setSection('')
            await silentRefresh()
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    /** Step 2 → Step 3: user enters / selects a section */
    const openSection = (sectionName: string) => {
        const name = sectionName.trim()
        if (!name) { toast.error('Enter a section name'); return }
        setSection(name)            // updates both state AND ref
        setQForm(emptyForm())
        setEditingId(null)
        setQView('section')
    }

    /** Save question (add or update) */
    const handleSaveQuestion = async () => {
        const { text, opt1, opt2, opt3, opt4, correct } = qForm

        // Read from refs — always current, never affected by stale closures
        const setName = currentSetRef.current.trim()
        const sectionName = currentSectionRef.current.trim()

        console.log('[Save] setName from REF:', setName, '| sectionName from REF:', sectionName)

        if (!setName) {
            toast.error('No set selected — go back and select a set')
            return
        }
        if (!sectionName) {
            toast.error('No section selected — go back and enter a section')
            return
        }
        if (!text.trim() || !opt1.trim() || !opt2.trim() || !opt3.trim() || !opt4.trim()) {
            toast.error('Fill in the question and all 4 options')
            return
        }


        setSaving(true)
        try {
            if (editingId) {
                await updateQuestion(editingId, text.trim(), [opt1.trim(), opt2.trim(), opt3.trim(), opt4.trim()], correct, setName, sectionName)
                toast.success('Question updated')
                setEditingId(null)
            } else {
                await addQuestion(text.trim(), [opt1.trim(), opt2.trim(), opt3.trim(), opt4.trim()], correct, setName, sectionName)
                toast.success(`✅ Saved to "${setName}" › ${sectionName}`)
            }
            setQForm(emptyForm())
            await silentRefresh()   // refresh data without disturbing currentSet/currentSection
        } catch (e: any) {
            toast.error(e.message)
        } finally {
            setSaving(false)
        }
    }

    /** Next Section: go back to set view, ready to add another section */
    const handleNextSection = () => {
        setSection('')              // clear section ref + state
        setNewSectionInput('')
        setQForm(emptyForm())
        setEditingId(null)
        setQView('set')
    }

    /** Edit a question from the preview */
    const handleEditQuestion = (q: any) => {
        setSet((q.setName || 'Default Set').trim())       // update ref + state
        setSection((q.sectionName || 'General').trim())   // update ref + state
        setQForm({
            text: q.questionText || '',
            opt1: q.options?.[0] || '',
            opt2: q.options?.[1] || '',
            opt3: q.options?.[2] || '',
            opt4: q.options?.[3] || '',
            correct: q.correctOption ?? 0,
        })
        setEditingId(q._id)
        setQView('section')
    }

    const handleDeleteQuestion = async (id: string) => {
        if (!confirm('Delete this question?')) return
        try {
            await deleteQuestion(id)
            toast.success('Question deleted')
            await silentRefresh()
        } catch (e: any) {
            toast.error(e.message)
        }
    }

    // ── Other Handlers ───────────────────────────────────────────────────────

    // ── Shared row builder ────────────────────────────────────────────────────
    const buildRow = (u: any) => ({
        'Full Name': u.fullName || '',
        'Email': u.email || '',
        'Roll No': u.rollNo || '',
        'College': u.college || '',
        'Department': u.department || '',
        'Section': u.section || '',
        'Year': u.year || '',
        'Mobile': u.mobile || '',
        'WhatsApp': u.whatsapp || '',
        'Exam Status': u.exam_attempts?.[0]?.status || 'Not Started',
        'Score': u.exam_attempts?.[0]?.score ?? 0,
        'Total Questions': u.exam_attempts?.[0]?.totalQuestions ?? 0,
        'Percentage': u.exam_attempts?.[0]?.totalQuestions
            ? `${Math.round((u.exam_attempts[0].score / u.exam_attempts[0].totalQuestions) * 100)}%`
            : '-',
        'Completed At': u.exam_attempts?.[0]?.completed_at
            ? new Date(u.exam_attempts[0].completed_at).toLocaleString('en-IN') : '-'
    })

    // ── Export: selected college (or all) → single sheet ─────────────────────
    const handleExport = (collegeName?: string) => {
        if (!data.users?.length) { toast.error('No student data to export'); return }
        setShowExportMenu(false)

        const target = collegeName || exportCollege   // '' means all
        const users = target
            ? data.users.filter((u: any) => (u.college || '').trim() === target.trim())
            : data.users

        if (!users.length) {
            toast.error(`No students found for "${target}"`)
            return
        }

        const exportData = users.map(buildRow)
        const ws = XLSX.utils.json_to_sheet(exportData)

        // Auto-fit column widths
        const colWidths = Object.keys(exportData[0] || {}).map(key => ({
            wch: Math.max(key.length, ...exportData.map((r: any) => String(r[key] || '').length)) + 2
        }))
        ws['!cols'] = colWidths

        const wb = XLSX.utils.book_new()
        const sheetName = target ? target.substring(0, 31) : 'All Students' // Excel sheet name max 31 chars
        XLSX.utils.book_append_sheet(wb, ws, sheetName)
        XLSX.writeFile(wb, target ? `${target}_Results.xlsx` : 'All_Students_Results.xlsx')
        toast.success(`Downloaded ${users.length} student${users.length !== 1 ? 's' : ''}${target ? ` from ${target}` : ''}`)
    }

    // ── Export: ALL colleges as separate sheets in one workbook ───────────────
    const handleExportAllColleges = () => {
        if (!data.users?.length) { toast.error('No student data to export'); return }
        setShowExportMenu(false)

        // Get unique colleges from actual user data
        const colleges = Array.from(
            new Set(data.users.map((u: any) => (u.college || 'Unknown').trim()))
        ).sort() as string[]

        if (!colleges.length) { toast.error('No colleges found'); return }

        const wb = XLSX.utils.book_new()
        let totalStudents = 0

        colleges.forEach((college: string) => {
            const users = data.users.filter((u: any) => (u.college || 'Unknown').trim() === college)
            if (!users.length) return
            totalStudents += users.length

            const exportData = users.map(buildRow)
            const ws = XLSX.utils.json_to_sheet(exportData)

            // Freeze top header row
            ws['!freeze'] = { xSplit: 0, ySplit: 1 }

            // Auto-fit column widths
            const colWidths = Object.keys(exportData[0] || {}).map(key => ({
                wch: Math.max(key.length, ...exportData.map((r: any) => String(r[key] || '').length)) + 2
            }))
            ws['!cols'] = colWidths

            XLSX.utils.book_append_sheet(wb, ws, college.substring(0, 31))
        })

        // Also add a summary sheet with all students
        const summaryData = data.users.map(buildRow)
        const summaryWs = XLSX.utils.json_to_sheet(summaryData)
        summaryWs['!cols'] = Object.keys(summaryData[0] || {}).map(key => ({
            wch: Math.max(key.length, ...summaryData.map((r: any) => String(r[key] || '').length)) + 2
        }))
        XLSX.utils.book_append_sheet(wb, summaryWs, 'All Students')

        const now = new Date().toISOString().slice(0, 10)
        XLSX.writeFile(wb, `Exam_Results_By_College_${now}.xlsx`)
        toast.success(`Downloaded ${totalStudents} students across ${colleges.length} colleges (${colleges.length + 1} sheets)`)
    }

    const handleDeleteUser = async (id: string) => {
        if (!confirm('Delete this user and their exam data?')) return
        try { await deleteUser(id); toast.success('User deleted'); loadData() }
        catch (e: any) { toast.error(e.message) }
    }

    const handleUpdateConfig = async () => {
        try {
            await updateConfig(Number(data.config.timeLimit), Number(data.config.numQuestions || 10))
            toast.success('Config saved')
        } catch (e: any) { toast.error(e.message) }
    }

    const handleAddCollege = async () => {
        if (!newCollege) return
        try { await addCollege(newCollege); toast.success('College added'); setNewCollege(''); loadData() }
        catch (e: any) { toast.error(e.message) }
    }

    const handleDeleteCollege = async (id: string) => {
        try { await deleteCollege(id); loadData() }
        catch (e: any) { toast.error(e.message) }
    }

    const handleAddDepartment = async () => {
        if (!newDepartment.name || !newDepartment.collegeId) return
        try {
            await addDepartment(newDepartment.name, newDepartment.collegeId)
            toast.success('Department added')
            setNewDepartment({ name: '', collegeId: '' })
            loadData()
        } catch (e: any) { toast.error(e.message) }
    }

    const handleDeleteDepartment = async (id: string) => {
        try { await deleteDepartment(id); loadData() }
        catch { toast.error('Failed to delete') }
    }

    const handleResetExam = async (userId: string) => {
        if (!confirm("Reset this student's exam?")) return
        try { await resetExam(userId); toast.success('Exam reset'); loadData() }
        catch (e: any) { toast.error(e.message) }
    }

    const handleLogout = async () => { await signOut({ callbackUrl: '/' }) }

    const handleChangeAdminPassword = async () => {
        if (!newAdminPassword || newAdminPassword.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }
        try {
            await changeAdminPassword(newAdminPassword)
            toast.success('Admin password updated successfully')
            setNewAdminPassword('')
        } catch (error: any) {
            toast.error(error.message || 'Failed to change password')
        }
    }

    // ── Derived Data ─────────────────────────────────────────────────────────
    const allSets = getSetsFromQuestions(data.questions || [])
    const allSections = currentSet ? getSectionsForSet(data.questions || [], currentSet) : []
    const sectionQuestions = (currentSet && currentSection)
        ? getQuestionsForSection(data.questions || [], currentSet, currentSection)
        : []

    // Unique colleges derived from actual user data (for filter dropdown)
    const uniqueColleges: string[] = Array.from(
        new Set((data.users || []).map((u: any) => (u.college || '').trim()).filter(Boolean))
    ).sort() as string[]

    const filteredUsers = (data.users || []).filter((u: any) => {
        const matchesSearch = !searchTerm || [u.fullName, u.email, u.rollNo, u.college, u.department]
            .some((f: any) => f?.toLowerCase().includes(searchTerm.toLowerCase()))
        const matchesCollege = !exportCollege || (u.college || '').trim() === exportCollege.trim()
        return matchesSearch && matchesCollege
    })

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-white flex font-sans text-slate-800 w-full max-w-[100vw] overflow-x-hidden">

            {/* ── Mobile Sidebar Overlay ──────────────────────────────────── */}
            <AnimatePresence>
                {mobileMenuOpen && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/20 z-40 md:hidden"
                            onClick={() => setMobileMenuOpen(false)}
                        />
                        <motion.div
                            initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
                            className="fixed inset-y-0 left-0 w-64 bg-slate-50 border-r border-gray-200 z-50 flex flex-col md:hidden"
                        >
                            <div className="p-6 h-16 border-b border-gray-200 flex items-center justify-between px-6">
                                <div className="flex items-center">
                                    <img src="https://www.hackboats.com/images/logo.png" className="h-6 w-auto mr-3 opacity-80" alt="" />
                                    <span className="font-semibold text-slate-700 tracking-tight">Console</span>
                                </div>
                                <button onClick={() => setMobileMenuOpen(false)}>
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                                {tabs.map(tab => (
                                    <button
                                        key={tab.id}
                                        onClick={() => { setActiveTab(tab.id as any); setMobileMenuOpen(false) }}
                                        className={`w-full flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                                            ? 'bg-white text-slate-900 shadow-sm border border-gray-200'
                                            : 'text-slate-500 hover:text-slate-900 hover:bg-gray-100'}`}
                                    >
                                        <tab.icon className={`w-4 h-4 mr-3 ${activeTab === tab.id ? 'text-slate-800' : 'text-slate-400'}`} />
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                            <div className="p-4 border-t border-gray-200">
                                <Button variant="ghost" className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 text-sm h-9 px-2" onClick={handleLogout}>
                                    <LogOut className="w-4 h-4 mr-3" /> Sign Out
                                </Button>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* ── Desktop Sidebar ─────────────────────────────────────────── */}
            <div className="w-64 bg-slate-50 border-r border-gray-200 hidden md:flex flex-col fixed h-full z-10">
                <div className="p-6 h-16 border-b border-gray-200 flex items-center px-6">
                    <img src="https://www.hackboats.com/images/logo.png" className="h-6 w-auto mr-3 opacity-80" alt="" />

                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`w-full flex items-center px-3 py-2.5 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id
                                ? 'bg-white text-slate-900 shadow-sm border border-gray-200'
                                : 'text-slate-500 hover:text-slate-900 hover:bg-gray-100'}`}
                        >
                            <tab.icon className={`w-4 h-4 mr-3 ${activeTab === tab.id ? 'text-slate-800' : 'text-slate-400'}`} />
                            {tab.label}
                        </button>
                    ))}
                </nav>
                <div className="p-4 border-t border-gray-200">
                    <Button variant="ghost" className="w-full justify-start text-slate-500 hover:text-red-600 hover:bg-red-50 text-sm h-9 px-2" onClick={handleLogout}>
                        <LogOut className="w-4 h-4 mr-3" /> Sign Out
                    </Button>
                </div>
            </div>

            {/* ── Main Content ─────────────────────────────────────────────── */}
            <main className="flex-1 md:ml-64 bg-white min-w-0 flex flex-col">
                {/* Top Bar */}
                <div className="h-16 border-b border-gray-100 flex items-center justify-between px-4 md:px-8 bg-white sticky top-0 z-20 shrink-0">
                    <div className="flex items-center gap-2 md:gap-3 truncate">
                        <button className="md:hidden p-2 -ml-2 text-slate-500 hover:text-slate-800 shrink-0" onClick={() => setMobileMenuOpen(true)}>
                            <Menu className="w-5 h-5" />
                        </button>
                        {activeTab === 'questions' && qView !== 'sets' && (
                            <button
                                onClick={() => {
                                    if (qView === 'section') { setQView('set'); setCurrentSection(''); setEditingId(null); setQForm(emptyForm()) }
                                    else { setQView('sets'); setCurrentSet('') }
                                }}
                                className="flex items-center gap-1.5 text-slate-400 hover:text-slate-700 text-sm font-medium transition-colors mr-1"
                            >
                                <ChevronLeft className="w-4 h-4" />
                                {qView === 'section' ? currentSet : 'Sets'}
                            </button>
                        )}
                        <h1 className="text-lg font-semibold text-slate-800">
                            {activeTab === 'questions'
                                ? qView === 'sets' ? 'Question Sets'
                                    : qView === 'set' ? currentSet
                                        : `${currentSet} › ${currentSection}`
                                : tabs.find(t => t.id === activeTab)?.label}
                        </h1>
                    </div>
                    {activeTab === 'users' && (
                        <div className="flex items-center gap-2">
                            {/* College filter pill */}
                            {exportCollege && (
                                <span className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-blue-700 border border-blue-200 rounded-full text-xs font-medium">
                                    <Filter className="w-3 h-3" />
                                    {exportCollege}
                                    <button onClick={() => setExportCollege('')} className="ml-0.5 text-blue-400 hover:text-blue-700">
                                        <X className="w-3 h-3" />
                                    </button>
                                </span>
                            )}

                            {/* Export dropdown button */}
                            <div className="relative">
                                <Button
                                    size="sm"
                                    onClick={() => setShowExportMenu(!showExportMenu)}
                                    className="bg-slate-800 hover:bg-slate-700 text-white h-8 text-xs font-medium shadow-sm flex items-center gap-1.5"
                                >
                                    <FileSpreadsheet className="w-3.5 h-3.5" />
                                    {exportCollege ? `Export ${exportCollege.split(' ')[0]}…` : 'Export Data'}
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </Button>

                                {showExportMenu && (
                                    <>
                                        {/* backdrop */}
                                        <div className="fixed inset-0 z-30" onClick={() => setShowExportMenu(false)} />

                                        {/* menu */}
                                        <div className="absolute right-0 top-9 z-40 w-64 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
                                            <div className="px-3 py-2.5 border-b border-gray-100">
                                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Export Options</p>
                                            </div>

                                            {/* All students */}
                                            <button
                                                onClick={() => { setExportCollege(''); handleExport('') }}
                                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-slate-50 flex items-center gap-2.5 transition-colors"
                                            >
                                                <span className="w-6 h-6 bg-slate-100 rounded-md flex items-center justify-center shrink-0">
                                                    <Users className="w-3.5 h-3.5 text-slate-600" />
                                                </span>
                                                <div>
                                                    <p className="font-medium text-slate-800">All Students</p>
                                                    <p className="text-[11px] text-slate-400">One sheet, everyone</p>
                                                </div>
                                            </button>

                                            {/* All colleges multi-sheet */}
                                            <button
                                                onClick={handleExportAllColleges}
                                                className="w-full text-left px-3 py-2.5 text-sm hover:bg-emerald-50 flex items-center gap-2.5 transition-colors border-b border-gray-100"
                                            >
                                                <span className="w-6 h-6 bg-emerald-100 rounded-md flex items-center justify-center shrink-0">
                                                    <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                                                </span>
                                                <div>
                                                    <p className="font-medium text-emerald-800">All Colleges (Multi-Sheet)</p>
                                                    <p className="text-[11px] text-emerald-600">One Excel sheet per college</p>
                                                </div>
                                            </button>

                                            {/* Per-college list */}
                                            {uniqueColleges.length > 0 && (
                                                <>
                                                    <div className="px-3 pt-2 pb-1">
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">By College</p>
                                                    </div>
                                                    <div className="max-h-48 overflow-y-auto">
                                                        {uniqueColleges.map((college: string) => {
                                                            const count = (data.users || []).filter((u: any) => (u.college || '').trim() === college).length
                                                            return (
                                                                <button
                                                                    key={college}
                                                                    onClick={() => { setExportCollege(college); handleExport(college) }}
                                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-blue-50 flex items-center justify-between gap-2 transition-colors"
                                                                >
                                                                    <span className="flex items-center gap-2 min-w-0">
                                                                        <School className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                                                        <span className="text-slate-700 truncate">{college}</span>
                                                                    </span>
                                                                    <span className="text-[11px] text-slate-400 shrink-0">{count} student{count !== 1 ? 's' : ''}</span>
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </>
                                            )}

                                            {uniqueColleges.length === 0 && (
                                                <div className="px-3 py-3 text-xs text-slate-400 text-center">No colleges found in user data</div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {loading ? (
                    <div className="flex items-center justify-center h-64">
                        <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                    </div>
                ) : (
                    <div className="p-4 md:p-8">

                        {/* ════════════════════════════════════════════════════
                            STUDENTS TAB
                        ════════════════════════════════════════════════════ */}
                        {activeTab === 'users' && (
                            <div className="space-y-4">
                                {/* Search + College Filter Row */}
                                <div className="flex flex-col sm:flex-row gap-2">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <Input placeholder="Search students..." className="pl-9 h-9 text-sm" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                                    </div>
                                    {/* College filter select */}
                                    <select
                                        value={exportCollege}
                                        onChange={e => setExportCollege(e.target.value)}
                                        className="h-9 rounded-md border border-gray-200 bg-white px-3 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 w-full sm:min-w-[160px] sm:max-w-[220px]"
                                    >
                                        <option value="">All Colleges ({(data.users || []).length})</option>
                                        {uniqueColleges.map((c: string) => {
                                            const cnt = (data.users || []).filter((u: any) => (u.college || '').trim() === c).length
                                            return (
                                                <option key={c} value={c}>{c} ({cnt})</option>
                                            )
                                        })}
                                    </select>
                                </div>

                                {/* Stats row: show filtered count */}
                                <div className="flex items-center justify-between text-xs text-slate-400">
                                    <span>
                                        Showing <span className="font-semibold text-slate-600">{filteredUsers.length}</span> of {(data.users || []).length} students
                                        {exportCollege && <span className="ml-1">— filtered by <span className="font-semibold text-blue-600">{exportCollege}</span></span>}
                                    </span>
                                    {exportCollege && (
                                        <button
                                            onClick={() => setExportCollege('')}
                                            className="text-slate-400 hover:text-slate-700 flex items-center gap-1"
                                        >
                                            <X className="w-3 h-3" /> Clear filter
                                        </button>
                                    )}
                                </div>
                                <div className="border border-gray-200 rounded-lg overflow-x-auto w-full">
                                    <table className="w-full text-sm min-w-[800px]">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-gray-200 text-xs text-slate-500 uppercase tracking-wide">
                                                <th className="px-6 py-3 text-left font-medium">Student</th>
                                                <th className="px-6 py-3 text-left font-medium">College / Dept</th>
                                                <th className="px-6 py-3 text-left font-medium">Roll No</th>
                                                <th className="px-6 py-3 text-left font-medium">Status</th>
                                                <th className="px-6 py-3 text-left font-medium">Score</th>
                                                <th className="px-6 py-3 text-right font-medium">Actions</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-100">
                                            {filteredUsers.map((user: any) => (
                                                <tr key={user._id} className="hover:bg-slate-50/50 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <div className="font-medium text-slate-900">{user.fullName}</div>
                                                        <div className="text-xs text-slate-500">{user.email}</div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="text-slate-700">{user.college}</div>
                                                        <div className="text-xs text-slate-500">{user.department} • {user.year}</div>
                                                    </td>
                                                    <td className="px-6 py-4 font-mono text-xs text-slate-600">{user.rollNo}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${user.exam_attempts?.[0]?.status === 'completed' ? 'bg-green-50 text-green-700 ring-1 ring-green-600/20' :
                                                            user.exam_attempts?.[0]?.status === 'terminated' ? 'bg-red-50 text-red-700 ring-1 ring-red-600/20' :
                                                                'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20'}`}>
                                                            {user.exam_attempts?.[0]?.status || 'Not Started'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 font-medium text-slate-900">
                                                        {user.exam_attempts?.[0]
                                                            ? `${user.exam_attempts[0].score} / ${user.exam_attempts[0].totalQuestions || 0}`
                                                            : '—'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex gap-1 justify-end">
                                                            <Button variant="ghost" size="sm" title="Reset Exam"
                                                                className="w-8 h-8 p-0 text-slate-400 hover:text-orange-600 hover:bg-orange-50"
                                                                onClick={() => handleResetExam(user._id)}>
                                                                <RotateCcw className="w-3.5 h-3.5" />
                                                            </Button>
                                                            <Button variant="ghost" size="sm" title="Delete User"
                                                                className="w-8 h-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                                onClick={() => handleDeleteUser(user._id)}>
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {filteredUsers.length === 0 && (
                                        <div className="p-12 text-center text-slate-400 text-sm">No students found.</div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ════════════════════════════════════════════════════
                            QUESTIONS TAB — STEP 1: SETS
                        ════════════════════════════════════════════════════ */}
                        {activeTab === 'questions' && qView === 'sets' && (
                            <div className="max-w-3xl space-y-6">
                                {/* Create new set */}
                                <div className="p-5 border border-dashed border-slate-300 rounded-xl bg-slate-50">
                                    <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Create New Set</p>
                                    <p className="text-xs text-slate-400 mb-3">A set is a group of questions assigned to an exam session. If only one set exists, it's the Default Set.</p>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="e.g. Biology, Physics, Set A..."
                                            value={newSetInput}
                                            onChange={e => setNewSetInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && handleCreateSet()}
                                            className="bg-white"
                                        />
                                        <Button onClick={handleCreateSet} className="bg-slate-800 hover:bg-slate-700 shrink-0">
                                            <Plus className="w-4 h-4 mr-1.5" /> Create Set
                                        </Button>
                                    </div>
                                </div>

                                {/* Sets from DB */}
                                {(data.sets || []).length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3">Your Sets</p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {(data.sets || []).map((set: any) => {
                                                const qCount = (data.questions || []).filter((q: any) => (q.setName || 'Default Set').trim() === set.name.trim()).length
                                                const sections = getSectionsForSet(data.questions || [], set.name.trim())
                                                const isDefault = (data.sets || []).length === 1 || set.name === 'Default Set'
                                                return (
                                                    <div key={set._id} className="group relative">
                                                        <button
                                                            onClick={() => openSet(set.name.trim())}
                                                            className="w-full text-left p-4 border border-gray-200 rounded-xl bg-white hover:border-slate-400 hover:shadow-sm transition-all"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <BookOpen className="w-4 h-4 text-slate-400" />
                                                                    <span className="font-semibold text-slate-800 text-sm">{set.name}</span>
                                                                    {isDefault && (
                                                                        <span className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-bold">DEFAULT</span>
                                                                    )}
                                                                </div>
                                                                <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 group-hover:translate-x-0.5 transition-all" />
                                                            </div>
                                                            <div className="mt-2 flex gap-3 text-xs text-slate-500">
                                                                <span>{qCount} question{qCount !== 1 ? 's' : ''}</span>
                                                                {sections.length > 0 && <span>• {sections.length} section{sections.length !== 1 ? 's' : ''}</span>}
                                                            </div>
                                                        </button>
                                                        {/* Delete set button */}
                                                        <button
                                                            onClick={() => handleDeleteSet(set._id, set.name)}
                                                            className="absolute top-3 right-8 transition-opacity p-1 rounded hover:bg-red-50 text-slate-300 hover:text-red-500"
                                                            title="Delete set"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {(data.sets || []).length === 0 && (
                                    <div className="text-center py-12 text-slate-400">
                                        <HelpCircle className="w-8 h-8 mx-auto mb-2 text-slate-200" />
                                        <p className="text-sm">No sets yet. Create your first set above.</p>
                                    </div>
                                )}
                            </div>
                        )}


                        {/* ════════════════════════════════════════════════════
                            QUESTIONS TAB — STEP 2: SET VIEW (sections)
                        ════════════════════════════════════════════════════ */}
                        {activeTab === 'questions' && qView === 'set' && (
                            <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-5 gap-8">

                                {/* Left: Add section & preview */}
                                <div className="lg:col-span-2 space-y-6">
                                    {/* New section form */}
                                    <div className="p-5 border border-dashed border-slate-300 rounded-xl bg-slate-50">
                                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1">Add a Section</p>
                                        <p className="text-xs text-slate-400 mb-3">Sections group questions (e.g. Maths, Physics, Chapter 1)</p>
                                        <Input
                                            placeholder="Section name..."
                                            value={newSectionInput}
                                            onChange={e => setNewSectionInput(e.target.value)}
                                            onKeyDown={e => e.key === 'Enter' && openSection(newSectionInput)}
                                            className="bg-white mb-3"
                                        />
                                        <Button
                                            onClick={() => openSection(newSectionInput)}
                                            className="w-full bg-slate-800 hover:bg-slate-700"
                                        >
                                            <Plus className="w-4 h-4 mr-1.5" /> Start Adding Questions
                                        </Button>
                                    </div>

                                    {/* Existing sections list */}
                                    {allSections.length > 0 && (
                                        <div>
                                            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-2">Sections in this Set</p>
                                            <div className="space-y-2">
                                                {allSections.map(sec => {
                                                    const cnt = getQuestionsForSection(data.questions || [], currentSet, sec).length
                                                    return (
                                                        <button
                                                            key={sec}
                                                            onClick={() => openSection(sec)}
                                                            className="w-full text-left px-4 py-3 border border-gray-200 rounded-lg bg-white hover:border-slate-400 hover:shadow-sm transition-all group flex items-center justify-between"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <Layers className="w-3.5 h-3.5 text-slate-400" />
                                                                <span className="font-medium text-sm text-slate-700">{sec}</span>
                                                            </div>
                                                            <span className="text-xs text-slate-400">{cnt} Q</span>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Right: Preview of all questions in this set */}
                                <div className="lg:col-span-3 space-y-6">
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">{currentSet}</h2>
                                        <p className="text-sm text-slate-500">
                                            {(data.questions || []).filter((q: any) => (q.setName || 'Default Set').trim() === currentSet).length} questions
                                            across {allSections.length} section{allSections.length !== 1 ? 's' : ''}
                                        </p>
                                    </div>

                                    {allSections.length === 0 ? (
                                        <div className="border border-dashed rounded-xl p-10 text-center text-slate-400">
                                            <Layers className="w-7 h-7 mx-auto mb-2 text-slate-200" />
                                            <p className="text-sm">No sections yet. Add your first section on the left.</p>
                                        </div>
                                    ) : (
                                        allSections.map(sec => (
                                            <div key={sec} className="space-y-3">
                                                {/* Section header */}
                                                <div className="flex items-center gap-3">
                                                    <div className="h-px flex-1 bg-slate-200" />
                                                    <span className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest whitespace-nowrap">
                                                        <Layers className="w-3 h-3 text-blue-400" />
                                                        {sec}
                                                    </span>
                                                    <div className="h-px flex-1 bg-slate-200" />
                                                </div>

                                                {/* Questions in this section */}
                                                {getQuestionsForSection(data.questions || [], currentSet, sec).map((q: any, qIdx: number) => (
                                                    <QuestionCard
                                                        key={q._id}
                                                        q={q}
                                                        qIdx={qIdx}
                                                        onEdit={() => handleEditQuestion(q)}
                                                        onDelete={() => handleDeleteQuestion(q._id)}
                                                    />
                                                ))}
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ════════════════════════════════════════════════════
                            QUESTIONS TAB — STEP 3: SECTION VIEW (add questions)
                        ════════════════════════════════════════════════════ */}
                        {activeTab === 'questions' && qView === 'section' && (
                            <div className="max-w-4xl grid grid-cols-1 lg:grid-cols-5 gap-8">

                                {/* Left: Question Form */}
                                <div className="lg:col-span-2">
                                    <div className="p-5 border border-gray-200 rounded-xl bg-white sticky top-24 space-y-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-1">
                                                <p className="text-sm font-semibold text-slate-800">
                                                    {editingId ? '✏️ Edit Question' : '+ New Question'}
                                                </p>
                                                <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-bold">
                                                    {currentSection}
                                                </span>
                                            </div>
                                            <p className="text-xs text-slate-400">Set: <span className="font-medium text-slate-600">{currentSet}</span></p>
                                        </div>

                                        <textarea
                                            placeholder="Question text...&#10;(Press Enter for new lines, e.g. Statements: / Conclusions:)"
                                            value={qForm.text}
                                            rows={4}
                                            onChange={e => setQForm({ ...qForm, text: e.target.value })}
                                            className="w-full text-sm border border-input bg-background rounded-md px-3 py-2 ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y min-h-[80px]"
                                        />

                                        <div className="space-y-2">
                                            {([1, 2, 3, 4] as const).map((i, idx) => (
                                                <label key={i} className={`flex items-center gap-2 p-2.5 rounded-lg border cursor-pointer transition-all ${qForm.correct === idx ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}>
                                                    <input
                                                        type="radio"
                                                        name="correct-opt"
                                                        checked={qForm.correct === idx}
                                                        onChange={() => setQForm({ ...qForm, correct: idx })}
                                                        className="accent-emerald-500"
                                                    />
                                                    <input
                                                        type="text"
                                                        placeholder={`Option ${i}${qForm.correct === idx ? ' ✓ (correct)' : ''}`}
                                                        value={(qForm as any)[`opt${i}`]}
                                                        onChange={e => setQForm({ ...qForm, [`opt${i}`]: e.target.value })}
                                                        className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400"
                                                    />
                                                </label>
                                            ))}
                                        </div>

                                        <div className="flex flex-col gap-2 pt-1">
                                            <Button
                                                onClick={handleSaveQuestion}
                                                disabled={saving}
                                                className="w-full bg-slate-800 hover:bg-slate-900"
                                            >
                                                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingId ? 'Update Question' : 'Save Question')}
                                            </Button>

                                            {editingId && (
                                                <Button
                                                    variant="ghost"
                                                    onClick={() => { setEditingId(null); setQForm(emptyForm()) }}
                                                    className="w-full text-xs h-8"
                                                >
                                                    <X className="w-3 h-3 mr-1" /> Cancel Edit
                                                </Button>
                                            )}

                                            <div className="border-t border-slate-100 pt-2">
                                                <Button
                                                    variant="outline"
                                                    onClick={handleNextSection}
                                                    className="w-full text-xs h-8 border-dashed"
                                                >
                                                    Next Section →
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Questions in this section */}
                                <div className="lg:col-span-3 space-y-4">
                                    <div>
                                        <h2 className="text-lg font-bold text-slate-900">{currentSection}</h2>
                                        <p className="text-sm text-slate-500">{sectionQuestions.length} question{sectionQuestions.length !== 1 ? 's' : ''} in this section</p>
                                    </div>

                                    {sectionQuestions.length === 0 ? (
                                        <div className="border border-dashed rounded-xl p-10 text-center text-slate-400">
                                            <HelpCircle className="w-7 h-7 mx-auto mb-2 text-slate-200" />
                                            <p className="text-sm">No questions yet. Add your first question on the left.</p>
                                        </div>
                                    ) : (
                                        sectionQuestions.map((q: any, qIdx: number) => (
                                            <QuestionCard
                                                key={q._id}
                                                q={q}
                                                qIdx={qIdx}
                                                highlight={q._id === editingId}
                                                onEdit={() => handleEditQuestion(q)}
                                                onDelete={() => handleDeleteQuestion(q._id)}
                                            />
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {/* ════════════════════════════════════════════════════
                            CONFIG TAB
                        ════════════════════════════════════════════════════ */}
                        {activeTab === 'config' && (
                            <div className="max-w-lg">
                                <div className="p-6 border border-gray-200 rounded-lg bg-white">
                                    <h3 className="text-base font-semibold text-slate-900 mb-6">Global Exam Settings</h3>
                                    <div className="space-y-6">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Duration (Minutes)</label>
                                            <Input
                                                type="number"
                                                className="max-w-[120px]"
                                                value={data.config?.timeLimit ?? 30}
                                                onChange={e => setData({ ...data, config: { ...(data.config || {}), timeLimit: Number(e.target.value) } })}
                                            />
                                        </div>
                                        <div className="pt-4 border-t border-gray-100">
                                            <Button onClick={handleUpdateConfig} className="bg-slate-800 hover:bg-slate-900">Save Configuration</Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ════════════════════════════════════════════════════
                            SECURITY TAB
                        ════════════════════════════════════════════════════ */}
                        {activeTab === 'security' && (
                            <div className="max-w-lg">
                                <div className="p-6 border border-gray-200 rounded-lg bg-white">
                                    <h3 className="text-base font-semibold text-slate-900 mb-6 flex items-center gap-2">Admin Credentials</h3>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-sm font-medium text-slate-700 mb-2">Change Admin Password</label>
                                            <Input
                                                type="password"
                                                placeholder="New password (min. 6 characters)"
                                                value={newAdminPassword}
                                                onChange={(e) => setNewAdminPassword(e.target.value)}
                                                className="max-w-[300px]"
                                            />
                                        </div>
                                        <div className="pt-2">
                                            <Button onClick={handleChangeAdminPassword} className="bg-slate-800 hover:bg-slate-900">
                                                Update Password
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* ════════════════════════════════════════════════════
                            MASTER DATA TAB
                        ════════════════════════════════════════════════════ */}
                        {activeTab === 'master' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-slate-900 flex items-center"><School className="w-4 h-4 mr-2" /> Colleges</h3>
                                    <div className="flex gap-2">
                                        <Input placeholder="Add College Name" value={newCollege} onChange={e => setNewCollege(e.target.value)} className="h-9 text-sm" />
                                        <Button onClick={handleAddCollege} size="sm" className="bg-slate-800 h-9">Add</Button>
                                    </div>
                                    <ul className="border border-gray-200 rounded-md divide-y divide-gray-100 bg-white max-h-[400px] overflow-y-auto">
                                        {data.colleges?.map((c: any) => (
                                            <li key={c._id} className="px-3 py-2.5 text-sm flex justify-between items-center group hover:bg-gray-50">
                                                <span className="text-slate-700">{c.name}</span>
                                                <Trash2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-red-500 cursor-pointer" onClick={() => handleDeleteCollege(c._id)} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="space-y-4">
                                    <h3 className="text-sm font-semibold text-slate-900 flex items-center"><Building2 className="w-4 h-4 mr-2" /> Departments</h3>
                                    <div className="space-y-2">
                                        <select
                                            className="w-full border border-gray-200 rounded-md p-2 text-sm bg-white focus:ring-2 focus:ring-slate-200 outline-none"
                                            value={newDepartment.collegeId}
                                            onChange={e => setNewDepartment({ ...newDepartment, collegeId: e.target.value })}
                                        >
                                            <option value="">Select College</option>
                                            {data.colleges?.map((c: any) => (
                                                <option key={c._id} value={c._id}>{c.name}</option>
                                            ))}
                                        </select>
                                        <div className="flex gap-2">
                                            <Input placeholder="Add Department" value={newDepartment.name} onChange={e => setNewDepartment({ ...newDepartment, name: e.target.value })} className="h-9 text-sm" />
                                            <Button onClick={handleAddDepartment} size="sm" className="bg-slate-800 h-9">Add</Button>
                                        </div>
                                    </div>
                                    <ul className="border border-gray-200 rounded-md divide-y divide-gray-100 bg-white max-h-[400px] overflow-y-auto">
                                        {data.departments?.map((d: any) => (
                                            <li key={d._id} className="px-3 py-2.5 text-sm flex justify-between items-center group hover:bg-gray-50">
                                                <div>
                                                    <span className="text-slate-700 block">{d.name}</span>
                                                    <span className="text-[10px] text-slate-400 uppercase tracking-wide">{d.collegeId?.name}</span>
                                                </div>
                                                <Trash2 className="w-3.5 h-3.5 text-slate-300 group-hover:text-red-500 cursor-pointer" onClick={() => handleDeleteDepartment(d._id)} />
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}

                    </div>
                )}
            </main>
        </div>
    )
}

// ─── QuestionCard Component ────────────────────────────────────────────────────
function QuestionCard({ q, qIdx, onEdit, onDelete, highlight = false }: {
    q: any
    qIdx: number
    onEdit: () => void
    onDelete: () => void
    highlight?: boolean
}) {
    return (
        <div className={`relative rounded-xl border bg-white transition-all group overflow-hidden ${highlight ? 'border-blue-400 shadow-md shadow-blue-50' : 'border-slate-200 hover:border-slate-300 hover:shadow-sm'}`}>
            {/* Colored left bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-1 ${highlight ? 'bg-blue-500' : 'bg-slate-100 group-hover:bg-slate-300'} transition-colors`} />

            <div className="pl-4 pr-4 py-4">
                {/* Question text */}
                <div className="flex items-start gap-2 mb-3">
                    <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-slate-100 text-[10px] font-black text-slate-400 flex items-center justify-center">
                        {qIdx + 1}
                    </span>
                    <p className="text-sm font-semibold text-slate-800 leading-snug flex-1 whitespace-pre-wrap">{q.questionText}</p>
                </div>

                {/* Options grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 ml-7">
                    {(q.options || []).map((opt: string, idx: number) => (
                        <div
                            key={idx}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs ${idx === q.correctOption
                                ? 'bg-emerald-50 border-emerald-200 text-emerald-800 font-medium'
                                : 'bg-slate-50 border-slate-100 text-slate-600'}`}
                        >
                            <span className={`w-4 h-4 rounded text-[9px] font-bold flex items-center justify-center shrink-0 ${idx === q.correctOption ? 'bg-emerald-500 text-white' : 'bg-white border border-slate-200 text-slate-400'}`}>
                                {String.fromCharCode(65 + idx)}
                            </span>
                            {opt}
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div className="flex gap-2 mt-3 ml-7 transition-opacity">
                    <Button variant="outline" size="sm" onClick={onEdit}
                        className="h-7 px-3 text-xs text-blue-600 border-blue-100 hover:bg-blue-50 bg-white">
                        <PencilLine className="w-3 h-3 mr-1" /> Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={onDelete}
                        className="h-7 px-3 text-xs text-rose-600 border-rose-100 hover:bg-rose-50 bg-white">
                        <Trash2 className="w-3 h-3 mr-1" /> Delete
                    </Button>
                </div>
            </div>
        </div>
    )
}
