import { pgTable, serial, text, integer, timestamp, index, boolean, bigint } from 'drizzle-orm/pg-core';

export const downloads = pgTable('downloads', {
    id: serial('id').primaryKey(),
    videoId: text('video_id'),
    url: text('url').notNull(),
    title: text('title'),
    status: text('status').notNull().default('queued'),
    progress: integer('progress').default(0),
    jobId: text('job_id'),
    error: text('error'),

    quality: text('quality').default('best'),
    format: text('format').default('mp4'),
    audioOnly: boolean('audio_only').default(false),
    audioFormat: text('audio_format'),
    downloadSubtitles: boolean('download_subtitles').default(false),
    subtitleLanguage: text('subtitle_language'),
    embedSubtitles: boolean('embed_subtitles').default(false),
    downloadThumbnail: boolean('download_thumbnail').default(false),
    embedThumbnail: boolean('embed_thumbnail').default(false),

    fileSize: bigint('file_size', { mode: 'number' }),
    duration: integer('duration'),
    resolution: text('resolution'),
    fileName: text('file_name'),

    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
    index('downloads_video_id_idx').on(table.videoId),
    index('downloads_status_idx').on(table.status),
    index('downloads_created_at_idx').on(table.createdAt),
    index('downloads_job_id_idx').on(table.jobId),
]);

export type Download = typeof downloads.$inferSelect;
export type NewDownload = typeof downloads.$inferInsert;
