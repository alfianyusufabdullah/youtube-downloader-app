import { Queue } from 'bullmq';
import IORedis from 'ioredis';

const redisConfig = {
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT) || 6379,
    maxRetriesPerRequest: null,
};

const redisConnection = new IORedis(redisConfig);

const QUEUE_NAME = 'download-queue';

export const downloadQueue = new Queue(QUEUE_NAME, {
    connection: redisConnection,
});
