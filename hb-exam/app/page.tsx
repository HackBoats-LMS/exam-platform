'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { getProfile, checkExamStatus } from '@/app/actions'
import { signIn, useSession } from 'next-auth/react'
import { toast } from 'sonner'

const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
  </svg>
)

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

        html, body { margin: 0; padding: 0; }

        /* ── Full-screen canvas ─────────────────────────────── */
        .sp-page {
          font-family: 'Inter', system-ui, sans-serif;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #0c0c10;
          position: relative;
          overflow: hidden;
          -webkit-font-smoothing: antialiased;
        }

        /* ── Background: three soft glows ──────────────────────
           They give depth to the flat dark canvas without        
           pulling attention away from the login elements.        */
        .sp-page::before {
          content: '';
          position: absolute;
          /* Large warm glow — centered, sits behind the content */
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 700px; height: 700px;
          border-radius: 50%;
          background: radial-gradient(circle,
            rgba(234,88,12,0.07) 0%,
            rgba(120,60,20,0.04) 35%,
            transparent 70%
          );
          pointer-events: none;
        }
        .sp-page::after {
          content: '';
          position: absolute;
          top: -200px; right: -200px;
          width: 500px; height: 500px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%);
          pointer-events: none;
        }

        /* ── Grain layer ───────────────────────────────────── */
        .sp-grain {
          position: fixed; inset: 0; pointer-events: none; z-index: 0;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E");
          background-size: 140px;
          opacity: 0.045;
          mix-blend-mode: screen;
        }

        /* ── Content wrapper — no card border ─────────────── */
        .sp-content {
          position: relative; z-index: 1;
          display: flex; flex-direction: column;
          align-items: center;
          gap: 0;
          width: 100%;
          max-width: 380px;
          padding: 2rem;
        }

        /* ── Logo ─────────────────────────────────────────── */
        .sp-logo {
          margin-bottom: 3rem;
          opacity: 0;
          animation: sp-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.05s forwards;
        }

        /* ── Eyebrow text ─────────────────────────────────── */
        .sp-eyebrow {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.3);
          margin-bottom: 0.75rem;
          opacity: 0;
          animation: sp-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.12s forwards;
        }

        /* ── Heading ──────────────────────────────────────── */
        .sp-heading {
          font-size: clamp(1.9rem, 5vw, 2.5rem);
          font-weight: 800;
          color: #f0f0f0;
          letter-spacing: -0.035em;
          line-height: 1.1;
          text-align: center;
          margin: 0 0 2.5rem;
          opacity: 0;
          animation: sp-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.18s forwards;
        }

        /* One orange character — brand signature */
        .sp-dot { color: #f97316; }

        /* ── Google button — no card, floats freely ────────── */
        .sp-google {
          width: 100%;
          height: 52px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          border-radius: 13px;
          background: rgba(255,255,255,0.97);
          color: #111;
          font-size: 15px;
          font-weight: 600;
          font-family: inherit;
          border: none;
          cursor: pointer;
          /* The shadow gives elevation — this IS the card */
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.08),
            0 4px 30px rgba(0,0,0,0.5),
            0 1px 0 rgba(255,255,255,0.1) inset;
          transition: transform 0.15s ease, box-shadow 0.2s ease;
          opacity: 0;
          animation: sp-up 0.6s cubic-bezier(0.16,1,0.3,1) 0.26s forwards;
        }
        .sp-google:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow:
            0 0 0 1px rgba(255,255,255,0.1),
            0 8px 40px rgba(0,0,0,0.55),
            0 1px 0 rgba(255,255,255,0.15) inset;
        }
        .sp-google:active:not(:disabled) { transform: translateY(0); }
        .sp-google:disabled { opacity: 0.5 !important; cursor: not-allowed; }

        /* ── Separator & Admin link removed — keep /admin-login accessible via direct URL */

        /* ── Footer ───────────────────────────────────────── */
        .sp-footer {
          position: fixed; bottom: 1.5rem;
          font-size: 11px; color: rgba(255,255,255,0.16);
          letter-spacing: 0.02em; font-weight: 400;
        }

        /* ── Animations ──────────────────────────────────── */
        @keyframes sp-up {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        @keyframes sp-spin {
          to { transform: rotate(360deg); }
        }
        .sp-spin { animation: sp-spin 0.9s linear infinite; }
      `}</style>

      <div className="sp-grain" aria-hidden />

      <div className="sp-page">
        <div className="sp-content">

          {/* Logo */}
          <div className="sp-logo">
            <img
              src="https://www.hackboats.com/images/logo.png"
              alt="HackBoats"
              style={{ height: 30, width: 'auto', opacity: 0.85 }}
              suppressHydrationWarning
            />
          </div>

          {/* Eyebrow */}
          <p className="sp-eyebrow">Exam Platform</p>

          {/* Heading */}
          <h1 className="sp-heading">
            Sign in to begin<span className="sp-dot">.</span>
          </h1>

          {/* Google button — no wrapping card */}
          <button
            className="sp-google"
            onClick={loginGoogle}
            disabled={isLoading}
          >
            {isLoading
              ? <Loader2 size={18} className="sp-spin" style={{ color: '#f97316' }} />
              : <GoogleIcon />
            }
            {isLoading ? 'Connecting…' : 'Continue with Google'}
          </button>



        </div>

        {/* Footer */}
        <p className="sp-footer" suppressHydrationWarning>© {new Date().getFullYear()} HackBoats</p>
      </div>
    </>
  )
}
