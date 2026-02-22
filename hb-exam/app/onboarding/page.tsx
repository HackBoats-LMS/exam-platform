'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'

import { ArrowRight, Loader2, ShieldCheck, Timer, AlertCircle, CheckCircle2, UserCircle2, GraduationCap, Phone, Hash, Mail, Sparkles } from 'lucide-react'
import { toast } from 'sonner'
import { upsertProfile, getColleges, getDepartments, checkExamStatus } from '@/app/actions'
import { useSession } from 'next-auth/react'

const schema = z.object({
    fullName: z.string().min(2, 'Name is required'),
    college: z.string().min(1, 'Please select your college'),
    department: z.string().min(1, 'Please select your department'),
    section: z.string().min(1, 'Please enter your section'),
    rollNo: z.string().min(1, 'Please enter your roll number'),
    year: z.string().min(1, 'Please select your year'),
    mobile: z.string().regex(/^\d{10}$/, 'Must be a valid 10-digit mobile number'),
    whatsapp: z.string().regex(/^\d{10}$/, 'Must be a valid 10-digit WhatsApp number'),
    email: z.string().email(),
})

type FormData = z.infer<typeof schema>

export default function OnboardingPage() {
    const [step, setStep] = useState(1) // 1: Form, 2: Instructions
    const [isLoading, setIsLoading] = useState(false)
    const [colleges, setColleges] = useState<{ _id: string, name: string }[]>([])
    const [departments, setDepartments] = useState<{ id: string, name: string, college_id: string }[]>([])
    const [sameAsMobile, setSameAsMobile] = useState(false)

    const router = useRouter()
    const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
        resolver: zodResolver(schema),
        defaultValues: { year: '', college: '', department: '' }
    })

    const { data: session, status } = useSession()
    const mobileValue = watch('mobile')

    useEffect(() => {
        if (sameAsMobile) setValue('whatsapp', mobileValue || '')
    }, [sameAsMobile, mobileValue, setValue])

    useEffect(() => {
        const checkUser = async () => {
            if (status === 'authenticated' && session?.user) {
                const userId = (session.user as any).id
                const attempt = await checkExamStatus(userId)
                if (attempt === 'completed' || attempt === 'terminated') {
                    router.push('/result')
                    return
                }
                setValue('email', session.user.email || '')
                try {
                    const [cData, dData] = await Promise.all([getColleges(), getDepartments()])
                    if (cData) setColleges(cData)
                    if (dData) setDepartments(dData)
                } catch (err) { console.error(err) }
            } else if (status === 'unauthenticated') {
                router.push('/')
            }
        }
        checkUser()
    }, [status, session, router, setValue])

    const selectedCollegeName = watch('college')
    const filteredDepartments = departments.filter(d => {
        const college = colleges.find(c => c.name === selectedCollegeName)
        if (!college) return true
        return d.college_id === (college as any)._id || d.college_id === (college as any).id
    })

    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    const onSubmit = async (data: FormData) => {
        setIsLoading(true)
        try {
            if (!session?.user) throw new Error('No user found')
            await upsertProfile({
                id: (session.user as any).id,
                full_name: data.fullName,
                email: data.email,
                college: data.college,
                department: data.department,
                section: data.section,
                roll_no: data.rollNo,
                year: data.year,
                mobile: data.mobile,
                whatsapp: data.whatsapp,
                role: (session.user as any).role || 'student'
            })
            setStep(2)
            window.scrollTo({ top: 0, behavior: 'smooth' })
        } catch (error: any) {
            toast.error(error.message)
        } finally {
            setIsLoading(false)
        }
    }

    const startExam = () => {
        const element = document.documentElement
        if (element.requestFullscreen) {
            element.requestFullscreen().then(() => router.push('/quiz')).catch(() => router.push('/quiz'))
        } else router.push('/quiz')
    }

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400&display=swap');

                html, body {
                    overflow-x: hidden;
                }
                
                .ob-page {
                    font-family: 'Inter', system-ui, sans-serif;
                    min-height: 100dvh;
                    background-color: #fbfbfd;
                    color: #1d1d1f;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    padding: clamp(3rem, 8vw, 6rem) 1.5rem;
                    position: relative;
                    overflow-x: hidden;
                }

                .ob-grain {
                    position: fixed; inset: 0; pointer-events: none; z-index: 0;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
                    background-size: 140px;
                    opacity: 0.04;
                    mix-blend-mode: multiply;
                }

                .ob-glow {
                    position: absolute; top: -20%; left: 50%; transform: translateX(-50%);
                    width: 140vw; height: 100vh;
                    background: radial-gradient(circle at 50% 0%, rgba(249,115,22,0.06) 0%, transparent 60%);
                    z-index: 0; pointer-events: none;
                }

                .ob-container {
                    position: relative; z-index: 1;
                    width: 100%;
                    max-width: 680px;
                    animation: ob-slide-fade 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }

                @keyframes ob-slide-fade {
                    from { opacity: 0; transform: translateY(30px); }
                    to { opacity: 1; transform: translateY(0); }
                }

                .ob-header { text-align: center; margin-bottom: 5rem; }
                .ob-header h1 { font-size: clamp(2.5rem, 7vw, 4rem); font-weight: 900; letter-spacing: -0.05em; color: #1d1d1f; line-height: 1.05; margin-bottom: 1.25rem; }
                .ob-header p { color: #86868b; font-size: 1.2rem; font-weight: 500; letter-spacing: -0.01em; }

                /* ── Floating Sections — No Card ── */
                .ob-section {
                    margin-bottom: 6rem;
                }

                .ob-section-head {
                    display: flex; align-items: center; justify-content: center; gap: 0.75rem;
                    margin-bottom: 3rem; position: relative;
                }
                .ob-section-head::after {
                    content: ''; position: absolute; bottom: -1rem; left: 50%; translate: -50% 0;
                    width: 40px; height: 3px; background: #f97316; border-radius: 99px;
                }
                .ob-section-head h3 { font-size: 0.8rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.2em; color: #f97316; }

                .ob-grid { 
                    display: grid; 
                    grid-template-columns: 1fr; 
                    gap: 1.75rem; 
                }
                
                @media (min-width: 850px) {
                    .ob-grid { 
                        grid-template-columns: repeat(2, minmax(0, 1fr)); 
                        gap: 2rem 3rem; 
                    }
                    .ob-grid-span-2 { grid-column: span 2; }
                }

                .ob-field { 
                    display: flex; 
                    flex-direction: column; 
                    gap: 0.5rem; 
                    min-width: 0; 
                }
                .ob-label { font-size: 0.85rem; font-weight: 700; color: #1d1d1f; opacity: 0.6; padding-left: 0.25rem; }

                .ob-input-wrapper { position: relative; width: 100%; min-width: 0; }
                .ob-input-icon { position: absolute; left: 1.25rem; top: 50%; transform: translateY(-50%); color: #86868b; opacity: 0.5; }

                .ob-input {
                    width: 100%;
                    height: 58px;
                    background-color: #fff;
                    border: 1px solid #d2d2d7;
                    border-radius: 16px;
                    font-size: 1.05rem;
                    color: #1d1d1f;
                    padding: 0 1.25rem 0 3.25rem;
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 2px 4px rgba(0,0,0,0.02);
                }
                .ob-input:focus {
                    border-color: #f97316;
                    box-shadow: 0 0 0 5px rgba(249,115,22,0.1);
                    outline: none;
                }
                .ob-input.no-icon { padding-left: 1.25rem; }
                .ob-input:read-only { background-color: #f5f5f7; cursor: not-allowed; border-color: #d2d2d7; color: #86868b; }

                .ob-select {
                    appearance: none;
                    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='%2386868b' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
                    background-repeat: no-repeat;
                    background-position: right 1.25rem center;
                    background-size: 1.1rem;
                    cursor: pointer;
                }

                .ob-error { font-size: 0.75rem; color: #ff3b30; font-weight: 600; margin-top: 0.4rem; padding-left: 0.5rem; }

                .ob-check-row {
                    display: flex; align-items: center; justify-content: flex-end;
                    gap: 0.6rem; margin-bottom: 0.25rem;
                }
                .ob-check-label { font-size: 0.7rem; font-weight: 700; color: #86868b; text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; }

                .ob-btn {
                    width: 100%; height: 68px;
                    background-color: #000;
                    color: #ffffff;
                    border-radius: 20px;
                    font-size: 1.15rem; font-weight: 700;
                    display: flex; align-items: center; justify-content: center; gap: 0.8rem;
                    border: none; cursor: pointer;
                    transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
                    margin-top: 2rem;
                    box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                }
                .ob-btn:hover { background-color: #1d1d1f; transform: scale(1.02); box-shadow: 0 15px 40px rgba(0,0,0,0.15); }
                .ob-btn:active { transform: scale(0.98); }
                .ob-btn:disabled { opacity: 0.4; cursor: not-allowed; transform: none; box-shadow: none; }

                /* ── Summary Step ── */
                .ob-brief { text-align: center; }
                .ob-brief-wrap {
                    background: transparent;
                    padding: 0;
                }
                .ob-brief-icon {
                    width: 72px; height: 72px;
                    background: #fff;
                    border: 1px solid #e2e8f0;
                    color: #f97316;
                    border-radius: 22px;
                    display: flex; align-items: center; justify-content: center;
                    margin: 0 auto 3rem;
                    box-shadow: 0 8px 16px rgba(0,0,0,0.04);
                }
                .ob-rule-card {
                    display: flex; align-items: center; gap: 2rem;
                    text-align: left; padding: 2.25rem;
                    border-radius: 24px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    margin-bottom: 1.5rem;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.02);
                }
                @media (max-width: 600px) {
                    .ob-rule-card { padding: 1.25rem; gap: 1rem; }
                }
                .ob-rule-card:hover { transform: translateX(8px); border-color: #f9731644; box-shadow: 0 12px 24px rgba(0,0,0,0.04); }
                
                .ob-rule-icon-box {
                    width: 56px; height: 56px; border-radius: 16px;
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                }
                
                .ob-rule-card h4 { font-size: 1.2rem; font-weight: 800; color: #1d1d1f; letter-spacing: -0.02em; margin-bottom: 0.35rem; }
                .ob-rule-card p { font-size: 1rem; color: #86868b; line-height: 1.5; font-weight: 400; }

                .ob-start-btn {
                    background-color: #f97316;
                    color: #fff; margin-top: 3.5rem;
                }
                .ob-start-btn:hover { background-color: #ea580c; box-shadow: 0 12px 30px rgba(234,88,12,0.3); }

                /* ── Badge ── */
                .ob-badge {
                    display: inline-flex; align-items: center; gap: 8px;
                    background: #fff; border: 1px solid #e2e8f0; border-radius: 99px;
                    padding: 6px 16px 6px 12px; font-size: 11px; font-weight: 700;
                    color: #86868b; text-transform: uppercase; letter-spacing: 0.1em;
                    margin-bottom: 2rem;
                }
                .ob-dot-pulse {
                    width: 7px; height: 7px; border-radius: 50%;
                    background: #f97316;
                    animation: ob-pulse 2s infinite;
                }
                @keyframes ob-pulse {
                    0% { box-shadow: 0 0 0 0 rgba(249,115,22,0.4); }
                    70% { box-shadow: 0 0 0 10px rgba(249,115,22,0); }
                    100% { box-shadow: 0 0 0 0 rgba(249,115,22,0); }
                }
            `}</style>

            <div className="ob-grain" />
            <div className="ob-glow" />

            <div className="ob-page">
                <div className="ob-container">

                    {step === 1 ? (
                        <>
                            <div className="ob-header">
                                <div className="ob-badge">
                                    <div className="ob-dot-pulse" />
                                    Step 1: Onboarding
                                </div>
                                <h1>Tell us who<br />you are<span style={{ color: '#f97316' }}>.</span></h1>
                                <p>We need your academic profile to verify your identity and generate your assessment scorecard.</p>
                            </div>

                            <form onSubmit={handleSubmit(onSubmit)}>
                                {/* Identity Section */}
                                <div className="ob-section">
                                    <div className="ob-section-head">
                                        <h3>The Basics</h3>
                                    </div>
                                    <div className="ob-grid">
                                        <div className="ob-field ob-grid-span-2">
                                            <label className="ob-label">Full Legal Name</label>
                                            <div className="ob-input-wrapper">
                                                <UserCircle2 className="ob-input-icon" size={20} />
                                                <Input {...register('fullName')} className="ob-input" placeholder="Rahul Sharma" autoComplete="off" />
                                            </div>
                                            {errors.fullName && <p className="ob-error">{errors.fullName.message}</p>}
                                        </div>
                                        <div className="ob-field">
                                            <label className="ob-label">Email</label>
                                            <div className="ob-input-wrapper">
                                                <Mail className="ob-input-icon" size={20} />
                                                <Input {...register('email')} className="ob-input" readOnly />
                                            </div>
                                        </div>
                                        <div className="ob-field">
                                            <label className="ob-label">Roll Number</label>
                                            <div className="ob-input-wrapper">
                                                <Hash className="ob-input-icon" size={20} />
                                                <Input {...register('rollNo')} className="ob-input" placeholder="20XX1A05XX" />
                                            </div>
                                            {errors.rollNo && <p className="ob-error">{errors.rollNo.message}</p>}
                                        </div>
                                        <div className="ob-field">
                                            <label className="ob-label">Active Mobile</label>
                                            <div className="ob-input-wrapper">
                                                <Phone className="ob-input-icon" size={20} />
                                                <Input {...register('mobile')} className="ob-input" placeholder="9876543210" maxLength={10} />
                                            </div>
                                            {errors.mobile && <p className="ob-error">{errors.mobile.message}</p>}
                                        </div>
                                        <div className="ob-field">
                                            <div className="ob-check-row">
                                                <Checkbox
                                                    id="sameAsMobile"
                                                    checked={sameAsMobile}
                                                    onCheckedChange={(val) => setSameAsMobile(!!val)}
                                                    className="w-3.5 h-3.5 border-slate-300"
                                                />
                                                <label htmlFor="sameAsMobile" className="ob-check-label">WhatsApp is same</label>
                                            </div>
                                            <div className="ob-input-wrapper">
                                                <Phone className="ob-input-icon" size={20} />
                                                <Input
                                                    {...register('whatsapp')}
                                                    className="ob-input"
                                                    placeholder="9876543210"
                                                    disabled={sameAsMobile}
                                                    maxLength={10}
                                                />
                                            </div>
                                            {errors.whatsapp && <p className="ob-error">{errors.whatsapp.message}</p>}
                                        </div>
                                    </div>
                                </div>

                                {/* Academic Record */}
                                <div className="ob-section">
                                    <div className="ob-section-head">
                                        <h3>Academic Record</h3>
                                    </div>
                                    <div className="ob-grid">
                                        <div className="ob-field ob-grid-span-2">
                                            <label className="ob-label">Your Institution</label>
                                            <div className="ob-input-wrapper">
                                                <GraduationCap className="ob-input-icon" size={20} />
                                                <select {...register('college')} className="ob-input ob-select">
                                                    <option value="">Select your college</option>
                                                    {colleges.map((c) => (
                                                        <option key={c._id} value={c.name}>{c.name}</option>
                                                    ))}
                                                    {colleges.length === 0 && <option value="Demo College">Demo College</option>}
                                                </select>
                                            </div>
                                            {errors.college && <p className="ob-error">{errors.college.message}</p>}
                                        </div>
                                        <div className="ob-field">
                                            <label className="ob-label">Branch / Department</label>
                                            <select {...register('department')} className="ob-input no-icon ob-select">
                                                <option value="">Select branch</option>
                                                {filteredDepartments.map((d) => (
                                                    <option key={d.id} value={d.name}>{d.name}</option>
                                                ))}
                                                {filteredDepartments.length === 0 && (
                                                    <>
                                                        <option value="CSE">CSE</option>
                                                        <option value="ECE">ECE</option>
                                                        <option value="EEE">EEE</option>
                                                    </>
                                                )}
                                            </select>
                                            {errors.department && <p className="ob-error">{errors.department.message}</p>}
                                        </div>
                                        <div className="ob-field">
                                            <label className="ob-label">Year of Study</label>
                                            <select {...register('year')} className="ob-input no-icon ob-select">
                                                <option value="">Select year</option>
                                                <option value="1st">1st Year</option>
                                                <option value="2nd">2nd Year</option>
                                                <option value="3rd">3rd Year</option>
                                                <option value="4th">4th Year</option>
                                            </select>
                                            {errors.year && <p className="ob-error">{errors.year.message}</p>}
                                        </div>
                                        <div className="ob-field ob-grid-span-2">
                                            <label className="ob-label">Section / Group</label>
                                            <Input {...register('section')} className="ob-input no-icon" placeholder="e.g. A, Shift-1, Alpha" />
                                            {errors.section && <p className="ob-error">{errors.section.message}</p>}
                                        </div>
                                    </div>
                                </div>

                                <button type="submit" className="ob-btn" disabled={isLoading}>
                                    {isLoading ? <Loader2 size={24} className="sp-spin" /> : <>Continue to Briefing <Sparkles size={18} /></>}
                                </button>
                                <p style={{ textAlign: 'center', marginTop: '2rem', fontSize: '0.85rem', color: '#86868b' }}>
                                    Your information is kept secure and used only for internal benchmarking.
                                </p>
                            </form>
                        </>
                    ) : (
                        <div className="ob-brief">
                            <div className="ob-brief-icon">
                                <ShieldCheck size={36} strokeWidth={2.5} />
                            </div>
                            <h2 style={{ fontSize: 'clamp(2.2rem, 7vw, 3.5rem)', fontWeight: 900, letterSpacing: '-0.05em', color: '#1d1d1f', marginBottom: '1rem', lineHeight: '1.1' }}>The Mission Briefing</h2>
                            <p style={{ color: '#86868b', fontSize: 'clamp(1rem, 3.5vw, 1.25rem)', fontWeight: 500, marginBottom: '4rem' }}>Read carefully. There is no going back once you start.</p>

                            <div className="ob-rule-card">
                                <div className="ob-rule-icon-box" style={{ background: '#f5f5f7', color: '#1d1d1f' }}>
                                    <CheckCircle2 size={28} strokeWidth={2.5} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4>Locked Environment</h4>
                                    <p>The assessment will launch in a native fullscreen vault. Attempting to minimize, exit, or switch focus will trigger an immediate auto-submission.</p>
                                </div>
                            </div>

                            <div className="ob-rule-card">
                                <div className="ob-rule-icon-box" style={{ background: '#fff1f1', color: '#ff3b30' }}>
                                    <AlertCircle size={28} strokeWidth={2.5} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4>Integrity Patrol</h4>
                                    <p>Any attempt to open developer tools, additional tabs, or background software is logged. Play fair to ensure your result is valid.</p>
                                </div>
                            </div>

                            <div className="ob-rule-card">
                                <div className="ob-rule-icon-box" style={{ background: '#fffbeb', color: '#f59e0b' }}>
                                    <Timer size={28} strokeWidth={2.5} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <h4>Critical Attempt</h4>
                                    <p>You have exactly one session. No retakes. No pauses. Ensure your battery and internet are stable before initiating.</p>
                                </div>
                            </div>

                            <button onClick={startExam} className="ob-btn ob-start-btn">
                                Initiate Assessment <ArrowRight size={24} />
                            </button>
                            <p style={{ marginTop: '3rem', fontSize: '0.9rem', color: '#86868b', fontWeight: 500 }}>
                                By initiating, you consent to our proctoring protocols.
                            </p>
                        </div>
                    )}

                </div>
            </div>

            <style>{`
                @keyframes sp-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
                .sp-spin { animation: sp-spin 0.8s linear infinite; }
            `}</style>
        </>
    )
}
