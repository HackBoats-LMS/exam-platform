
import { NextAuthOptions } from 'next-auth'
import GoogleProvider from 'next-auth/providers/google'
import CredentialsProvider from 'next-auth/providers/credentials'
import dbConnect from '@/lib/mongodb'
import User from '@/models/User'
import bcrypt from 'bcryptjs'

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

                await dbConnect()

                // Check for admin user in DB
                let adminUser = await User.findOne({ email: credentials.email, role: 'admin' })

                // --- Initial Seeding ---
                // If there's literally no admin user yet but the user attempts to sign in
                // using the legacy ENV variables, we'll hash it and create their permanent DB account
                if (!adminUser && credentials.email === process.env.ADMIN_EMAIL) {
                    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || '', 10)
                    adminUser = await User.create({
                        email: credentials.email,
                        password: hashedPassword,
                        fullName: 'Administrator',
                        role: 'admin'
                    })
                }

                // If admin exists, verify their hashed DB password
                if (adminUser && adminUser.password) {
                    const isValid = await bcrypt.compare(credentials.password, adminUser.password)
                    if (isValid) {
                        return {
                            id: adminUser._id.toString(),
                            email: adminUser.email,
                            name: adminUser.fullName || 'Administrator',
                            role: 'admin'
                        }
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
