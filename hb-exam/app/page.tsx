'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getProfile, checkExamStatus } from '@/app/actions'
import { signIn, useSession } from 'next-auth/react'
import { Footer } from '@/components/footer'
import Threads from '@/components/ui/Threads'

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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

        html, body {
          margin: 0; padding: 0;
          background-color: #000000;
          color: #ffffff;
          font-family: 'Inter', sans-serif;
          -webkit-font-smoothing: antialiased;
          overflow-x: hidden;
        }

        .ix-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: #000000;
          position: relative;
          box-sizing: border-box;
        }

        /* Navbar */
        .ix-nav {
          position: relative;
          z-index: 50;
          display: flex;
          align-items: center;
          padding: 2.5rem 4rem 1rem;
          max-width: 1400px;
          margin: 0 auto;
          width: 100%;
          box-sizing: border-box;
        }
        .ix-nav-logo {
          height: 36px;
          object-fit: contain;
        }

        /* Hero Layout */
        .ix-hero {
          position: relative;
          z-index: 10;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2rem;
          max-width: 1300px;
          margin: auto auto;
          padding: 2rem 4rem 8rem;
          width: 100%;
          box-sizing: border-box;
          align-items: center;
        }

        /* Hero Left Column */
        .ix-hero-left {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          z-index: 10;
        }
        .ix-h1 {
          font-size: clamp(3rem, 5vw, 4.5rem);
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -0.03em;
          margin: 0 0 1.5rem;
          color: #ffffff;
        }
        .ix-text-red {
          color: #dc2626; /* Vibrant red */
        }
        .ix-subtitle {
          font-size: clamp(1.1rem, 2vw, 1.35rem);
          color: #9ca3af; /* Muted grey */
          line-height: 1.5;
          margin: 0 0 3rem;
          font-weight: 400;
        }

        /* Google Login Button */
        .ix-google-btn {
          background: rgba(13, 13, 18, 0.65);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(220, 38, 38, 0.4);
          color: #ffffff;
          padding: 1.1rem 2.2rem;
          border-radius: 12px;
          font-weight: 600;
          font-size: 1.1rem;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 0.85rem;
          box-shadow: 0 4px 30px rgba(0, 0, 0, 0.4);
        }
        .ix-google-btn:hover {
          border-color: rgba(220, 38, 38, 0.95);
          background: rgba(220, 38, 38, 0.08);
          box-shadow: 0 0 25px rgba(220, 38, 38, 0.25);
          transform: translateY(-2px);
        }
        .ix-google-btn:active {
          transform: translateY(0);
        }
        .ix-google-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        /* Google Icon */
        .ix-google-icon {
          width: 24px;
          height: 24px;
          flex-shrink: 0;
        }

        /* Hero Right Column */
        .ix-hero-right {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          position: relative;
        }
        .ix-illustration-container {
          position: relative;
          width: 100%;
          max-width: 620px;
          display: flex;
          justify-content: center;
          align-items: center;
        }
        .ix-illustration-img {
          width: 100%;
          height: auto;
          object-fit: contain;
          z-index: 10;
        }
        .ix-red-glow {
          position: absolute;
          width: 80%;
          height: 80%;
          background: radial-gradient(circle, rgba(220, 38, 38, 0.22) 0%, rgba(0, 0, 0, 0) 70%);
          z-index: 0;
          pointer-events: none;
        }

        /* Bottom Waves */
        .ix-waves-wrapper {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 420px;
          overflow: hidden;
          pointer-events: auto;
          z-index: 1;
        }
        .ix-waves-svg {
          position: absolute;
          bottom: 0;
          width: 100%;
          height: 100%;
        }

        /* Responsive Breakpoints */
        @media (max-width: 1024px) {
          .ix-nav {
            padding: 2rem 2.5rem 1rem;
          }
          .ix-hero {
            grid-template-columns: 1fr;
            gap: 1.5rem;
            padding: 4.5rem 2.5rem 2rem;
            margin: auto auto;
            text-align: center;
          }
          .ix-hero-left {
            align-items: center;
          }
          .ix-hero-right {
            justify-content: center;
            margin-top: -1.5rem;
          }
          .ix-illustration-container {
            max-width: 500px;
          }
          .ix-waves-wrapper {
            height: 280px;
          }
        }

        @media (max-width: 640px) {
          .ix-nav {
            padding: 1.5rem 1.5rem 1rem;
          }
          .ix-hero {
            padding: 3.5rem 1.5rem 1.5rem;
            gap: 1rem;
          }
          .ix-hero-right {
            margin-top: -2.2rem;
          }
          .ix-h1 {
            font-size: clamp(2.2rem, 8vw, 3rem);
          }
          .ix-subtitle {
            margin-bottom: 2.2rem;
          }
          .ix-google-btn {
            width: 100%;
            padding: 1rem 1.8rem;
            font-size: 1rem;
          }
          .ix-waves-wrapper {
            height: 240px;
          }
        }
      `}</style>

      <div className="ix-page">
        {/* Top Navbar */}
        <nav className="ix-nav">
          <img src="/internx-logo-white.png" alt="InternX" className="ix-nav-logo" />
        </nav>

        {/* Hero Section */}
        <main className="ix-hero">
          <div className="ix-hero-left">
            <h1 className="ix-h1">
              Every attempt<br />
              is a <span className="ix-text-red">step forward.</span>
            </h1>

            <p className="ix-subtitle">
              Access assessments through<br />your InternX account.
            </p>

            <button className="ix-google-btn" onClick={loginGoogle} disabled={isLoading}>
              {isLoading ? (
                <Loader2 size={24} className="animate-spin text-white" />
              ) : (
                <svg className="ix-google-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
              )}
              <span>Continue with Google</span>
            </button>
          </div>

          <div className="ix-hero-right">
            <div className="ix-illustration-container">
              <div className="ix-red-glow" />
              <img
                src="/Kids Studying from Home-rafiki.svg"
                alt="Student Assessment Illustration"
                className="ix-illustration-img"
              />
            </div>
          </div>
        </main>

        {/* Dynamic Threads Component from React Bits */}
        <div className="ix-waves-wrapper">
          <Threads
            color={[0.86, 0.15, 0.15]}
            amplitude={1.2}
            distance={0.3}
            enableMouseInteraction={true}
          />
        </div>

        {/* Global Footer (HackBoats logo and details) */}
        <Footer className="relative z-10" />
      </div>
    </>
  )
}
