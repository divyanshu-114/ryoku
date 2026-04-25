import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

function requireEnv(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

export const redis = new Redis({
    url: requireEnv("UPSTASH_REDIS_REST_URL"),
    token: requireEnv("UPSTASH_REDIS_REST_TOKEN"),
});

// Rate limiter: 30 requests per minute per key
export const chatRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(30, "1 m"),
    analytics: true,
});

// Rate limiter for API: 60 requests per minute
export const apiRateLimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(60, "1 m"),
    analytics: true,
});

// Business config cache helpers
export async function getCachedBusinessConfig(slug: string) {
    const cached = await redis.get(`business:${slug}`);
    return cached;
}

export async function setCachedBusinessConfig(
    slug: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    config: any,
    ttlSeconds = 300
) {
    await redis.set(`business:${slug}`, JSON.stringify(config), {
        ex: ttlSeconds,
    });
}

export async function invalidateBusinessCache(slug: string) {
    await redis.del(`business:${slug}`);
}
