CREATE TABLE "downloads" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" text,
	"url" text NOT NULL,
	"title" text,
	"status" text DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0,
	"job_id" text,
	"error" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
