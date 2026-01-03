import type { Route } from "./+types/home";
import { Form, useNavigation, useActionData, useLoaderData } from "react-router";
import { useEffect, useState } from "react";
import { downloadQueue } from "../lib/queue.server";
import { DownloadService } from "../services/download.server";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
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
  const downloadList = await DownloadService.getRecentDownloads(50);
  return { downloads: downloadList };
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const url = formData.get("url");

  if (typeof url !== "string" || !url) {
    return { error: "Please provide a valid YouTube URL." };
  }

  const videoId = extractVideoId(url);
  if (!videoId) {
    return { error: "Could not extract a valid YouTube video ID from the provided link." };
  }

  // Check if already exists
  const existing = await DownloadService.getDownloadByVideoId(videoId);
  if (existing) {
    if (existing.status === "completed") {
      return { error: "This video has already been downloaded and is in your vault." };
    }
    return { error: "This video is already in the queue or is currently being synced." };
  }

  try {
    const download = await DownloadService.createDownload(url, videoId);
    const job = await downloadQueue.add("download-job", {
      url,
      downloadId: download.id
    });
    await DownloadService.updateJobId(download.id, job.id as string);

    return { success: true, jobId: job.id, downloadId: download.id };
  } catch (err: any) {
    return { error: `Failed to queue job: ${err.message}` };
  }
}

type Download = {
  id: number;
  videoId: string | null;
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
        <Badge variant="secondary" className="bg-slate-100 text-slate-500 border-none font-medium px-2 py-0.5 rounded-full text-[11px]">
          <Clock className="mr-1 h-3 w-3" />
          Queued
        </Badge>
      );
    case "processing":
      return (
        <Badge variant="default" className="bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-50 shadow-none font-medium px-2 py-0.5 rounded-full text-[11px] gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          {progress || 0}%
        </Badge>
      );
    case "completed":
      return (
        <Badge variant="outline" className="bg-emerald-50 text-emerald-600 border-emerald-100 font-medium px-2 py-0.5 rounded-full text-[11px] gap-1.5">
          <CheckCircle className="h-3 w-3" />
          Completed
        </Badge>
      );
    case "failed":
      return (
        <Badge variant="destructive" className="bg-rose-50 text-rose-600 border-rose-100 border hover:bg-rose-50 shadow-none font-medium px-2 py-0.5 rounded-full text-[11px] gap-1.5">
          <XCircle className="h-3 w-3" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="outline" className="font-medium px-2 py-0.5 rounded-full text-[11px]">{status}</Badge>;
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
      toast.success("Job synchronized", {
        description: "Your download has been added to the vault.",
        className: "bg-white border-slate-100 text-slate-900 border shadow-lg rounded-2xl",
      });
    } else if (actionData?.error) {
      toast.error("Process failed", {
        description: actionData.error,
      });
    }
  }, [actionData]);

  return (
    <SidebarProvider>
      <Sidebar collapsible="offcanvas" className="border-r border-slate-100 bg-slate-50/50 backdrop-blur-sm">
        <SidebarHeader className="bg-transparent">
          <div className="flex items-center gap-3 px-4 py-8">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-xl shadow-indigo-200">
              <Youtube className="h-5 w-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight text-slate-900">Media Vault</span>
              <span className="text-[11px] font-medium text-slate-400">Library Sync</span>
            </div>
          </div>
        </SidebarHeader>

        <SidebarContent className="bg-transparent">
          <SidebarGroup className="px-6 py-2">
            <SidebarGroupLabel className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Ingest</SidebarGroupLabel>
            <SidebarGroupContent>
              <Form method="post" className="space-y-4">
                <div className="space-y-2">
                  <Input
                    type="url"
                    name="url"
                    id="url"
                    required
                    placeholder="Capture URL..."
                    className="h-10 text-sm bg-white border-slate-200 focus-visible:ring-indigo-500/10 transition-all rounded-xl"
                  />
                </div>
                <Button type="submit" className="w-full h-10 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-100 transition-all border-none" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Sync to Ingest
                    </>
                  )}
                </Button>
              </Form>
            </SidebarGroupContent>
          </SidebarGroup>

          <Separator className="my-6 mx-6 bg-slate-200/50" />

          <SidebarGroup className="px-6">
            <SidebarGroupLabel className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Vault Overview</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Total", value: downloadList.length, color: "bg-slate-900" },
                  { label: "Done", value: downloadList.filter(d => d.status === "completed").length, color: "bg-emerald-500" },
                  { label: "Live", value: downloadList.filter(d => d.status === "processing").length, color: "bg-indigo-500" },
                  { label: "Queue", value: downloadList.filter(d => d.status === "queued").length, color: "bg-slate-400" }
                ].map((stat) => (
                  <div key={stat.label} className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-100 transition-all group">
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className={`h-1.5 w-1.5 rounded-full ${stat.color} opacity-40`} />
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">{stat.label}</span>
                    </div>
                    <span className="text-xl font-bold text-slate-900 leading-none">{stat.value}</span>
                  </div>
                ))}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="py-8 bg-transparent text-center">
          <div className="px-6 py-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 mx-6">
            <p className="text-[10px] font-medium text-indigo-600">Enterprise Engine</p>
            <p className="text-[9px] text-indigo-400 mt-0.5">Build v2.1.0-sophia</p>
          </div>
        </SidebarFooter>
      </Sidebar>

      <SidebarInset className="bg-white">
        <header className="flex h-16 items-center gap-4 px-8 bg-white/80 backdrop-blur-xl border-b border-slate-50 sticky top-0 z-10">
          <SidebarTrigger className="h-9 w-9 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all" />
          <Separator orientation="vertical" className="h-5 bg-slate-100" />
          <div className="flex items-center gap-3">
            <div className="h-6 w-6 rounded-md bg-slate-50 flex items-center justify-center border border-slate-100">
              <History className="h-3.5 w-3.5 text-slate-400" />
            </div>
            <h1 className="text-sm font-bold text-slate-900 tracking-tight">Resource Management</h1>
          </div>
          <div className="ml-auto">
            <div className="flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-100 transition-all">
              <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-[11px] font-bold uppercase tracking-wider">Engine Live</span>
            </div>
          </div>
        </header>

        <main className="flex-1 p-8 bg-[#fafbff]">
          <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-end justify-between">
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight text-slate-900">Download Queue</h2>
                <p className="text-sm font-medium text-slate-500">Real-time status of persistent download jobs.</p>
              </div>
            </div>

            <div className="bg-white border border-slate-200/60 rounded-[2rem] shadow-xl shadow-slate-200/20 overflow-hidden">
              {downloadList.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-32 text-center">
                  <div className="h-20 w-20 rounded-full bg-slate-50 flex items-center justify-center mb-6">
                    <Download className="h-8 w-8 text-slate-200" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">No active resources</h3>
                  <p className="mt-2 text-sm text-slate-400 max-w-sm">Capture a URL from the sidebar to begin populating your media vault.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/40 border-b border-slate-100">
                    <TableRow className="hover:bg-transparent border-none">
                      <TableHead className="w-[100px] text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-8 h-12">Registry ID</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 h-12">Media Metadata</TableHead>
                      <TableHead className="w-[160px] text-[11px] font-bold uppercase tracking-wider text-slate-400 h-12">Operational Status</TableHead>
                      <TableHead className="w-[180px] text-right text-[11px] font-bold uppercase tracking-wider text-slate-400 pr-8 h-12">Captured At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {downloadList.map((download) => (
                      <TableRow key={download.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                        <TableCell className="font-mono text-xs font-semibold text-slate-400 pl-8 h-20">
                          #{String(download.id).padStart(4, '0')}
                        </TableCell>
                        <TableCell className="h-20 py-0">
                          <div className="flex flex-col">
                            <span className="text-[15px] font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors truncate max-w-[500px]">
                              {download.title || extractVideoId(download.url) || "Awaiting Title Metadata..."}
                            </span>
                            <div className="mt-2 flex flex-col gap-1.5">
                              {download.status === "processing" && (
                                <div className="w-full max-w-[300px]">
                                  <Progress value={download.progress || 0} className="h-1.5 bg-slate-100 rounded-full" />
                                </div>
                              )}
                              <span className="text-[11px] font-medium text-slate-400 truncate max-w-[450px]">
                                {download.url}
                              </span>
                              {download.error && (
                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-rose-500 mt-1">
                                  <span className="h-1 w-1 rounded-full bg-rose-500" />
                                  Error: {download.error}
                                </div>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="h-20 py-0">
                          <StatusBadge status={download.status} progress={download.progress} />
                        </TableCell>
                        <TableCell className="text-right text-[12px] font-medium text-slate-500 pr-8 h-20 py-0">
                          {download.createdAt
                            ? new Date(download.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
