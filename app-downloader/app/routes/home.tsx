import type { Route } from "./+types/home";
import { Form, useNavigation, useActionData } from "react-router";
import { useEffect } from "react";
import { downloadQueue } from "../lib/queue.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { toast } from "sonner";
import { Youtube, Download, Github, Heart } from "lucide-react";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Downloader - Premium YouTube Service" },
    { name: "description", content: "High-performance YouTube download service powered by BullMQ and Docker." },
  ];
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const url = formData.get("url");

  if (typeof url !== "string" || !url) {
    return { error: "Please provide a valid YouTube URL." };
  }

  // Basic URL validation
  if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
    return { error: "Only YouTube links are supported at this time." };
  }

  try {
    const job = await downloadQueue.add("download-job", { url });
    return { success: true, jobId: job.id };
  } catch (err: any) {
    return { error: `Failed to queue job: ${err.message}` };
  }
}

export default function Home() {
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const isSubmitting = navigation.state === "submitting";

  useEffect(() => {
    if (actionData?.success) {
      toast.success(`Job #${actionData.jobId} added to queue`, {
        description: "Your download will start shortly.",
      });
    } else if (actionData?.error) {
      toast.error("Error", {
        description: actionData.error,
      });
    }
  }, [actionData]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div className="absolute top-4 right-4 flex gap-2">
        <Badge variant="outline">v2.0.0</Badge>
        <Badge variant="secondary">BullMQ</Badge>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto bg-primary/10 w-12 h-12 rounded-full flex items-center justify-center mb-4">
            <Youtube className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">YT Downloader</CardTitle>
          <CardDescription>
            Enter a link to start processing
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Form method="post" className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url">YouTube URL</Label>
              <Input
                type="url"
                name="url"
                id="url"
                required
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Queueing..." : "Start Download"}
              {!isSubmitting && <Download className="ml-2 h-4 w-4" />}
            </Button>
          </Form>
        </CardContent>

        <CardFooter className="flex flex-col gap-4">
          <Separator />
          <div className="flex justify-center gap-4 text-muted-foreground">
            <Button variant="ghost" size="icon">
              <Github className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </CardFooter>
      </Card>

      <div className="mt-8 text-muted-foreground text-xs flex items-center gap-2">
        <span>© 2026 Admin</span>
        <Separator orientation="vertical" className="h-3" />
        <span>Antigravity </span>
      </div>
    </div>
  );
}
