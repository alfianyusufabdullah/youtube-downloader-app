import type { Route } from "./+types/home";
import { Form, useNavigation, useActionData, useLoaderData } from "react-router";
import { useEffect, useState } from "react";
import { downloadQueue } from "../lib/queue.server";
import { db } from "../db";
import { downloads } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { toast } from "sonner";
import { Youtube, Download, Clock, Loader2, CheckCircle, XCircle, Settings, History, Github, Heart } from "lucide-react";

export function meta({ }: Route.MetaArgs) {
  return [
    { title: "Downloader - Dashboard" },
    { name: "description", content: "YouTube download dashboard with queue management." },
  ];
}

export async function loader() {
  const downloadList = await db.select().from(downloads).orderBy(desc(downloads.createdAt)).limit(50);
  return { downloads: downloadList };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const url = formData.get("url");

  if (typeof url !== "string" || !url) {
    return { error: "Please provide a valid YouTube URL." };
  }

  if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
    return { error: "Only YouTube links are supported at this time." };
  }

  try {
    const [download] = await db.insert(downloads).values({ url }).returning();
    const job = await downloadQueue.add("download-job", {
      url,
      downloadId: download.id
    });
    await db.update(downloads)
      .set({ jobId: job.id })
      .where(eq(downloads.id, download.id));

    return { success: true, jobId: job.id, downloadId: download.id };
  } catch (err: any) {
    return { error: `Failed to queue job: ${err.message}` };
  }
}

type Download = {
  id: number;
  url: string;
  status: string;
  progress: number | null;
  jobId: string | null;
  error: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "queued":
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" />
          Queued
        </Badge>
      );
    case "processing":
      return (
        <Badge>
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Processing
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className="border-green-500 text-green-600">
          <CheckCircle className="mr-1 h-3 w-3" />
          Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive">
          <XCircle className="mr-1 h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function extractVideoId(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : "";
}

export default function Home() {
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const loaderData = useLoaderData<typeof loader>();
  const [downloadList, setDownloadList] = useState<Download[]>(loaderData.downloads);
  const isSubmitting = navigation.state === "submitting";

  // SSE for real-time updates
  useEffect(() => {
    const eventSource = new EventSource("/api/downloads/stream");

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setDownloadList(data);
      } catch (e) {
        console.error("Failed to parse SSE data:", e);
      }
    };

    eventSource.onerror = () => {
      console.error("SSE connection error");
      eventSource.close();
    };

    return () => eventSource.close();
  }, []);

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
    <SidebarProvider>
      <Sidebar collapsible="offcanvas">
        <SidebarHeader>
          <div className="flex items-center gap-2 px-2 py-4">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Youtube className="h-4 w-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-semibold">YT Downloader</span>
              <span className="text-xs text-muted-foreground">v2.0.0</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup>
            <SidebarGroupLabel>New Download</SidebarGroupLabel>
            <SidebarGroupContent>
              <Form method="post" className="space-y-3 px-1">
                <div className="space-y-2">
                  <Label htmlFor="url" className="text-xs">YouTube URL</Label>
                  <Input
                    type="url"
                    name="url"
                    id="url"
                    required
                    placeholder="https://youtube.com/..."
                    className="h-9"
                  />
                </div>
                <Button type="submit" className="w-full" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Queueing...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Start Download
                    </>
                  )}
                </Button>
              </Form>
            </SidebarGroupContent>
          </SidebarGroup>

          <Separator />

          <SidebarGroup>
            <SidebarGroupLabel>Statistics</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="grid grid-cols-2 gap-2 px-1">
                <Card>
                  <CardContent className="p-3">
                    <div className="text-2xl font-bold">{downloadList.length}</div>
                    <div className="text-xs text-muted-foreground">Total</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-2xl font-bold">
                      {downloadList.filter(d => d.status === "completed").length}
                    </div>
                    <div className="text-xs text-muted-foreground">Completed</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-2xl font-bold">
                      {downloadList.filter(d => d.status === "processing").length}
                    </div>
                    <div className="text-xs text-muted-foreground">Processing</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-3">
                    <div className="text-2xl font-bold">
                      {downloadList.filter(d => d.status === "queued").length}
                    </div>
                    <div className="text-xs text-muted-foreground">Queued</div>
                  </CardContent>
                </Card>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter>
          <div className="flex items-center justify-center gap-2 p-2">
            <Button variant="ghost" size="icon">
              <Github className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Heart className="h-4 w-4" />
            </Button>
          </div>
          <div className="px-2 py-2 text-center text-xs text-muted-foreground">
            © 2026 Antigravity
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b px-6">
          <SidebarTrigger />
          <Separator orientation="vertical" className="h-6" />
          <div className="flex items-center gap-2">
            <History className="h-4 w-4" />
            <h1 className="font-semibold">Download Queue</h1>
          </div>
          <div className="ml-auto">
            <Badge variant="outline">
              {downloadList.filter(d => d.status === "processing" || d.status === "queued").length} active
            </Badge>
          </div>
        </header>

        <main className="flex-1 p-6">
          <Card>
            <CardHeader>
              <CardTitle>Recent Downloads</CardTitle>
              <CardDescription>
                Monitor your download queue in real-time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {downloadList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Download className="h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">No downloads yet</h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Add a YouTube URL in the sidebar to get started
                  </p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[80px]">ID</TableHead>
                      <TableHead>Video</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Job ID</TableHead>
                      <TableHead className="text-right">Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {downloadList.map((download) => (
                      <TableRow key={download.id}>
                        <TableCell className="font-medium">#{download.id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-sm">
                              {extractVideoId(download.url) || "Unknown"}
                            </span>
                            {download.error && (
                              <span className="text-xs text-destructive">{download.error}</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={download.status} />
                        </TableCell>
                        <TableCell className="font-mono text-sm text-muted-foreground">
                          {download.jobId || "-"}
                        </TableCell>
                        <TableCell className="text-right text-sm text-muted-foreground">
                          {download.createdAt
                            ? new Date(download.createdAt).toLocaleString()
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
