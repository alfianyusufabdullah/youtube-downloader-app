import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

export const QUEUE_NAME = 'download-queue';
export const downloadQueue = new Queue(QUEUE_NAME, { connection: redisConnection });
