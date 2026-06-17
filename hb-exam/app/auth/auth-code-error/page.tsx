export default function AuthErrorPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4">
            <div className="text-center space-y-4">
                <h1 className="text-2xl font-bold text-white">Authentication Error</h1>
                <p className="text-gray-400">We could not sign you in. Please try again or contact support.</p>
                <a href="/" className="inline-block px-4 py-2 bg-sky-500 text-white rounded-md hover:bg-sky-600 transition-colors">
                    Return to Home
                </a>
            </div>
        </div>
    )
}
