'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, ArrowRight, ShieldCheck, Clock, BarChart2, Users, FileText, CheckCircle2, Bell, LayoutGrid, FilePlus, Settings, PieChart, Activity, Lock } from 'lucide-react'
import { getProfile, checkExamStatus } from '@/app/actions'
import { signIn, useSession } from 'next-auth/react'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { data: session, status } = useSession()

  useEffect(() => {
    if (status !== 'authenticated' || !session?.user) return
    setIsLoading(true)
      ; (async () => {
        try {
          const profile = await getProfile((session.user as any).id)
          if (profile?.role === 'admin') { router.push('/admin'); return }
          const es = await checkExamStatus((session.user as any).id)
          router.push(es === 'completed' || es === 'terminated' ? '/result' : '/onboarding')
        } catch { setIsLoading(false) }
      })()
  }, [status, session, router])

  const loginGoogle = () => {
    setIsLoading(true)
    signIn('google', { callbackUrl: '/onboarding' })
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

        html, body {
          margin: 0; padding: 0;
          background-color: #030303;
          color: #ffffff;
          font-family: 'Inter', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .ix-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          overflow-x: hidden;
          background: #030303;
          position: relative;
        }

        /* Abstract Background Elements */
        .ix-bg-glow {
          position: absolute;
          top: 0; right: 0;
          width: 800px; height: 800px;
          background: radial-gradient(circle at 70% 30%, rgba(220, 20, 40, 0.25) 0%, rgba(0,0,0,0) 60%);
          pointer-events: none;
          z-index: 0;
        }
        .ix-bg-lines {
          position: absolute;
          top: -100px; right: -100px;
          width: 900px; height: 900px;
          border: 1px solid rgba(255,255,255,0.03);
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
        }
        .ix-bg-lines::before {
          content: ''; position: absolute; inset: 100px;
          border: 1px solid rgba(255,255,255,0.02); border-radius: 50%;
        }
        .ix-bg-lines::after {
          content: ''; position: absolute; inset: 200px;
          border: 1px solid rgba(255,255,255,0.01); border-radius: 50%;
        }
        .ix-dots {
          position: absolute;
          top: 80px; right: 40px;
          width: 80px; height: 80px;
          background-image: radial-gradient(rgba(220, 20, 40, 0.5) 2px, transparent 2px);
          background-size: 16px 16px;
          z-index: 0;
          opacity: 0.5;
        }

        /* Navbar */
        .ix-nav {
          position: relative;
          z-index: 50;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem 4rem;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }
        .ix-nav-logo { height: 32px; }
        .ix-nav-link {
          color: #d1d5db;
          font-size: 0.9rem;
          font-weight: 500;
          text-decoration: none;
          transition: color 0.2s;
          cursor: pointer;
        }
        .ix-nav-link:hover { color: #ffffff; }
        .ix-nav-right { display: flex; align-items: center; gap: 2rem; }
        .ix-btn-red {
          background: #dc2626;
          color: #fff;
          border: none;
          padding: 0.6rem 1.5rem;
          border-radius: 6px;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: background 0.2s;
          display: inline-flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .ix-btn-red:hover { background: #b91c1c; }

        /* Hero */
        .ix-hero {
          position: relative;
          z-index: 10;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 4rem;
          max-width: 1400px;
          margin: 4rem auto;
          padding: 0 4rem;
          width: 100%;
          box-sizing: border-box;
          align-items: center;
        }

        /* Hero Left */
        .ix-hero-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
        }
        .ix-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.35rem 1rem;
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 600;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          color: #e5e7eb;
          margin-bottom: 2rem;
        }
        .ix-pill-dot { width: 6px; height: 6px; border-radius: 50%; background-color: #ef4444; }
        .ix-h1 {
          font-size: clamp(3rem, 5vw, 4.5rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.02em;
          margin: 0 0 1.5rem;
        }
        .ix-text-red { color: #dc2626; }
        .ix-subtitle {
          font-size: 1.15rem;
          color: #9ca3af;
          line-height: 1.6;
          max-width: 500px;
          margin: 0 0 2.5rem;
        }
        .ix-cta-group {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          margin-bottom: 3rem;
        }
        .ix-btn-large {
          padding: 0.9rem 2rem;
          font-size: 1.05rem;
          border-radius: 8px;
        }
        
        .ix-trust-badges {
          display: flex;
          align-items: center;
          gap: 1.5rem;
          background: rgba(255,255,255,0.02);
          border: 1px solid rgba(255,255,255,0.05);
          padding: 1rem 1.5rem;
          border-radius: 8px;
        }
        .ix-badge { display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: #d1d5db; font-weight: 500; }
        .ix-badge-dot { color: #ef4444; font-size: 1.2rem; line-height: 0; }

        /* Mock Dashboard (Right Side) */
        .ix-hero-right {
          position: relative;
          perspective: 1500px;
          transform-style: preserve-3d;
        }
        .ix-dashboard {
          background: #0d0d12;
          border: 1px solid rgba(255,255,255,0.1);
          border-radius: 16px;
          width: 100%;
          min-height: 480px;
          transform: rotateY(-12deg) rotateX(4deg) translateZ(0);
          box-shadow: -20px 30px 60px rgba(0,0,0,0.6), 0 0 40px rgba(220, 20, 40, 0.15);
          display: flex;
          overflow: hidden;
        }
        
        /* Dashboard Sidebar */
        .ix-dash-sidebar {
          width: 60px;
          border-right: 1px solid rgba(255,255,255,0.05);
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 1.5rem 0;
          gap: 1.5rem;
          background: #0a0a0e;
        }
        .ix-dash-sidebar-icon { color: #6b7280; width: 20px; height: 20px; }
        .ix-dash-sidebar-icon.active { color: #dc2626; background: rgba(220,38,38,0.15); padding: 8px; border-radius: 8px; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }

        /* Dashboard Main */
        .ix-dash-main {
          flex: 1;
          padding: 1.5rem;
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }
        .ix-dash-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .ix-dash-title { font-size: 1.1rem; font-weight: 600; color: #fff; margin: 0; }
        .ix-dash-profile { display: flex; align-items: center; gap: 1rem; color: #9ca3af; }
        .ix-avatar { width: 28px; height: 28px; border-radius: 50%; background: #dc2626; }

        /* Dashboard Stats */
        .ix-dash-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 1rem;
        }
        .ix-stat-card {
          background: #15151a;
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 12px;
          padding: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }
        .ix-stat-label { font-size: 0.7rem; color: #9ca3af; font-weight: 500; }
        .ix-stat-row { display: flex; justify-content: space-between; align-items: flex-end; }
        .ix-stat-value { font-size: 1.4rem; font-weight: 700; color: #fff; line-height: 1; }
        .ix-stat-icon { color: #dc2626; width: 16px; height: 16px; }

        /* Dashboard Bottom Section */
        .ix-dash-bottom {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1rem;
          flex: 1;
        }
        .ix-dash-panel {
          background: #15151a;
          border: 1px solid rgba(255,255,255,0.04);
          border-radius: 12px;
          padding: 1.25rem;
          display: flex;
          flex-direction: column;
        }
        .ix-panel-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
        .ix-panel-title { font-size: 0.85rem; font-weight: 600; color: #fff; margin: 0; }
        .ix-panel-link { font-size: 0.7rem; color: #9ca3af; }
        
        .ix-exam-list { display: flex; flex-direction: column; gap: 0.75rem; }
        .ix-exam-item { display: flex; justify-content: space-between; align-items: center; padding-bottom: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.05); }
        .ix-exam-item:last-child { border-bottom: none; padding-bottom: 0; }
        .ix-exam-info { display: flex; align-items: flex-start; gap: 0.75rem; }
        .ix-exam-icon { width: 24px; height: 24px; background: rgba(255,255,255,0.05); border-radius: 6px; display: flex; align-items: center; justify-content: center; color: #9ca3af; }
        .ix-exam-name { font-size: 0.8rem; font-weight: 500; color: #fff; margin: 0 0 0.2rem; }
        .ix-exam-meta { font-size: 0.65rem; color: #6b7280; margin: 0; }
        .ix-exam-status { font-size: 0.65rem; color: #10b981; background: rgba(16,185,129,0.1); padding: 0.2rem 0.5rem; border-radius: 4px; font-weight: 500; }

        /* Chart Area */
        .ix-chart-area {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          position: relative;
        }
        .ix-chart-svg { width: 100%; height: 100px; }
        .ix-chart-labels { display: flex; justify-content: space-between; font-size: 0.6rem; color: #6b7280; margin-top: 0.5rem; }
        .ix-chart-stat { position: absolute; top: 10px; right: 10px; text-align: right; }
        .ix-chart-stat-val { font-size: 1.1rem; font-weight: 700; color: #fff; }
        .ix-chart-stat-lbl { font-size: 0.65rem; color: #9ca3af; }

        /* Bottom Features */
        .ix-features {
          position: relative;
          z-index: 10;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 2rem;
          max-width: 1400px;
          margin: 0 auto 4rem;
          padding: 3rem 4rem;
          background: rgba(10, 10, 15, 0.4);
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          width: 100%;
          box-sizing: border-box;
        }
        .ix-feature {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }
        .ix-f-icon {
          width: 50px; height: 50px;
          border-radius: 50%;
          background: rgba(220, 38, 38, 0.05);
          border: 1px solid rgba(220, 38, 38, 0.2);
          display: flex; align-items: center; justify-content: center;
          color: #ef4444;
          margin-bottom: 1.25rem;
        }
        .ix-f-title { font-size: 1.05rem; font-weight: 600; color: #fff; margin: 0 0 0.5rem; }
        .ix-f-desc { font-size: 0.85rem; color: #9ca3af; line-height: 1.5; margin: 0; }

        @media (max-width: 968px) {
          .ix-features { grid-template-columns: 1fr 1fr; padding: 2rem; gap: 3rem 2rem; }
        }
        @media (max-width: 640px) {
          .ix-features { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="ix-page">
        <div className="ix-bg-glow" />
        <div className="ix-bg-lines" />
        <div className="ix-dots" />

        <nav className="ix-nav">
          <img src="/internx-logo-white.png" alt="InternX" className="ix-nav-logo" />
          <div className="ix-nav-right">
            <span className="ix-nav-link" onClick={loginGoogle}>Login</span>
            <button className="ix-btn-red" onClick={loginGoogle} disabled={isLoading}>
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
              Continue with Google
            </button>
          </div>
        </nav>

        <main className="ix-hero">
          <div className="ix-hero-left">
            <div className="ix-pill">
              <span className="ix-pill-dot" /> EXAM PLATFORM
            </div>
            
            <h1 className="ix-h1">
              Exam Smarter.<br/>
              <span className="ix-text-red">Achieve More.</span>
            </h1>
            
            <p className="ix-subtitle">
              Create, conduct and analyze exams with a secure platform built for modern teams.
            </p>
            
            <div className="ix-cta-group">
              <button className="ix-btn-red ix-btn-large" onClick={loginGoogle} disabled={isLoading}>
                {isLoading ? <Loader2 size={18} className="animate-spin" /> : 'Continue with Google'} <ArrowRight size={18} />
              </button>
            </div>

            <div className="ix-trust-badges">
              <div className="ix-badge"><ShieldCheck size={16} /> Secure & Reliable</div>
              <span className="ix-badge-dot">·</span>
              <div className="ix-badge"><Lock size={16} /> Anti-Cheating</div>
              <span className="ix-badge-dot">·</span>
              <div className="ix-badge"><PieChart size={16} /> Real-time Insights</div>
            </div>
          </div>

          <div className="ix-hero-right">
            <div className="ix-dashboard">
              <div className="ix-dash-sidebar">
                <div className="ix-dash-sidebar-icon"><LayoutGrid size={20} /></div>
                <div className="ix-dash-sidebar-icon active"><FileText size={20} /></div>
                <div className="ix-dash-sidebar-icon"><Users size={20} /></div>
                <div className="ix-dash-sidebar-icon"><Activity size={20} /></div>
                <div className="ix-dash-sidebar-icon"><Settings size={20} /></div>
              </div>
              
              <div className="ix-dash-main">
                <div className="ix-dash-header">
                  <h2 className="ix-dash-title">Dashboard</h2>
                  <div className="ix-dash-profile">
                    <Bell size={18} />
                    <div className="ix-avatar" />
                  </div>
                </div>

                <div className="ix-dash-stats">
                  <div className="ix-stat-card">
                    <span className="ix-stat-label">Exams</span>
                    <div className="ix-stat-row">
                      <span className="ix-stat-value">24</span>
                      <FilePlus className="ix-stat-icon" />
                    </div>
                  </div>
                  <div className="ix-stat-card">
                    <span className="ix-stat-label">Candidates</span>
                    <div className="ix-stat-row">
                      <span className="ix-stat-value">1,248</span>
                      <Users className="ix-stat-icon" />
                    </div>
                  </div>
                  <div className="ix-stat-card">
                    <span className="ix-stat-label">Average Score</span>
                    <div className="ix-stat-row">
                      <span className="ix-stat-value">76%</span>
                      <PieChart className="ix-stat-icon" />
                    </div>
                  </div>
                  <div className="ix-stat-card">
                    <span className="ix-stat-label">Completion Rate</span>
                    <div className="ix-stat-row">
                      <span className="ix-stat-value">92%</span>
                      <Activity className="ix-stat-icon" />
                    </div>
                  </div>
                </div>

                <div className="ix-dash-bottom">
                  <div className="ix-dash-panel">
                    <div className="ix-panel-header">
                      <h3 className="ix-panel-title">Recent Exams</h3>
                      <span className="ix-panel-link">View All</span>
                    </div>
                    <div className="ix-exam-list">
                      <div className="ix-exam-item">
                        <div className="ix-exam-info">
                          <div className="ix-exam-icon"><FileText size={14} /></div>
                          <div>
                            <h4 className="ix-exam-name">Frontend Developer Assessment</h4>
                            <p className="ix-exam-meta">May 15, 2024 · 120 Participants</p>
                          </div>
                        </div>
                        <span className="ix-exam-status">Completed</span>
                      </div>
                      <div className="ix-exam-item">
                        <div className="ix-exam-info">
                          <div className="ix-exam-icon"><FileText size={14} /></div>
                          <div>
                            <h4 className="ix-exam-name">UI/UX Design Test</h4>
                            <p className="ix-exam-meta">May 10, 2024 · 85 Participants</p>
                          </div>
                        </div>
                        <span className="ix-exam-status">Completed</span>
                      </div>
                      <div className="ix-exam-item">
                        <div className="ix-exam-info">
                          <div className="ix-exam-icon"><FileText size={14} /></div>
                          <div>
                            <h4 className="ix-exam-name">Data Structures Quiz</h4>
                            <p className="ix-exam-meta">May 5, 2024 · 95 Participants</p>
                          </div>
                        </div>
                        <span className="ix-exam-status">Completed</span>
                      </div>
                    </div>
                  </div>

                  <div className="ix-dash-panel">
                    <div className="ix-panel-header">
                      <h3 className="ix-panel-title">Performance Overview</h3>
                      <span className="ix-panel-link" style={{border: '1px solid #333', padding: '2px 8px', borderRadius: '4px'}}>This Month</span>
                    </div>
                    <div className="ix-chart-area">
                      <div className="ix-chart-stat">
                        <div className="ix-chart-stat-val">76%</div>
                        <div className="ix-chart-stat-lbl">Average Score</div>
                      </div>
                      <svg className="ix-chart-svg" viewBox="0 0 200 60" preserveAspectRatio="none">
                        <defs>
                          <linearGradient id="redGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="rgba(220,38,38,0.4)" />
                            <stop offset="100%" stopColor="rgba(220,38,38,0)" />
                          </linearGradient>
                        </defs>
                        <path d="M0,50 C20,40 40,60 60,30 C80,0 100,20 120,40 C140,60 160,20 200,10 L200,60 L0,60 Z" fill="url(#redGrad)" />
                        <path d="M0,50 C20,40 40,60 60,30 C80,0 100,20 120,40 C140,60 160,20 200,10" fill="none" stroke="#ef4444" strokeWidth="2" />
                      </svg>
                      <div className="ix-chart-labels">
                        <span>May 1</span><span>May 8</span><span>May 15</span><span>May 22</span><span>May 29</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <div className="ix-features">
          <div className="ix-feature">
            <div className="ix-f-icon"><FileText size={24} /></div>
            <h3 className="ix-f-title">Create Exams</h3>
            <p className="ix-f-desc">Build custom exams with various question types, sections and time limits.</p>
          </div>
          <div className="ix-feature">
            <div className="ix-f-icon"><ShieldCheck size={24} /></div>
            <h3 className="ix-f-title">Secure & Fair</h3>
            <p className="ix-f-desc">Advanced proctoring and anti-cheating to ensure exam integrity and a fair experience.</p>
          </div>
          <div className="ix-feature">
            <div className="ix-f-icon"><BarChart2 size={24} /></div>
            <h3 className="ix-f-title">Analyze Performance</h3>
            <p className="ix-f-desc">Get real-time results and detailed analytics to track performance and progress.</p>
          </div>
          <div className="ix-feature">
            <div className="ix-f-icon"><Users size={24} /></div>
            <h3 className="ix-f-title">Built for Teams</h3>
            <p className="ix-f-desc">Manage candidates, roles and permissions with ease.</p>
          </div>
        </div>
      </div>
    </>
  )
}
