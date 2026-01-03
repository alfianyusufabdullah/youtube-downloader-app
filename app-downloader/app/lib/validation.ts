import { CONFIG } from './config';

export interface ValidationResult {
    valid: boolean;
    sanitizedUrl?: string;
    videoId?: string;
    error?: string;
}

export function validateAndSanitizeUrl(url: string): ValidationResult {
    const trimmedUrl = url.trim();

    if (!trimmedUrl) {
        return { valid: false, error: 'URL cannot be empty' };
    }

    let parsed: URL;
    try {
        parsed = new URL(trimmedUrl);
    } catch {
        return { valid: false, error: 'Invalid URL format' };
    }

    if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { valid: false, error: 'Only HTTP and HTTPS URLs are allowed' };
    }

    const hostname = parsed.hostname.toLowerCase();
    if (!CONFIG.ALLOWED_HOSTS.includes(hostname)) {
        return {
            valid: false,
            error: `Only YouTube URLs are allowed. Supported: ${CONFIG.ALLOWED_HOSTS.join(', ')}`
        };
    }

    const videoId = extractVideoId(trimmedUrl);
    if (!videoId) {
        return {
            valid: false,
            error: 'Could not extract a valid YouTube video ID from the URL'
        };
    }

    const sanitizedUrl = parsed.href;

    return {
        valid: true,
        sanitizedUrl,
        videoId,
    };
}

export function extractVideoId(url: string): string | null {
    const watchMatch = url.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];

    const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];

    const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
    if (embedMatch) return embedMatch[1];

    const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];

    const liveMatch = url.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
    if (liveMatch) return liveMatch[1];

    return null;
}
