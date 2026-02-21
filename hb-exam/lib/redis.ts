import Redis from 'ioredis'

// Connect to Redis only if REDIS_URL is provided in production
// Otherwise, mock the methods to gracefully fallback to DB without crashing
const redisUrl = process.env.REDIS_URL

const redis = redisUrl
    ? new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        retryStrategy(times) {
            // Keep retrying for a bit if disconnected, up to 3 seconds
            const delay = Math.min(times * 50
                , 3000)
            return delay
        }
    })
    : null

export async function getFromRedisOrDb<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttlSeconds = 3600
): Promise<T> {
    // If Redis is active, try fetching from RAM first
    if (redis) {
        try {
            const cachedValue = await redis.get(key)
            if (cachedValue) {
                return JSON.parse(cachedValue) as T
            }
        } catch (error) {
            console.error(`[Redis] Failed to GET key "${key}":`, error)
        }
    }

    // IF missing in Redis (or Redis offline), grab from MongoDB
    const data = await fetchFn()

    // Store it back into Redis for the next concurrent user
    if (redis && data) {
        try {
            await redis.setex(key, ttlSeconds, JSON.stringify(data))
        } catch (error) {
            console.error(`[Redis] Failed to SET key "${key}":`, error)
        }
    }

    return data
}

export async function invalidateRedisTag(pattern: string) {
    if (!redis) return
    try {
        await new Promise<void>((resolve, reject) => {
            const stream = redis.scanStream({ match: `*${pattern}*`, count: 100 })

            stream.on('data', async (keys: string[]) => {
                if (keys.length) {
                    stream.pause()
                    try {
                        const pipeline = redis.pipeline()
                        keys.forEach(key => pipeline.del(key))
                        const results = await pipeline.exec()
                        const pipelineErr = results?.find(([err]) => err)?.[0]
                        if (pipelineErr) throw pipelineErr
                    } catch (err) {
                        stream.destroy(err as Error)
                        reject(err)
                    } finally {
                        if (!stream.destroyed) stream.resume()
                    }
                }
            })

            stream.on('end', () => resolve())
            stream.on('error', (err) => reject(err))
        })
    } catch (error) {
        console.error(`[Redis] Failed to invalidate pattern "${pattern}":`, error)
    }
}

export default redis
