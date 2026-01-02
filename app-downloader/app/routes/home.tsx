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
import { Progress } from "~/components/ui/progress";
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
  title: string | null;
  status: string;
  progress: number | null;
  jobId: string | null;
  error: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

function StatusBadge({ status, progress }: { status: string; progress: number | null }) {
  switch (status) {
    case "queued":
      return (
        <Badge variant="secondary" className="font-normal text-[10px] uppercase tracking-wider px-2 py-0">
          <Clock className="mr-1 h-3 w-3 text-slate-400" />
          Queued
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="default" className="font-medium text-[10px] uppercase tracking-wider px-2 py-0 gap-1 bg-slate-900 border-none shadow-none">
          <Loader2 className="h-3 w-3 animate-spin" />
          {progress || 0}%
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className="font-medium text-[10px] uppercase tracking-wider px-2 py-0 gap-1 border-emerald-100 text-emerald-600 bg-emerald-50/50">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="font-medium text-[10px] uppercase tracking-wider px-2 py-0 gap-1 shadow-none">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline" className="text-[10px] uppercase tracking-wider px-2 py-0">{status}</Badge>;
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
        <SidebarHeader className="bg-white">
          <div className="flex items-center gap-3 px-3 py-6">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 shadow-sm">
              <Youtube className="h-5 w-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900">Media Vault</span>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.1em]">Engine v2.0</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent>
          <SidebarGroup className="px-3">
            <SidebarGroupLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-0">Add Media</SidebarGroupLabel>
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

          <SidebarGroup className="px-3">
            <SidebarGroupLabel className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 px-0">Vault Stats</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Total", value: downloadList.length },
                  { label: "Done", value: downloadList.filter(d => d.status === "completed").length },
                  { label: "Active", value: downloadList.filter(d => d.status === "processing").length },
                  { label: "Wait", value: downloadList.filter(d => d.status === "queued").length }
                ].map((stat) => (
                  <div key={stat.label} className="p-3 bg-slate-50 border border-slate-100/50 rounded-xl space-y-0.5">
                    <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-tight">{stat.label}</span>
                    <span className="block text-lg font-bold text-slate-900 leading-none">{stat.value}</span>
                  </div>
                ))}
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

        <main className="flex-1 p-8 bg-slate-50/20">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex flex-col gap-1">
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">Download Queue</h2>
              <p className="text-sm text-slate-500">History and real-time status of your video downloads.</p>
            </div>

            <Card className="border-slate-200/60 shadow-none bg-white">
              <CardContent className="p-0">
                {downloadList.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="h-12 w-12 rounded-full bg-slate-50 flex items-center justify-center mb-4 border border-slate-100">
                      <Download className="h-6 w-6 text-slate-300" />
                    </div>
                    <h3 className="text-sm font-semibold text-slate-700">No active downloads</h3>
                    <p className="mt-1 text-sm text-slate-400">Add a link in the sidebar to start a new job.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader className="bg-slate-50/50">
                      <TableRow className="border-b border-slate-100 hover:bg-transparent">
                        <TableHead className="w-[60px] text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-6 h-10">ID</TableHead>
                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 h-10">Media Details</TableHead>
                        <TableHead className="w-[140px] text-[11px] font-bold uppercase tracking-wider text-slate-400 h-10">Status</TableHead>
                        <TableHead className="w-[160px] text-right text-[11px] font-bold uppercase tracking-wider text-slate-400 pr-6 h-10">Added On</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {downloadList.map((download) => (
                        <TableRow key={download.id} className="border-b border-slate-100/60 hover:bg-slate-50/30 group transition-colors">
                          <TableCell className="font-mono text-[11px] text-slate-400 pl-6 h-16">
                            #{download.id}
                          </TableCell>
                          <TableCell className="h-16 py-0">
                            <div className="flex flex-col justify-center">
                              <span className="text-[13px] font-semibold text-slate-700 leading-tight truncate max-w-[500px]">
                                {download.title || extractVideoId(download.url) || "Resolving Metadata..."}
                              </span>
                              <div className="mt-1.5 flex flex-col gap-1">
                                {download.status === "processing" && (
                                  <Progress value={download.progress || 0} className="h-1 bg-slate-100 rounded-none w-full" />
                                )}
                                <span className="text-[10px] text-slate-400 font-medium truncate max-w-[400px]">
                                  {download.url}
                                </span>
                                {download.error && (
                                  <span className="text-[10px] font-semibold text-rose-500 mt-0.5">
                                    {download.error}
                                  </span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="h-16 py-0">
                            <StatusBadge status={download.status} progress={download.progress} />
                          </TableCell>
                          <TableCell className="text-right text-[11px] text-slate-400 pr-6 h-16 py-0">
                            {download.createdAt
                              ? new Date(download.createdAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true
                              })
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
