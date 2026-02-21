'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Timer, ChevronLeft, ChevronRight, Bookmark, Send, Menu, X, AlertTriangle, Loader2, CheckCircle2, BookmarkCheck, Circle } from 'lucide-react'
import { toast } from 'sonner'
import { startExam, fetchQuestions, getExamConfig, submitExam as submitExamAction } from '@/app/actions'
import { AnimatePresence, motion } from 'framer-motion'
import { useSession } from 'next-auth/react'

// ── Types ────────────────────────────────────────────────────────────────────
type Question = {
    id: string
    question_text: string
    options: string[]
    section_name?: string
}

// ── Status helpers ───────────────────────────────────────────────────────────
type QStatus = 'unanswered' | 'answered' | 'review'

// ═══════════════════════════════════════════════════════════════════════════
export default function QuizPage() {
    const [loading, setLoading] = useState(true)
    const [questions, setQuestions] = useState<Question[]>([])
    const [currentIdx, setCurrentIdx] = useState(0)
    const [answers, setAnswers] = useState<Record<string, number>>({})
    const [reviewMarked, setReviewMarked] = useState<Set<string>>(new Set())
    const [timeLeft, setTimeLeft] = useState(30 * 60)
    const [attemptId, setAttemptId] = useState<string | null>(null)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [sidebarOpen, setSidebarOpen] = useState(false)   // mobile drawer
    const [showPalette, setShowPalette] = useState(false)   // mobile floating palette

    const router = useRouter()
    const { data: session, status } = useSession()
    const timerRef = useRef<NodeJS.Timeout>(null)

    // ── Submit ───────────────────────────────────────────────────────────────
    const submitExam = useCallback(async (reason?: string) => {
        if (isSubmitting || !attemptId) return
        setIsSubmitting(true)
        setShowConfirm(false)
        try {
            await submitExamAction(attemptId, answers, reason ? 'terminated' : 'completed')
            localStorage.removeItem(`exam_state_${attemptId}`) // Clear saved state on submit
            if (reason) toast.error(`Exam auto-submitted: ${reason}`)
            else toast.success('Exam submitted successfully!')
            router.push('/result')
        } catch (error: any) {
            toast.error('Error submitting exam: ' + error.message)
            setIsSubmitting(false)
        }
    }, [answers, attemptId, isSubmitting, router])

    // ── Timer ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!loading && timeLeft > 0 && !isSubmitting) {
            timerRef.current = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) { clearInterval(timerRef.current!); submitExam('Time limit exceeded'); return 0 }
                    return prev - 1
                })
            }, 1000)
        }
        return () => { if (timerRef.current) clearInterval(timerRef.current) }
    }, [loading, timeLeft, isSubmitting, submitExam])

    // ── Fullscreen + Tab detection ───────────────────────────────────────────
    useEffect(() => {
        const onVisibility = () => { if (document.hidden && !isSubmitting) submitExam('Tab switching detected') }
        const onFullscreen = () => { if (!document.fullscreenElement && !isSubmitting) submitExam('Exited fullscreen mode') }
        document.addEventListener('visibilitychange', onVisibility)
        document.addEventListener('fullscreenchange', onFullscreen)
        document.addEventListener('webkitfullscreenchange', onFullscreen)
        return () => {
            document.removeEventListener('visibilitychange', onVisibility)
            document.removeEventListener('fullscreenchange', onFullscreen)
            document.removeEventListener('webkitfullscreenchange', onFullscreen)
        }
    }, [isSubmitting, submitExam])

    // ── Init ─────────────────────────────────────────────────────────────────
    // ── Init ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            if (status === 'authenticated' && session?.user) {
                try {
                    const userId = (session.user as any).id
                    const attempt = await startExam(userId)
                    if (attempt.status === 'completed' || attempt.status === 'terminated') { router.push('/result'); return }
                    setAttemptId(attempt._id)

                    // Recover local progress
                    const savedStateStr = localStorage.getItem(`exam_state_${attempt._id}`)

                    if (savedStateStr) {
                        try {
                            const saved = JSON.parse(savedStateStr)
                            if (saved.answers) setAnswers(saved.answers)
                            if (saved.reviewMarked) setReviewMarked(new Set(saved.reviewMarked))
                            if (saved.currentIdx !== undefined) setCurrentIdx(saved.currentIdx)
                        } catch (e) { }
                    }

                    const config = await getExamConfig()
                    if (config?.timeLimit) {
                        // Secure time calculation based strictly on server's startedAt
                        const startedAt = new Date(attempt.startedAt).getTime()
                        const now = Date.now()
                        const limitMs = config.timeLimit * 60 * 1000
                        const elapsedMs = now - startedAt
                        const remaining = Math.max(0, Math.floor((limitMs - elapsedMs) / 1000))
                        setTimeLeft(remaining)
                    }

                    const qData = await fetchQuestions(attempt._id)
                    if (qData?.length > 0) {
                        setQuestions(qData.map((q: any) => ({ id: q._id, question_text: q.questionText, options: q.options, section_name: q.sectionName })))
                        if (!document.fullscreenElement) {
                            try { await document.documentElement.requestFullscreen() } catch { }
                        }
                    }
                    setLoading(false)
                } catch (err: any) {
                    toast.error('Failed to initialize exam')
                    console.error(err)
                }
            } else if (status === 'unauthenticated') {
                router.push('/')
            }
        }
        init()
    }, [status, session, router])

    // ── Save State ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (attemptId && !loading) {
            localStorage.setItem(`exam_state_${attemptId}`, JSON.stringify({
                answers,
                reviewMarked: Array.from(reviewMarked),
                currentIdx,
                timeLeft
            }))
        }
    }, [answers, reviewMarked, currentIdx, timeLeft, attemptId, loading])

    // ── Keyboard navigation ──────────────────────────────────────────────────
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' && currentIdx < questions.length - 1) setCurrentIdx(i => i + 1)
            if (e.key === 'ArrowLeft' && currentIdx > 0) setCurrentIdx(i => i - 1)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [currentIdx, questions.length])

    // ── Helpers ──────────────────────────────────────────────────────────────
    const formatTime = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

    const getStatus = (q: Question): QStatus => {
        if (reviewMarked.has(q.id)) return 'review'
        if (answers[q.id] !== undefined) return 'answered'
        return 'unanswered'
    }

    const toggleReview = () => {
        const qId = questions[currentIdx]?.id
        if (!qId) return
        setReviewMarked(prev => {
            const next = new Set(prev)
            next.has(qId) ? next.delete(qId) : next.add(qId)
            return next
        })
    }

    const handleAnswer = (idx: number) => {
        const qId = questions[currentIdx]?.id
        if (!qId) return
        setAnswers(prev => ({ ...prev, [qId]: idx }))
    }

    // grouped sections for sidebar
    const sections = Array.from(new Set(questions.map(q => q.section_name || 'General')))

    const answeredCount = Object.keys(answers).length
    const reviewCount = reviewMarked.size
    const unansweredCount = questions.length - answeredCount
    const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0

    // ── Loading ───────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 gap-3">
            <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
            <p className="text-slate-600 font-medium">Preparing your exam…</p>
        </div>
    )

    if (questions.length === 0) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="text-center p-10 bg-white rounded-2xl shadow-lg max-w-sm">
                <AlertTriangle className="w-14 h-14 text-amber-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-800">No Questions Available</h2>
                <p className="text-slate-500 mt-2 text-sm">Please contact the administrator.</p>
                <button onClick={() => router.push('/')} className="mt-6 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors">Go Home</button>
            </div>
        </div>
    )

    const currentQ = questions[currentIdx]

    // ── Question Palette ─────────────────────────────────────────────────────
    const Palette = () => (
        <div className="space-y-5">
            {/* Legend */}
            <div className="flex flex-wrap gap-3 text-xs font-medium">
                <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-md bg-emerald-500 block" /><span className="text-slate-500">Answered ({answeredCount})</span></div>
                <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-md bg-amber-400 block" /><span className="text-slate-500">Review ({reviewCount})</span></div>
                <div className="flex items-center gap-1.5"><span className="w-5 h-5 rounded-md bg-slate-200 block" /><span className="text-slate-500">Unanswered ({unansweredCount})</span></div>
            </div>

            {/* Sections + grid */}
            {sections.map(sec => {
                const sectionQs = questions.filter(q => (q.section_name || 'General') === sec)
                return (
                    <div key={sec}>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">{sec}</p>
                        <div className="grid grid-cols-5 gap-1.5">
                            {sectionQs.map(q => {
                                const qIdx = questions.indexOf(q)
                                const st = getStatus(q)
                                return (
                                    <button
                                        key={q.id}
                                        onClick={() => { setCurrentIdx(qIdx); setSidebarOpen(false); setShowPalette(false) }}
                                        className={`w-full aspect-square rounded-md text-xs font-bold transition-all ${qIdx === currentIdx ? 'ring-2 ring-blue-500 ring-offset-1' : ''} ${st === 'answered' ? 'bg-emerald-500 text-white' : st === 'review' ? 'bg-amber-400 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                                    >
                                        {qIdx + 1}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                )
            })}

            {/* Submit */}
            <button
                onClick={() => { setSidebarOpen(false); setShowConfirm(true) }}
                disabled={isSubmitting}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-colors disabled:opacity-60"
            >
                <Send className="w-4 h-4" /> Submit Exam
            </button>
        </div>
    )

    // ── Main render ───────────────────────────────────────────────────────────
    return (
        <div className="h-screen w-screen bg-slate-100 flex flex-col overflow-hidden select-none" style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ── TOP HEADER ─────────────────────────────────────────────── */}
            <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 z-30 shadow-sm">
                {/* Left: hamburger (mobile) + title */}
                <div className="flex items-center gap-3">
                    <button className="md:hidden p-1.5 rounded-lg hover:bg-slate-100" onClick={() => setSidebarOpen(true)}>
                        <Menu className="w-5 h-5 text-slate-600" />
                    </button>
                    <div>
                        <p className="font-bold text-slate-800 text-sm leading-none">Online Assessment</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 hidden sm:block">{currentQ.section_name || 'General'}</p>
                    </div>
                </div>

                {/* Center: progress bar (desktop) */}
                <div className="hidden md:flex flex-col items-center gap-1 flex-1 mx-8">
                    <div className="w-full max-w-xs h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>
                    <p className="text-[10px] text-slate-400">{answeredCount} of {questions.length} answered</p>
                </div>

                {/* Right: timer + submit */}
                <div className="flex items-center gap-3">
                    <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-bold text-sm ${timeLeft < 300 ? 'bg-red-50 text-red-600 animate-pulse' : timeLeft < 600 ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-700'}`}>
                        <Timer className="w-4 h-4" />
                        {formatTime(timeLeft)}
                    </div>
                    <button
                        onClick={() => setShowConfirm(true)}
                        className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors"
                    >
                        <Send className="w-3.5 h-3.5" /> Submit
                    </button>
                </div>
            </header>

            {/* ── BODY ───────────────────────────────────────────────────── */}
            <div className="flex flex-1 overflow-hidden">

                {/* ── DESKTOP SIDEBAR ──────────────────────────────────── */}
                <aside className="hidden md:flex w-64 lg:w-72 bg-white border-r border-slate-200 flex-col overflow-y-auto shrink-0">
                    <div className="p-4 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Question Navigator</p>
                    </div>
                    <div className="p-4 overflow-y-auto flex-1">
                        <Palette />
                    </div>
                </aside>

                {/* ── MOBILE DRAWER (overlay) ────────────────────────── */}
                <AnimatePresence>
                    {sidebarOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                className="fixed inset-0 bg-black/40 z-40 md:hidden"
                                onClick={() => setSidebarOpen(false)}
                            />
                            <motion.aside
                                initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
                                transition={{ type: 'tween', duration: 0.25 }}
                                className="fixed top-0 left-0 h-full w-72 bg-white z-50 flex flex-col shadow-2xl md:hidden"
                            >
                                <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Question Navigator</p>
                                    <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-lg hover:bg-slate-100">
                                        <X className="w-5 h-5 text-slate-500" />
                                    </button>
                                </div>
                                <div className="p-4 overflow-y-auto flex-1">
                                    <Palette />
                                </div>
                            </motion.aside>
                        </>
                    )}
                </AnimatePresence>

                {/* ── MAIN QUESTION AREA ───────────────────────────────── */}
                <main className="flex-1 flex flex-col overflow-hidden">

                    {/* Mobile progress bar */}
                    <div className="md:hidden h-1 bg-slate-200">
                        <div className="h-full bg-emerald-500 transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>

                    {/* Question scroll area */}
                    <div className="flex-1 overflow-y-auto">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentQ.id}
                                initial={{ opacity: 0, y: 12 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -12 }}
                                transition={{ duration: 0.2 }}
                                className="max-w-3xl mx-auto p-4 md:p-8 pb-32 md:pb-8"
                            >
                                {/* Section badge + Q number */}
                                <div className="flex items-center gap-2 mb-4">
                                    {currentQ.section_name && (
                                        <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-bold uppercase tracking-wider">
                                            {currentQ.section_name}
                                        </span>
                                    )}
                                    <span className="text-xs text-slate-400 font-medium">Question {currentIdx + 1} of {questions.length}</span>
                                    {reviewMarked.has(currentQ.id) && (
                                        <span className="px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full text-[10px] font-bold">MARKED FOR REVIEW</span>
                                    )}
                                </div>

                                {/* Question text */}
                                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 mb-5">
                                    <p className="text-base md:text-lg font-semibold text-slate-800 leading-relaxed whitespace-pre-wrap">
                                        {currentQ.question_text}
                                    </p>
                                </div>

                                {/* Options */}
                                <div className="space-y-3">
                                    {currentQ.options.map((opt, idx) => {
                                        const selected = answers[currentQ.id] === idx
                                        return (
                                            <button
                                                key={idx}
                                                onClick={() => handleAnswer(idx)}
                                                className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-center gap-4 group active:scale-[0.99] ${selected
                                                    ? 'border-blue-500 bg-blue-50 shadow-md'
                                                    : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50/40'}`}
                                            >
                                                <span className={`shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm font-bold transition-all ${selected ? 'border-blue-500 bg-blue-500 text-white' : 'border-slate-300 text-slate-500 group-hover:border-blue-400'}`}>
                                                    {String.fromCharCode(65 + idx)}
                                                </span>
                                                <span className={`text-sm md:text-base font-medium flex-1 ${selected ? 'text-blue-700' : 'text-slate-700'}`}>{opt}</span>
                                                {selected && <CheckCircle2 className="w-5 h-5 text-blue-500 shrink-0" />}
                                            </button>
                                        )
                                    })}
                                </div>

                                {/* Desktop navigation buttons */}
                                <div className="hidden md:flex items-center justify-between mt-8">
                                    <button
                                        disabled={currentIdx === 0}
                                        onClick={() => setCurrentIdx(i => i - 1)}
                                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 border-slate-200 text-slate-600 font-medium text-sm hover:border-slate-300 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                                    >
                                        <ChevronLeft className="w-4 h-4" /> Previous
                                    </button>

                                    <button
                                        onClick={toggleReview}
                                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl border-2 font-medium text-sm transition-all ${reviewMarked.has(currentQ.id) ? 'border-amber-400 bg-amber-50 text-amber-600' : 'border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50/50'}`}
                                    >
                                        {reviewMarked.has(currentQ.id) ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                                        {reviewMarked.has(currentQ.id) ? 'Marked' : 'Mark for Review'}
                                    </button>

                                    {currentIdx < questions.length - 1 ? (
                                        <button
                                            onClick={() => setCurrentIdx(i => i + 1)}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors"
                                        >
                                            Next <ChevronRight className="w-4 h-4" />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => setShowConfirm(true)}
                                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition-colors"
                                        >
                                            <Send className="w-4 h-4" /> Finish Exam
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* ── MOBILE STICKY BOTTOM NAV ─────────────────────── */}
                    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 z-30 safe-area-bottom">
                        {/* Mobile progress */}
                        <div className="px-4 pt-2 flex items-center justify-between text-xs text-slate-400">
                            <span>{answeredCount}/{questions.length} answered</span>
                            <span>{currentQ.section_name || 'General'}</span>
                        </div>
                        <div className="flex items-center gap-2 p-3">
                            <button
                                disabled={currentIdx === 0}
                                onClick={() => setCurrentIdx(i => i - 1)}
                                className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed active:bg-slate-50"
                            >
                                <ChevronLeft className="w-4 h-4" /> Prev
                            </button>

                            <button
                                onClick={toggleReview}
                                className={`p-3 rounded-xl border-2 transition-all ${reviewMarked.has(currentQ.id) ? 'border-amber-400 bg-amber-50 text-amber-600' : 'border-slate-200 text-slate-500'}`}
                            >
                                {reviewMarked.has(currentQ.id) ? <BookmarkCheck className="w-5 h-5" /> : <Bookmark className="w-5 h-5" />}
                            </button>

                            {/* Floating palette trigger */}
                            <button
                                onClick={() => setShowPalette(!showPalette)}
                                className="p-3 rounded-xl border-2 border-slate-200 text-slate-500 relative"
                            >
                                <Circle className="w-5 h-5" />
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-blue-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{currentIdx + 1}</span>
                            </button>

                            {currentIdx < questions.length - 1 ? (
                                <button
                                    onClick={() => setCurrentIdx(i => i + 1)}
                                    className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm active:bg-blue-700"
                                >
                                    Next <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowConfirm(true)}
                                    className="flex-1 flex items-center justify-center gap-1 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm active:bg-emerald-700"
                                >
                                    <Send className="w-4 h-4" /> Submit
                                </button>
                            )}
                        </div>
                    </div>

                    {/* ── MOBILE FLOATING PALETTE ──────────────────────── */}
                    <AnimatePresence>
                        {showPalette && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                    className="fixed inset-0 bg-black/30 z-40 md:hidden"
                                    onClick={() => setShowPalette(false)}
                                />
                                <motion.div
                                    initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
                                    transition={{ type: 'tween', duration: 0.25 }}
                                    className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl z-50 p-5 max-h-[70vh] overflow-y-auto md:hidden pb-8"
                                >
                                    <div className="w-10 h-1 bg-slate-300 rounded-full mx-auto mb-4" />
                                    <Palette />
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </main>
            </div>

            {/* ── CONFIRM SUBMIT DIALOG ──────────────────────────────────── */}
            <AnimatePresence>
                {showConfirm && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                                className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6"
                            >
                                <div className="text-center mb-5">
                                    <div className="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                        <Send className="w-6 h-6 text-blue-600" />
                                    </div>
                                    <h3 className="text-lg font-bold text-slate-800">Submit Exam?</h3>
                                    <p className="text-sm text-slate-500 mt-1">This action cannot be undone.</p>
                                </div>

                                {/* Summary */}
                                <div className="bg-slate-50 rounded-xl p-4 space-y-2 mb-5 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-slate-500">Total Questions</span>
                                        <span className="font-bold text-slate-700">{questions.length}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-emerald-600">Answered</span>
                                        <span className="font-bold text-emerald-600">{answeredCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-amber-500">Marked for Review</span>
                                        <span className="font-bold text-amber-500">{reviewCount}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">Unanswered</span>
                                        <span className="font-bold text-slate-400">{unansweredCount}</span>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        onClick={() => setShowConfirm(false)}
                                        className="flex-1 py-3 rounded-xl border-2 border-slate-200 text-slate-600 font-semibold text-sm hover:bg-slate-50 transition-colors"
                                    >
                                        Continue
                                    </button>
                                    <button
                                        onClick={() => submitExam()}
                                        disabled={isSubmitting}
                                        className="flex-1 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm transition-colors disabled:opacity-60"
                                    >
                                        {isSubmitting ? 'Submitting…' : 'Submit Now'}
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
