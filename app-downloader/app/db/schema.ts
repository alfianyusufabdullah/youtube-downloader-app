import { pgTable, serial, text, integer, timestamp, index } from 'drizzle-orm/pg-core';

export const downloads = pgTable('downloads', {
    id: serial('id').primaryKey(),
    videoId: text('video_id'),
    url: text('url').notNull(),
    title: text('title'),
    status: text('status').notNull().default('queued'),
    progress: integer('progress').default(0),
    jobId: text('job_id'),
    error: text('error'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
}, (table) => [
    index('downloads_video_id_idx').on(table.videoId),
    index('downloads_status_idx').on(table.status),
    index('downloads_created_at_idx').on(table.createdAt),
    index('downloads_job_id_idx').on(table.jobId),
]);
