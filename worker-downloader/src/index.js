import { downloadWorker } from './workers/downloadWorker.js';
import { cleanupOrphanContainers } from './services/dockerService.js';
import { closePool } from './db/index.js';
import { redisConnection } from './config/redis.js';
import { QUEUE_NAME } from './queues/downloadQueue.js';

async function startup() {
    console.log('='.repeat(50));
    console.log('[Worker] YT-DLP Worker starting...');
    console.log('='.repeat(50));

    await cleanupOrphanContainers();

    console.log(`[Worker] Listening on queue: ${QUEUE_NAME}`);
    console.log('[Worker] Ready to process jobs');
}

let isShuttingDown = false;

async function gracefulShutdown(signal) {
    if (isShuttingDown) {
        console.log('[Worker] Shutdown already in progress...');
        return;
    }

    isShuttingDown = true;
    console.log('');
    console.log('='.repeat(50));
    console.log(`[Worker] ${signal} received. Shutting down gracefully...`);
    console.log('='.repeat(50));

    try {
        console.log('[Worker] Closing worker (waiting for active jobs)...');
        await downloadWorker.close();
        console.log('[Worker] Worker closed');

        await closePool();

        console.log('[Worker] Closing Redis connection...');
        await redisConnection.quit();
        console.log('[Worker] Redis connection closed');

        console.log('[Worker] Graceful shutdown complete');
        process.exit(0);
    } catch (err) {
        console.error('[Worker] Error during shutdown:', err.message);
        process.exit(1);
    }
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
    console.error('[Worker] Uncaught exception:', err);
    gracefulShutdown('UNCAUGHT_EXCEPTION');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[Worker] Unhandled rejection at:', promise, 'reason:', reason);
});

startup().catch((err) => {
    console.error('[Worker] Failed to start:', err);
    process.exit(1);
});
