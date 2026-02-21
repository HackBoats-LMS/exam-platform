'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Shield, Clock, LogOut, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import JSConfetti from 'js-confetti'
import { getResult, getProfile } from '@/app/actions'
import { useSession, signOut } from 'next-auth/react'

export default function ResultPage() {
    const [loading, setLoading] = useState(true)
    const [result, setResult] = useState<any>(null)
    const [profile, setProfile] = useState<any>(null)
    const { data: session, status } = useSession()
    const router = useRouter()

    useEffect(() => {
        if (status === 'loading') return
        if (!session?.user) {
            router.push('/')
            return
        }

        const fetchResult = async () => {
            try {
                const userId = (session.user as any).id
                const p = await getProfile(userId)
                setProfile(p)

                const attempt = await getResult(userId)

                if (attempt) {
                    setResult(attempt)
                    if (attempt.totalQuestions > 0 && (attempt.score / attempt.totalQuestions) >= 0.7) {
                        const jsConfetti = new JSConfetti()
                        jsConfetti.addConfetti({
                            confettiColors: ['#f97316', '#3b82f6', '#10b981', '#fcd34d'],
                            confettiNumber: 100,
                        })
                    }
                } else {
                    toast.error('No exam attempt found.')
                    router.push('/')
                }
            } catch (e: any) {
                toast.error(e.message)
            } finally {
                setLoading(false)
            }
        }

        fetchResult()
    }, [session, status, router])

    const handleLogout = async () => {
        await signOut({ callbackUrl: '/' })
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
        )
    }

    if (!result) return null

    return (
        <>
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

                .rs-page {
                    font-family: 'Inter', system-ui, sans-serif;
                    min-height: 100dvh;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: #f8fafc;
                    position: relative;
                    overflow: hidden;
                    -webkit-font-smoothing: antialiased;
                    color: #0f172a;
                }

                .rs-page::before {
                    content: ''; position: absolute; top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    width: 700px; height: 700px; border-radius: 50%;
                    background: radial-gradient(circle, rgba(249,115,22,0.06) 0%, rgba(249,115,22,0.02) 35%, transparent 70%);
                    pointer-events: none; z-index: 0;
                }
                
                .rs-page::after {
                    content: ''; position: absolute; top: -200px; right: -200px;
                    width: 500px; height: 500px; border-radius: 50%;
                    background: radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%);
                    pointer-events: none; z-index: 0;
                }

                .rs-grain {
                    position: fixed; inset: 0; pointer-events: none; z-index: 0;
                    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
                    background-size: 140px; opacity: 0.15; mix-blend-mode: multiply;
                }

                .rs-content {
                    position: relative; z-index: 1;
                    display: flex; flex-direction: column; align-items: center;
                    width: 100%; max-width: 480px; padding: 2rem;
                    animation: rs-up 0.8s cubic-bezier(0.16,1,0.3,1) forwards;
                }

                .rs-icon-box {
                    width: 72px; height: 72px;
                    background: #ffffff;
                    border: 1px solid rgba(0,0,0,0.05);
                    color: #f97316;
                    border-radius: 22px;
                    display: flex; align-items: center; justify-content: center;
                    margin-bottom: 2rem;
                    box-shadow: 0 8px 32px rgba(0,0,0,0.06);
                }

                .rs-heading {
                    font-size: clamp(2rem, 5vw, 2.5rem);
                    font-weight: 900;
                    color: #0f172a;
                    letter-spacing: -0.035em;
                    line-height: 1.1;
                    text-align: center;
                    margin: 0 0 1rem;
                }

                .rs-subtitle {
                    color: #64748b;
                    font-size: 1.1rem;
                    text-align: center;
                    margin-bottom: 3rem;
                    line-height: 1.5;
                }
                
                .rs-subtitle strong { color: #334155; font-weight: 700; }

                .rs-info-card {
                    width: 100%;
                    display: flex; align-items: center; gap: 1.25rem;
                    padding: 1.5rem;
                    border-radius: 20px;
                    background: #ffffff;
                    border: 1px solid rgba(0,0,0,0.06);
                    margin-bottom: 1rem;
                    transition: all 0.3s ease;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.02);
                }
                .rs-info-card:hover { 
                    border-color: rgba(249,115,22,0.3); 
                    background: rgba(249,115,22,0.02);
                    box-shadow: 0 4px 15px rgba(0,0,0,0.04);
                }

                .rs-info-icon-box {
                    width: 48px; height: 48px; border-radius: 14px;
                    background: #f1f5f9;
                    display: flex; align-items: center; justify-content: center;
                    flex-shrink: 0;
                }

                .rs-info-text h4 { font-size: 0.85rem; font-weight: 600; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.2rem; }
                .rs-info-text p { font-size: 1.1rem; color: #334155; font-weight: 700; text-transform: capitalize; }

                .rs-btn {
                    width: 100%; height: 58px;
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    border-radius: 16px;
                    background: #0f172a;
                    color: #ffffff;
                    font-size: 16px; font-weight: 700;
                    border: none; cursor: pointer;
                    margin-top: 2.5rem;
                    box-shadow: 0 0 0 1px rgba(0,0,0,0.08), 0 4px 20px rgba(15,23,42,0.2);
                    transition: all 0.2s ease;
                }
                .rs-btn:hover {
                    transform: translateY(-2px);
                    background: #1e293b;
                    box-shadow: 0 0 0 1px rgba(0,0,0,0.1), 0 8px 30px rgba(15,23,42,0.3);
                }
                
                .rs-footer {
                    position: fixed; bottom: 1.5rem;
                    font-size: 11px; color: #94a3b8;
                    letter-spacing: 0.05em; font-weight: 600; font-family: monospace;
                    pointer-events: none;
                }

                @keyframes rs-up {
                    from { opacity: 0; transform: translateY(20px); }
                    to   { opacity: 1; transform: translateY(0);    }
                }
            `}</style>

            <div className="rs-grain" aria-hidden />

            <div className="rs-page">
                <div className="rs-content">

                    <div className="rs-icon-box">
                        <CheckCircle2 size={36} strokeWidth={2.5} />
                    </div>

                    <h1 className="rs-heading">
                        Assessment<br />Complete<span style={{ color: '#f97316' }}>.</span>
                    </h1>

                    <p className="rs-subtitle">
                        Your session has been securely logged.<br />
                        Thank you for your time, <strong>{profile?.fullName || 'Student'}</strong>.
                    </p>

                    <div className="rs-info-card" style={{ animationDelay: '0.1s' }}>
                        <div className="rs-info-icon-box" style={{ color: '#3b82f6' }}>
                            <Shield size={24} strokeWidth={2} />
                        </div>
                        <div className="rs-info-text">
                            <h4>Authentication Record</h4>
                            <p>{profile?.rollNo || 'N/A'}</p>
                        </div>
                    </div>

                    <div className="rs-info-card" style={{ animationDelay: '0.2s' }}>
                        <div className="rs-info-icon-box" style={{ color: '#10b981' }}>
                            <Clock size={24} strokeWidth={2} />
                        </div>
                        <div className="rs-info-text">
                            <h4>Session Status</h4>
                            <p>{result.status}</p>
                        </div>
                    </div>

                    <button className="rs-btn" onClick={handleLogout}>
                        <LogOut size={20} strokeWidth={2.5} /> Confirm & Sign Out
                    </button>

                </div>

                <div className="rs-footer">
                    EXAM_REF: {result._id}
                </div>
            </div>
        </>
    )
}

