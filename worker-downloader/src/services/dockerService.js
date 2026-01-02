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

export async function runDownloaderContainer(url, jobDetail) {
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

    const stream = await container.attach({
        stream: true,
        stdout: true,
        stderr: true,
    });

    container.modem.demuxStream(stream, process.stdout, process.stderr);

    await container.start();
    return container;
}
