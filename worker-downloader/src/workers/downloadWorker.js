import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { CONFIG } from '../config/constants.js';
import { QUEUE_NAME } from '../queues/downloadQueue.js';
import { runDownloaderContainer, pollContainer } from '../services/dockerService.js';
import { updateDownloadStatus, updateDownloadProgress } from '../db/index.js';

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
        let extractedTitle = null;

        try {
            // Define progress handler
            const handleProgress = async (progress, title) => {
                if (downloadId) {
                    await updateDownloadProgress(downloadId, Math.floor(progress));
                    if (title && !extractedTitle) {
                        extractedTitle = title;
                        await updateDownloadStatus(downloadId, 'processing', null, title);
                    }
                }
            };

            // Define status handler
            const handleStatus = async (status) => {
                if (downloadId) {
                    await updateDownloadStatus(downloadId, status, null, extractedTitle);
                }
            };

            container = await runDownloaderContainer(url, { id: job.id }, handleProgress, handleStatus);
            console.log(`[Job ${job.id}] Container started. Polling...`);

            const exitCode = await pollContainer(container);
            console.log(`[Job ${job.id}] Container exited with code: ${exitCode}`);

            // Cancel throttled updates
            container.cancelThrottle?.();

            // Get final title if available
            extractedTitle = container.getExtractedTitle?.() || extractedTitle;

            try {
                await container.remove();
                console.log(`[Job ${job.id}] Container removed.`);
            } catch (removeErr) {
                console.error(`[Job ${job.id}] Warning: Removal failed:`, removeErr.message);
            }

            if (exitCode !== 0) throw new Error(`Exit code ${exitCode}`);

            // Update status to completed with title
            if (downloadId) {
                await updateDownloadStatus(downloadId, 'completed', null, extractedTitle);
                await updateDownloadProgress(downloadId, 100);
            }

            return { status: 'completed', exitCode, title: extractedTitle };
        } catch (err) {
            console.error(`[Job ${job.id}] Error:`, err.message);

            // Cancel throttled updates on error
            container?.cancelThrottle?.();

            // Update status to failed with error message
            if (downloadId) {
                await updateDownloadStatus(downloadId, 'failed', err.message, extractedTitle);
            }

            throw err;
        }
    },
    {
        connection: redisConnection,
        concurrency: CONFIG.WORKER_CONCURRENCY,
    }
);

downloadWorker.on('completed', (job) => console.log(`[Job ${job.id}] has completed!`));
downloadWorker.on('failed', (job, err) => console.error(`[Job ${job?.id}] has failed: ${err.message}`));
downloadWorker.on('error', (err) => console.error('[Worker] Error:', err.message));
