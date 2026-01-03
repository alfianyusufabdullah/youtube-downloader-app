ALTER TABLE "downloads" ADD COLUMN "quality" text DEFAULT 'best';--> statement-breakpoint
ALTER TABLE "downloads" ADD COLUMN "format" text DEFAULT 'mp4';--> statement-breakpoint
ALTER TABLE "downloads" ADD COLUMN "audio_only" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "downloads" ADD COLUMN "audio_format" text;--> statement-breakpoint
ALTER TABLE "downloads" ADD COLUMN "download_subtitles" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "downloads" ADD COLUMN "subtitle_language" text;--> statement-breakpoint
ALTER TABLE "downloads" ADD COLUMN "embed_subtitles" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "downloads" ADD COLUMN "download_thumbnail" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "downloads" ADD COLUMN "embed_thumbnail" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "downloads" ADD COLUMN "file_size" bigint;--> statement-breakpoint
ALTER TABLE "downloads" ADD COLUMN "duration" integer;--> statement-breakpoint
ALTER TABLE "downloads" ADD COLUMN "resolution" text;--> statement-breakpoint
CREATE INDEX "downloads_video_id_idx" ON "downloads" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "downloads_status_idx" ON "downloads" USING btree ("status");--> statement-breakpoint
CREATE INDEX "downloads_created_at_idx" ON "downloads" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "downloads_job_id_idx" ON "downloads" USING btree ("job_id");