import { pgTable, serial, text, integer, timestamp } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const downloads = pgTable("downloads", {
	id: serial().primaryKey().notNull(),
	url: text().notNull(),
	status: text().default('queued').notNull(),
	progress: integer().default(0),
	jobId: text("job_id"),
	error: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow(),
	title: text(),
	videoId: text("video_id"),
});
