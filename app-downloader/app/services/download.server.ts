import { db } from "../db";
import { downloads } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export interface DownloadOptions {
    quality?: 'best' | '1080p' | '720p' | '480p' | '360p';
    format?: 'mp4' | 'mkv' | 'webm';
    audioOnly?: boolean;
    audioFormat?: 'mp3' | 'm4a' | 'opus' | 'wav';
    downloadSubtitles?: boolean;
    subtitleLanguage?: string;
    embedSubtitles?: boolean;
    downloadThumbnail?: boolean;
    embedThumbnail?: boolean;
}

export const DownloadService = {
    async getRecentDownloads(limit: number = 50) {
        return await db.select()
            .from(downloads)
            .orderBy(desc(downloads.createdAt))
            .limit(limit);
    },

    async createDownload(url: string, videoId: string, options: DownloadOptions = {}) {
        const [download] = await db.insert(downloads)
            .values({
                url,
                videoId,
                quality: options.quality || 'best',
                format: options.format || 'mp4',
                audioOnly: options.audioOnly || false,
                audioFormat: options.audioFormat,
                downloadSubtitles: options.downloadSubtitles || false,
                subtitleLanguage: options.subtitleLanguage,
                embedSubtitles: options.embedSubtitles || false,
                downloadThumbnail: options.downloadThumbnail || false,
                embedThumbnail: options.embedThumbnail || false,
            })
            .returning();
        return download;
    },

    async getDownloadByVideoId(videoId: string) {
        const [download] = await db.select()
            .from(downloads)
            .where(eq(downloads.videoId, videoId))
            .limit(1);
        return download;
    },

    async updateJobId(downloadId: number, jobId: string) {
        return await db.update(downloads)
            .set({ jobId })
            .where(eq(downloads.id, downloadId))
            .returning();
    },

    async getDownloadByJobId(jobId: string) {
        const [download] = await db.select()
            .from(downloads)
            .where(eq(downloads.jobId, jobId))
            .limit(1);
        return download;
    },

    async getDownloadById(id: number) {
        const [download] = await db.select()
            .from(downloads)
            .where(eq(downloads.id, id))
            .limit(1);
        return download;
    }
};
