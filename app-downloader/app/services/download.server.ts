import { db } from "../db";
import { downloads } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export const DownloadService = {
    /**
     * Fetch recent downloads with a limit
     */
    async getRecentDownloads(limit: number = 50) {
        return await db.select()
            .from(downloads)
            .orderBy(desc(downloads.createdAt))
            .limit(limit);
    },

    /**
     * Create a new download record
     */
    async createDownload(url: string, videoId: string) {
        const [download] = await db.insert(downloads)
            .values({ url, videoId })
            .returning();
        return download;
    },

    /**
     * Check if a video has already been downloaded or is in queue
     */
    async getDownloadByVideoId(videoId: string) {
        const [download] = await db.select()
            .from(downloads)
            .where(eq(downloads.videoId, videoId))
            .limit(1);
        return download;
    },

    /**
     * Update the jobId for a specific download
     */
    async updateJobId(downloadId: number, jobId: string) {
        return await db.update(downloads)
            .set({ jobId })
            .where(eq(downloads.id, downloadId))
            .returning();
    },

    /**
     * Find a download by its job ID (useful for SSE or webhooks if needed)
     */
    async getDownloadByJobId(jobId: string) {
        const [download] = await db.select()
            .from(downloads)
            .where(eq(downloads.jobId, jobId))
            .limit(1);
        return download;
    }
};
