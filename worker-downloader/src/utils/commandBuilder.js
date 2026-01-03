import { CONFIG } from '../config/constants.js';

export function buildYtDlpArgs(options = {}) {
    const args = [];

    // Continue on errors (e.g., subtitle download fails due to rate limit)
    args.push('--ignore-errors');

    if (options.audioOnly) {
        args.push('-x');
        if (options.audioFormat && CONFIG.AUDIO_FORMATS.includes(options.audioFormat)) {
            args.push('--audio-format', options.audioFormat);
        }
        args.push('--audio-quality', '0');
    } else {
        const quality = options.quality || 'best';
        const formatSelector = CONFIG.QUALITY_PRESETS[quality] || CONFIG.QUALITY_PRESETS['best'];
        args.push('-f', formatSelector);

        const format = options.format || 'mp4';
        if (CONFIG.VIDEO_FORMATS.includes(format)) {
            args.push('--merge-output-format', format);
        }
    }

    if (options.downloadSubtitles) {
        args.push('--write-subs');
        args.push('--write-auto-subs');

        const lang = options.subtitleLanguage || CONFIG.DEFAULT_SUBTITLE_LANG;
        args.push('--sub-langs', lang);

        if (options.embedSubtitles && !options.audioOnly) {
            args.push('--embed-subs');
        }
    }

    if (options.downloadThumbnail) {
        args.push('--write-thumbnail');

        if (options.embedThumbnail) {
            args.push('--embed-thumbnail');
        }
    }

    return args;
}
