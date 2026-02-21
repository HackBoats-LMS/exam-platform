'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Check, X, Shield, Clock, Award, Loader2 } from 'lucide-react'
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
                // Fetch Profile via Action
                const p = await getProfile(userId)
                setProfile(p)

                // Fetch Result via Action
                const attempt = await getResult(userId) // fetches latest

                if (attempt) {
                    setResult(attempt)
                    // Check completion
                    if (attempt.totalQuestions > 0 && (attempt.score / attempt.totalQuestions) >= 0.7) {
                        const jsConfetti = new JSConfetti()
                        jsConfetti.addConfetti()
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <Loader2 className="w-8 h-8 animate-spin text-sky-500" />
            </div>
        )
    }

    if (!result) return null

    // Helper for safe access
    const score = result.score || 0
    const total = result.totalQuestions || 0
    const percentage = total > 0 ? (score / total) * 100 : 0
    const passed = percentage >= 50
    // Mongo uses camelCase usually based on my schema definition
    // User profile uses schema from Mongo model: fullName, rollNo, etc.

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            <Card className="max-w-md w-full p-8 text-center animate-fade-in shadow-xl">
                <div className="mb-6 flex justify-center">
                    <div className={`p-4 rounded-full ${passed ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        <Award className="w-12 h-12" />
                    </div>
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">Exam Completed!</h1>
                <p className="text-gray-500 mb-6">
                    Thank you for attempting the exam, <span className="font-medium text-gray-900">{profile?.fullName}</span>.
                </p>

                <div className="bg-gray-50 rounded-lg p-6 mb-8 border border-gray-100">
                    <div className="text-sm text-gray-500 uppercase tracking-wider mb-1">Your Score</div>
                    <div className="text-5xl font-extrabold text-gray-900 mb-2">
                        {score} <span className="text-2xl text-gray-400">/ {total}</span>
                    </div>
                    <div className={`text-sm font-medium ${passed ? 'text-green-600' : 'text-red-600'}`}>
                        {percentage.toFixed(0)}% - {passed ? 'Passed' : 'Failed'}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-left text-sm text-gray-600 mb-8">
                    <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span>Status: <span className="capitalize font-medium text-gray-900">{result.status}</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Shield className="w-4 h-4 text-gray-400" />
                        <span>Roll No: {profile?.rollNo}</span>
                    </div>
                </div>

                <Button onClick={handleLogout} variant="outline" className="w-full">
                    Sign Out
                </Button>
            </Card>

            {/* Footer */}
            <div className="absolute bottom-4 text-center text-xs text-gray-300 pointer-events-none">
                Exam ID: {result._id}
            </div>
        </div>
    )
}

