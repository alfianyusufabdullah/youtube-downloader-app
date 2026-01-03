import { pgTable, serial, text, integer, timestamp } from 'drizzle-orm/pg-core';

export const downloads = pgTable('downloads', {
    id: serial('id').primaryKey(),
    videoId: text('video_id'),
    url: text('url').notNull(),
    title: text('title'),
    status: text('status').notNull().default('queued'), // queued, processing, completed, failed
    progress: integer('progress').default(0),
    jobId: text('job_id'),
    error: text('error'),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});

