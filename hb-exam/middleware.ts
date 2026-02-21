import { withAuth } from "next-auth/middleware"

export default withAuth({
    callbacks: {
        authorized: ({ req, token }) => {
            const pathname = req.nextUrl.pathname

            // Admin Protection
            if (pathname.startsWith("/admin")) {
                return token?.role === "admin"
            }

            // Default Protection (Check if logged in)
            return !!token
        },
    },
})

export const config = {
    matcher: ["/admin/:path*", "/quiz/:path*", "/result/:path*", "/onboarding/:path*"]
}
