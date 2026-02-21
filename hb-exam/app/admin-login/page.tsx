'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Lock, Mail, Loader2, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

export default function AdminLoginPage() {
    const [isLoading, setIsLoading] = useState(false)
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const router = useRouter()

    const handleAdminLogin = async (e: React.FormEvent) => {
        e.preventDefault()
        setIsLoading(true)

        try {
            const res = await signIn('credentials', {
                email,
                password,
                redirect: false
            })

            if (res?.error) {
                toast.error('Invalid Credentials')
                setIsLoading(false)
            } else {
                router.push('/admin')
            }
        } catch (error) {
            toast.error('Something went wrong')
            setIsLoading(false)
        }
    }


    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
                <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-sky-200/30 rounded-full blur-3xl" />
                <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/30 rounded-full blur-3xl" />
            </div>

            <Card className="w-full max-w-md relative z-10 animate-fade-in border-0 shadow-2xl shadow-sky-900/10">
                <div className="p-4">
                    <Link href="/" className="text-gray-400 hover:text-gray-600 flex items-center text-sm transition-colors">
                        <ArrowLeft className="w-4 h-4 mr-1" /> Back to Student Login
                    </Link>
                </div>

                <div className="text-center mb-8 px-4">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-sky-100 rounded-full text-sky-600">
                            <Lock className="w-8 h-8" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
                    <p className="text-gray-500 text-sm mt-2">Enter your credentials to manage the platform</p>
                </div>

                <div className="px-6 pb-8" suppressHydrationWarning>
                    <form onSubmit={handleAdminLogin} className="space-y-4" suppressHydrationWarning>
                        <div className="space-y-2" suppressHydrationWarning>
                            <label className="text-sm font-medium text-gray-700 ml-1">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                <Input
                                    type="email"
                                    placeholder="admin@hackboats.com"
                                    className="pl-10"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    suppressHydrationWarning
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700 ml-1">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                                <Input
                                    type="password"
                                    placeholder="••••••••"
                                    className="pl-10"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="pt-2">
                            <Button
                                type="submit"
                                className="w-full font-semibold"
                                disabled={isLoading}
                            >
                                {isLoading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                Login as Admin
                            </Button>
                        </div>
                    </form>
                </div>
            </Card>
        </div>
    )
}
