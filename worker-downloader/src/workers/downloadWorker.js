import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { QUEUE_NAME } from '../queues/downloadQueue.js';
import { runDownloaderContainer, pollContainer } from '../services/dockerService.js';
import { updateDownloadStatus } from '../db/index.js';

export const downloadWorker = new Worker(
    QUEUE_NAME,
    async (job) => {
        const { url, downloadId } = job.data;
        if (!url) throw new Error('No URL provided');

        // Update status to processing
        if (downloadId) {
            await updateDownloadStatus(downloadId, 'processing');
        }

        let container;
        try {
            container = await runDownloaderContainer(url, { id: job.id });
            console.log(`[Job ${job.id}] Container started. Polling...`);

            const exitCode = await pollContainer(container);
            console.log(`[Job ${job.id}] Container exited with code: ${exitCode}`);

            try {
                await container.remove();
                console.log(`[Job ${job.id}] Container removed.`);
            } catch (removeErr) {
                console.error(`[Job ${job.id}] Warning: Removal failed:`, removeErr.message);
            }

            if (exitCode !== 0) throw new Error(`Exit code ${exitCode}`);

            // Update status to completed
            if (downloadId) {
                await updateDownloadStatus(downloadId, 'completed');
            }

            return { status: 'completed', exitCode };
        } catch (err) {
            console.error(`[Job ${job.id}] Error:`, err.message);

            // Update status to failed with error message
            if (downloadId) {
                await updateDownloadStatus(downloadId, 'failed', err.message);
            }

            throw err;
        }
    },
    {
        connection: redisConnection,
        concurrency: 1,
    }
);

downloadWorker.on('completed', (job) => console.log(`[Job ${job.id}] has completed!`));
downloadWorker.on('failed', (job, err) => console.error(`[Job ${job.id}] has failed: ${err.message}`));

