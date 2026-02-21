import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

if (!MONGODB_URI) {
    throw new Error(
        'Please define the MONGODB_URI environment variable inside .env.local'
    )
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections growing exponentially
 * during API Route usage.
 * 
 * On Vercel: each serverless function invocation reuses the cached connection
 * if still alive (warm lambda), otherwise creates a new one.
 * 
 * Pool sizing: Vercel free tier can have ~100 concurrent lambdas max.
 * MongoDB Atlas free (M0) allows ~500 connections.
 * We limit the pool per lambda so we don't exhaust Atlas limits.
 */
let cached = (global as any).mongoose

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null }
}

async function dbConnect() {
    if (cached.conn) {
        // Verify the connection is still alive
        if (cached.conn.connection.readyState === 1) {
            return cached.conn
        }
        // Connection dropped — reset and reconnect
        cached.conn = null
        cached.promise = null
    }

    if (!cached.promise) {
        const opts: mongoose.ConnectOptions = {
            bufferCommands: false,
            // On Vercel Free: max ~100 concurrent lambdas each needing ≤ 5 connections
            // = 500 max total — exact Atlas M0 limit. Keep this at 5.
            maxPoolSize: 5,
            minPoolSize: 1,
            // Timeout settings appropriate for serverless
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 30000,
            connectTimeoutMS: 10000,
            // Heartbeat to detect stale connections
            heartbeatFrequencyMS: 10000,
        }

        cached.promise = mongoose.connect(MONGODB_URI!, opts).then((mongoose) => {
            return mongoose
        })
    }

    try {
        cached.conn = await cached.promise
    } catch (e) {
        cached.promise = null
        throw e
    }

    return cached.conn
}

export default dbConnect
