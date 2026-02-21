
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        }),
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) return null

                // Admin check via env vars
                const adminEmail = process.env.ADMIN_EMAIL
                const adminPassword = process.env.ADMIN_PASSWORD

                if (adminEmail && adminPassword &&
                    credentials.email === adminEmail &&
                    credentials.password === adminPassword) {

                    return {
                        id: 'admin-id',
                        email: adminEmail,
                        name: 'Administrator',
                        role: 'admin'
                    }
                }
                return null
            }
        })
    ],
    callbacks: {
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id
                token.role = (user as any).role || 'student'
            }

            // If OAuth sign in (Google), allow standard student access
            if (account?.provider === 'google' && user?.email) {
                await dbConnect()
                const existingUser = await User.findOne({ email: user.email })

                if (existingUser) {
                    token.id = existingUser._id.toString()
                    token.role = existingUser.role
                } else {
                    // Create new student
                    const newUser = await User.create({
                        email: user.email,
                        fullName: user.name,
                        role: 'student',
                        googleId: user.id // Store Google ID
                    })
                    token.id = newUser._id.toString()
                    token.role = 'student'
                }
            }
            return token
        },

        async session({ session, token }) {
            if (session.user) {
                (session.user as any).id = token.id;
                (session.user as any).role = token.role
            }
            return session
        }
    },
    pages: {
        signIn: '/', // Custom login page
        error: '/auth/error'
    },
    session: {
        strategy: 'jwt'
    }
}
