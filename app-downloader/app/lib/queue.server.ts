import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { CONFIG } from './config';

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
    retryStrategy: (times: number) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`[Redis] Retrying connection in ${delay}ms (attempt ${times})`);
        return delay;
    },
};

const redisConnection = new IORedis(redisConfig);

redisConnection.on('error', (err) => {
    console.error('[Redis] Connection error:', err.message);
});

redisConnection.on('connect', () => {
    console.log('[Redis] Connected successfully');
});

const QUEUE_NAME = 'download-queue';

export const downloadQueue = new Queue(QUEUE_NAME, {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: CONFIG.JOB_MAX_ATTEMPTS,
        backoff: {
            type: CONFIG.JOB_BACKOFF_TYPE as 'exponential',
            delay: CONFIG.JOB_BACKOFF_DELAY,
        },
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
    },
});
