import IORedis from 'ioredis';
import { CONFIG } from './constants.js';

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
    maxRetriesPerRequest: null,
    retryStrategy: (times) => {
        const delay = Math.min(times * CONFIG.REDIS_RETRY_DELAY_MS, CONFIG.REDIS_MAX_RETRY_DELAY_MS);
        console.log(`[Redis] Retrying connection in ${delay}ms (attempt ${times})`);
        return delay;
    },
    reconnectOnError: (err) => {
        const targetErrors = ['READONLY', 'ECONNRESET', 'ECONNREFUSED'];
        return targetErrors.some(e => err.message.includes(e));
    }
};

export const redisConnection = new IORedis(redisConfig);

redisConnection.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
});

redisConnection.on('connect', () => {
    console.log('[Redis] Connected successfully');
});

redisConnection.on('close', () => {
    console.log('[Redis] Connection closed');
});

redisConnection.on('reconnecting', () => {
    console.log('[Redis] Reconnecting...');
});
