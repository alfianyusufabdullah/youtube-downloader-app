import { docker } from '../config/docker.js';
import { CONFIG } from '../config/constants.js';
import { sleep, throttle } from '../utils/index.js';
import { buildYtDlpArgs } from '../utils/commandBuilder.js';

export async function pollContainer(container) {
    while (true) {
        try {
            const data = await container.inspect();
            const status = data.State.Status;
            if (status === 'exited' || status === 'dead') {
                return data.State.ExitCode;
            }
        } catch (err) {
            if (err.statusCode === 404) {
                console.log('[Polling] Container disappeared (404). Assuming it finished.');
                return 0;
            }
            throw err;
        }
        await sleep(CONFIG.CONTAINER_POLL_INTERVAL);
    }
}

function extractTitleFromLog(logLine) {
    const downloadMatch = logLine.match(/\[download\] Destination: (.+)/);
    if (downloadMatch) {
        return downloadMatch[1].trim();
    }

    const mergerMatch = logLine.match(/\[Merger\] Merging formats into "(.+)"/);
    if (mergerMatch) {
        return mergerMatch[1].trim();
    }

    return null;
}

function extractProgressFromLog(logLine) {
    const match = logLine.match(/\[download\]\s+(\d+\.?\d*)%/);
    if (match) {
        return parseFloat(match[1]);
    }
    return null;
}

export async function cleanupOrphanContainers() {
    try {
        const containers = await docker.listContainers({
            all: true,
            filters: {
                label: [`managed-by=${CONFIG.CONTAINER_LABEL}`]
            }
        });

        if (containers.length === 0) {
            console.log('[Cleanup] No orphan containers found');
            return;
        }

        console.log(`[Cleanup] Found ${containers.length} orphan container(s), cleaning up...`);

        for (const containerInfo of containers) {
            try {
                const container = docker.getContainer(containerInfo.Id);
                const data = await container.inspect();

                if (data.State.Running) {
                    console.log(`[Cleanup] Stopping container ${containerInfo.Id.slice(0, 12)}...`);
                    await container.stop({ t: 5 });
                }

                console.log(`[Cleanup] Removing container ${containerInfo.Id.slice(0, 12)}...`);
                await container.remove({ force: true });
            } catch (err) {
                console.error(`[Cleanup] Failed to cleanup container ${containerInfo.Id.slice(0, 12)}:`, err.message);
            }
        }

        console.log('[Cleanup] Orphan container cleanup complete');
    } catch (err) {
        console.error('[Cleanup] Error during orphan container cleanup:', err.message);
    }
}

export async function runDownloaderContainer(url, jobDetail, options = {}, onProgress, onStatus) {
    const downloadsDir = process.env.DOCKER_DOWNLOADS_PATH || process.cwd();
    console.log(`[Job ${jobDetail.id}] Processing URL: ${url}`);

    const customArgs = buildYtDlpArgs(options);
    console.log(`[Job ${jobDetail.id}] yt-dlp args:`, customArgs.join(' '));

    const container = await docker.createContainer({
        Image: 'yt-dlp-local',
        Cmd: [...customArgs, url],
        Labels: {
            'managed-by': CONFIG.CONTAINER_LABEL,
            'job-id': String(jobDetail.id),
        },
        HostConfig: {
            Binds: [`${downloadsDir}:/downloads`],
            AutoRemove: false,
            NanoCpus: CONFIG.CONTAINER_CPU_LIMIT,
            Memory: CONFIG.CONTAINER_MEMORY_LIMIT,
        },
    });

    let extractedTitle = null;
    let lastProgress = 0;
    let hasSentMergerStatus = false;

    const stream = await container.attach({
        stream: true,
        stdout: true,
        stderr: true,
    });

    const throttledProgressUpdate = throttle(async (progress, title) => {
        if (onProgress) {
            await onProgress(progress, title);
        }
    }, CONFIG.PROGRESS_THROTTLE_MS);

    stream.on('data', (chunk) => {
        const logLine = chunk.toString();
        process.stdout.write(logLine);

        if (!extractedTitle) {
            const title = extractTitleFromLog(logLine);
            if (title) {
                extractedTitle = title;
                console.log(`[Job ${jobDetail.id}] Extracted title: ${title}`);
            }
        }

        const progress = extractProgressFromLog(logLine);
        if (progress !== null && progress !== lastProgress) {
            lastProgress = progress;
            throttledProgressUpdate(progress, extractedTitle);
        }

        if (!hasSentMergerStatus && logLine.includes('[Merger]')) {
            hasSentMergerStatus = true;
            console.log(`[Job ${jobDetail.id}] Detected merger phase.`);
            if (onStatus) {
                onStatus('merging');
            }
        }
    });

    await container.start();

    container.getExtractedTitle = () => extractedTitle;
    container.cancelThrottle = () => throttledProgressUpdate.cancel();

    return container;
}
