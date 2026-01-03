export const CONFIG = {
    SSE_POLL_INTERVAL_MS: 3000,
    SSE_HEARTBEAT_INTERVAL_MS: 30000,
    SSE_RECENT_DOWNLOADS_LIMIT: 20,
    RATE_LIMIT_WINDOW_MS: 60000,
    RATE_LIMIT_MAX_REQUESTS: 10,
    JOB_MAX_ATTEMPTS: 3,
    JOB_BACKOFF_TYPE: 'exponential',
    JOB_BACKOFF_DELAY: 5000,
    ALLOWED_HOSTS: [
        'youtube.com',
        'www.youtube.com',
        'youtu.be',
        'm.youtube.com',
        'music.youtube.com',
    ],
};

const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const entry = rateLimitStore.get(identifier);

    if (!entry || now > entry.resetAt) {
        rateLimitStore.set(identifier, {
            count: 1,
            resetAt: now + CONFIG.RATE_LIMIT_WINDOW_MS,
        });
        return { allowed: true, remaining: CONFIG.RATE_LIMIT_MAX_REQUESTS - 1, resetAt: now + CONFIG.RATE_LIMIT_WINDOW_MS };
    }

    if (entry.count >= CONFIG.RATE_LIMIT_MAX_REQUESTS) {
        return { allowed: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return { allowed: true, remaining: CONFIG.RATE_LIMIT_MAX_REQUESTS - entry.count, resetAt: entry.resetAt };
}

setInterval(() => {
    const now = Date.now();
    for (const [key, value] of rateLimitStore.entries()) {
        if (now > value.resetAt) {
            rateLimitStore.delete(key);
        }
    }
}, 60000);
