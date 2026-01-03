import type { Route } from "./+types/home";
import { Form, useNavigation, useActionData, useLoaderData } from "react-router";
import { useEffect, useState } from "react";
import { downloadQueue } from "../lib/queue.server";
import { DownloadService, type DownloadOptions } from "../services/download.server";
import { validateAndSanitizeUrl, extractVideoId } from "../lib/validation";
import { checkRateLimit } from "../lib/config";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Badge } from "~/components/ui/badge";
import { Separator } from "~/components/ui/separator";
import { Label } from "~/components/ui/label";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
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
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "~/components/ui/sidebar";
import { toast } from "sonner";
import { Youtube, Download, Loader2, CheckCircle, XCircle, History, Music, Subtitles, ImageIcon, Clock, Cog, RotateCcw, FileVideo, FileAudio } from "lucide-react";

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

  // Rate limiting (using IP from request headers or fallback)
  const clientId = request.headers.get("x-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "anonymous";
  const rateLimit = checkRateLimit(clientId);
  if (!rateLimit.allowed) {
    const resetIn = Math.ceil((rateLimit.resetAt - Date.now()) / 1000);
    return { error: `Rate limit exceeded. Please try again in ${resetIn} seconds.` };
  }

  // Validate and sanitize URL
  const validation = validateAndSanitizeUrl(url);
  if (!validation.valid) {
    return { error: validation.error };
  }

  const { sanitizedUrl, videoId } = validation;

  // Check if same video is currently in progress (queued or processing)
  const existing = await DownloadService.getDownloadByVideoId(videoId!);
  if (existing && (existing.status === "queued" || existing.status === "processing" || existing.status === "merging")) {
    return { error: "This video is already in the queue or is currently being synced." };
  }

  try {
    const options: DownloadOptions = {
      quality: (formData.get("quality") as DownloadOptions['quality']) || 'best',
      format: (formData.get("format") as DownloadOptions['format']) || 'mp4',
      audioOnly: formData.get("audioOnly") === 'on',
      audioFormat: (formData.get("audioFormat") as DownloadOptions['audioFormat']) || undefined,
      downloadSubtitles: formData.get("downloadSubtitles") === 'on',
      subtitleLanguage: (formData.get("subtitleLanguage") as string) || 'en',
      embedSubtitles: formData.get("embedSubtitles") === 'on',
      downloadThumbnail: formData.get("downloadThumbnail") === 'on',
      embedThumbnail: formData.get("embedThumbnail") === 'on',
    };

    const download = await DownloadService.createDownload(sanitizedUrl!, videoId!, options);
    const job = await downloadQueue.add("download-job", {
      url: sanitizedUrl,
      downloadId: download.id,
      options,
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
  quality: string | null;
  format: string | null;
  audioOnly: boolean | null;
  audioFormat: string | null;
  fileName: string | null;
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
    case "merging":
      return (
        <Badge variant="default" className="bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-50 shadow-none font-medium px-2 py-0.5 rounded-full text-[11px] gap-1.5">
          <Cog className="h-3 w-3 animate-spin" />
          Merging Video
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


export default function Home() {
  const navigation = useNavigation();
  const actionData = useActionData<typeof action>();
  const loaderData = useLoaderData<typeof loader>();
  const [downloadList, setDownloadList] = useState<Download[]>(loaderData.downloads);
  const isSubmitting = navigation.state === "submitting";
  const [audioOnly, setAudioOnly] = useState(false);
  const [downloadSubtitles, setDownloadSubtitles] = useState(false);
  const [downloadThumbnail, setDownloadThumbnail] = useState(false);

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
        className: "bg-white border-slate-100 text-slate-900 border shadow-2xl rounded-2xl p-4",
        descriptionClassName: "text-slate-500 font-medium",
      });
    } else if (actionData?.error) {
      toast.error("Process failed", {
        description: actionData.error,
        className: "bg-white border-slate-100 text-slate-900 border shadow-2xl rounded-2xl p-4",
        descriptionClassName: "text-rose-500 font-medium",
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
            <SidebarGroupLabel className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-4">Queue</SidebarGroupLabel>
            <SidebarGroupContent>
              <Form method="post" className="space-y-4">
                <Input
                  type="url"
                  name="url"
                  id="url"
                  required
                  placeholder="Paste YouTube URL..."
                  className="h-11 text-sm bg-white border-slate-200 focus-visible:ring-indigo-500/20 transition-all rounded-xl"
                />

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5 block">Quality</Label>
                      <Select name="quality" defaultValue="best" disabled={audioOnly}>
                        <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-lg">
                          <SelectValue placeholder="Quality" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="best">Best</SelectItem>
                          <SelectItem value="1080p">1080p</SelectItem>
                          <SelectItem value="720p">720p</SelectItem>
                          <SelectItem value="480p">480p</SelectItem>
                          <SelectItem value="360p">360p</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-[10px] font-semibold text-slate-400 uppercase mb-1.5 block">Format</Label>
                      <Select name="format" defaultValue="mp4" disabled={audioOnly}>
                        <SelectTrigger className="h-9 text-xs bg-white border-slate-200 rounded-lg">
                          <SelectValue placeholder="Format" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mp4">MP4</SelectItem>
                          <SelectItem value="mkv">MKV</SelectItem>
                          <SelectItem value="webm">WebM</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                      <Checkbox
                        id="audioOnly"
                        name="audioOnly"
                        checked={audioOnly}
                        onCheckedChange={(checked) => setAudioOnly(checked as boolean)}
                        className="data-[state=checked]:bg-indigo-600"
                      />
                      <label htmlFor="audioOnly" className="flex-1 cursor-pointer">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Music className="h-3.5 w-3.5 text-indigo-500" />
                          Audio Only
                        </span>
                      </label>
                      {audioOnly && (
                        <Select name="audioFormat" defaultValue="mp3">
                          <SelectTrigger className="h-7 w-20 text-xs bg-slate-100 border-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mp3">MP3</SelectItem>
                            <SelectItem value="m4a">M4A</SelectItem>
                            <SelectItem value="opus">Opus</SelectItem>
                            <SelectItem value="wav">WAV</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                      <Checkbox
                        id="downloadSubtitles"
                        name="downloadSubtitles"
                        checked={downloadSubtitles}
                        onCheckedChange={(checked) => setDownloadSubtitles(checked as boolean)}
                        className="data-[state=checked]:bg-indigo-600"
                      />
                      <label htmlFor="downloadSubtitles" className="flex-1 cursor-pointer">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <Subtitles className="h-3.5 w-3.5 text-indigo-500" />
                          Subtitles
                        </span>
                      </label>
                      {downloadSubtitles && (
                        <Input
                          name="subtitleLanguage"
                          defaultValue="en"
                          className="h-7 w-16 px-2 text-xs bg-slate-100 border-0 rounded-md"
                        />
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 p-2.5 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50/30 transition-all">
                      <Checkbox
                        id="downloadThumbnail"
                        name="downloadThumbnail"
                        checked={downloadThumbnail}
                        onCheckedChange={(checked) => setDownloadThumbnail(checked as boolean)}
                        className="data-[state=checked]:bg-indigo-600"
                      />
                      <label htmlFor="downloadThumbnail" className="cursor-pointer">
                        <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                          <ImageIcon className="h-3.5 w-3.5 text-indigo-500" />
                          Thumbnail
                        </span>
                      </label>
                    </div>

                    {(downloadSubtitles || downloadThumbnail) && !audioOnly && (
                      <div className="flex gap-4 pl-2 pt-1">
                        {downloadSubtitles && (
                          <div className="flex items-center gap-1.5">
                            <Checkbox id="embedSubtitles" name="embedSubtitles" className="h-3.5 w-3.5" />
                            <label htmlFor="embedSubtitles" className="text-[10px] text-slate-500 cursor-pointer">Embed subs</label>
                          </div>
                        )}
                        {downloadThumbnail && (
                          <div className="flex items-center gap-1.5">
                            <Checkbox id="embedThumbnail" name="embedThumbnail" className="h-3.5 w-3.5" />
                            <label htmlFor="embedThumbnail" className="text-[10px] text-slate-500 cursor-pointer">Embed cover</label>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <Button type="submit" className="w-full h-11 text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-all border-none" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Add to Queue
                    </>
                  )}
                </Button>
              </Form>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
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
              <div className="flex gap-3">
                {[
                  { label: "Total", value: downloadList.length, color: "bg-slate-500" },
                  { label: "Done", value: downloadList.filter(d => d.status === "completed").length, color: "bg-emerald-500" },
                  { label: "Active", value: downloadList.filter(d => d.status === "processing" || d.status === "merging").length, color: "bg-indigo-500" },
                  { label: "Queue", value: downloadList.filter(d => d.status === "queued").length, color: "bg-amber-500" }
                ].map((stat) => (
                  <div key={stat.label} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200/60 rounded-xl shadow-sm">
                    <div className={`h-2 w-2 rounded-full ${stat.color}`} />
                    <span className="text-xs font-medium text-slate-500">{stat.label}</span>
                    <span className="text-sm font-bold text-slate-900">{stat.value}</span>
                  </div>
                ))}
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
                      <TableHead className="w-25 text-[11px] font-bold uppercase tracking-wider text-slate-400 pl-8 h-12">Registry ID</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-slate-400 h-12">Media Metadata</TableHead>
                      <TableHead className="w-40 text-[11px] font-bold uppercase tracking-wider text-slate-400 h-12">Operational Status</TableHead>
                      <TableHead className="w-45 text-right text-[11px] font-bold uppercase tracking-wider text-slate-400 pr-8 h-12">Captured At</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {downloadList.map((download) => (
                      <TableRow key={download.id} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors group">
                        <TableCell className="font-mono text-xs font-semibold text-slate-400 pl-8 h-20">
                          <div className="flex flex-col gap-1">
                            <span>#{String(download.id).padStart(4, '0')}</span>
                            <div className="flex items-center gap-1">
                              {download.audioOnly ? (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-purple-50 text-purple-600 border-purple-200">
                                  <FileAudio className="h-2.5 w-2.5 mr-0.5" />
                                  {download.audioFormat?.toUpperCase() || 'MP3'}
                                </Badge>
                              ) : (
                                <Badge variant="secondary" className="text-[9px] px-1.5 py-0 bg-blue-50 text-blue-600 border-blue-200">
                                  <FileVideo className="h-2.5 w-2.5 mr-0.5" />
                                  {download.quality || 'best'}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="h-20 py-0">
                          <div className="flex flex-col">
                            <span className="text-[15px] font-bold text-slate-800 leading-tight group-hover:text-indigo-600 transition-colors truncate max-w-125">
                              {download.title || extractVideoId(download.url) || "Awaiting Title Metadata..."}
                            </span>
                            <div className="mt-2 flex flex-col gap-1.5">
                              {download.status === "processing" && (
                                <div className="w-full max-w-75">
                                  <Progress value={download.progress || 0} className="h-1.5 bg-slate-100 rounded-full" />
                                </div>
                              )}
                              <span className="text-[11px] font-medium text-slate-400 truncate max-w-112.5">
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
                          <div className="flex items-center gap-2">
                            <StatusBadge status={download.status} progress={download.progress} />
                            {download.status === "completed" && (
                              <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50">
                                <a href={`/api/download/${download.id}`} download={download.fileName || "video"}>
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </a>
                              </Button>
                            )}
                            {download.status === "failed" && (
                              <Form method="post" className="inline">
                                <input type="hidden" name="url" value={download.url} />
                                <input type="hidden" name="quality" value={download.quality || 'best'} />
                                <input type="hidden" name="format" value={download.format || 'mp4'} />
                                {download.audioOnly && <input type="hidden" name="audioOnly" value="on" />}
                                {download.audioFormat && <input type="hidden" name="audioFormat" value={download.audioFormat} />}
                                <Button type="submit" variant="ghost" size="sm" className="h-7 px-2 text-xs text-slate-500 hover:text-indigo-600">
                                  <RotateCcw className="h-3 w-3 mr-1" />
                                  Retry
                                </Button>
                              </Form>
                            )}
                          </div>
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
