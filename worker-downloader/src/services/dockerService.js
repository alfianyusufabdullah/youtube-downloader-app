import { docker } from '../config/docker.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
        await sleep(1000);
    }
}

function extractTitleFromLog(logLine) {
    // Match: [download] Destination: TITLE [videoId].extension
    const downloadMatch = logLine.match(/\[download\] Destination: (.+?) \[[a-zA-Z0-9_-]{11}\]/);
    if (downloadMatch) {
        return downloadMatch[1].trim();
    }

    // Match: [Merger] Merging formats into "TITLE [videoId].extension"
    const mergerMatch = logLine.match(/\[Merger\] Merging formats into "(.+?) \[[a-zA-Z0-9_-]{11}\]/);
    if (mergerMatch) {
        return mergerMatch[1].trim();
    }

    return null;
}

/**
 * Extract progress percentage from yt-dlp log line
 * Example: [download]   1.2% of  12.34MiB at  2.34MiB/s ETA 00:05
 * Returns: 1.2
 */
function extractProgressFromLog(logLine) {
    const match = logLine.match(/\[download\]\s+(\d+\.?\d*)%/);
    if (match) {
        return parseFloat(match[1]);
    }
    return null;
}

export async function runDownloaderContainer(url, jobDetail, onProgress, onStatus) {
    const downloadsDir = process.env.DOCKER_DOWNLOADS_PATH || process.cwd();
    console.log(`[Job ${jobDetail.id}] Processing URL: ${url}`);

    const container = await docker.createContainer({
        Image: 'yt-dlp-local',
        Cmd: [url],
        HostConfig: {
            Binds: [`${downloadsDir}:/downloads`],
            AutoRemove: false,
            NanoCpus: 1000000000,
            Memory: 512 * 1024 * 1024,
        },
    });

    // Capture logs and look for title/progress
    let extractedTitle = null;
    let lastProgress = 0;
    let hasSentMergerStatus = false;

    const stream = await container.attach({
        stream: true,
        stdout: true,
        stderr: true,
    });

    // Collect logs and extract info
    stream.on('data', (chunk) => {
        const logLine = chunk.toString();
        process.stdout.write(logLine);

        // Try to extract title if not found yet
        if (!extractedTitle) {
            const title = extractTitleFromLog(logLine);
            if (title) {
                extractedTitle = title;
                console.log(`[Job ${jobDetail.id}] Extracted title: ${title}`);
            }
        }

        // Try to extract progress
        const progress = extractProgressFromLog(logLine);
        if (progress !== null && progress !== lastProgress) {
            lastProgress = progress;
            if (onProgress) {
                onProgress(progress, extractedTitle);
            }
        }

        // Check for Merger logs
        if (!hasSentMergerStatus && logLine.includes('[Merger]')) {
            hasSentMergerStatus = true;
            console.log(`[Job ${jobDetail.id}] Detected merger phase.`);
            if (onStatus) {
                onStatus('merging');
            }
        }
    });

    await container.start();

    // Store reference to get title later
    container.getExtractedTitle = () => extractedTitle;

    return container;
}
