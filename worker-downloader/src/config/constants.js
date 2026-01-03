export const CONFIG = {
    WORKER_CONCURRENCY: 5,
    CONTAINER_CPU_LIMIT: 1 * 1e9,
    CONTAINER_MEMORY_LIMIT: 512 * 1024 * 1024,
    CONTAINER_LABEL: 'yt-dlp-worker',
    CONTAINER_POLL_INTERVAL: 1000,
    PROGRESS_THROTTLE_MS: 1000,
    JOB_MAX_ATTEMPTS: 3,
    JOB_BACKOFF_DELAY: 5000,
    JOB_BACKOFF_TYPE: 'exponential',
    DB_POOL_MAX: 10,
    DB_IDLE_TIMEOUT_MS: 30000,
    DB_CONNECTION_TIMEOUT_MS: 5000,
    REDIS_RETRY_DELAY_MS: 50,
    REDIS_MAX_RETRY_DELAY_MS: 2000,

    QUALITY_PRESETS: {
        'best': 'bestvideo+bestaudio/best',
        '1080p': 'bestvideo[height<=1080]+bestaudio/best[height<=1080]',
        '720p': 'bestvideo[height<=720]+bestaudio/best[height<=720]',
        '480p': 'bestvideo[height<=480]+bestaudio/best[height<=480]',
        '360p': 'bestvideo[height<=360]+bestaudio/best[height<=360]',
    },

    AUDIO_FORMATS: ['mp3', 'm4a', 'opus', 'wav', 'aac', 'flac'],
    VIDEO_FORMATS: ['mp4', 'mkv', 'webm'],
    DEFAULT_SUBTITLE_LANG: 'en',
};
