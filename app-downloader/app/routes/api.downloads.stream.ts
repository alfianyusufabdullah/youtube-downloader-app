import { DownloadService } from "~/services/download.server";
import { CONFIG } from "~/lib/config";

export async function loader() {
    const headers = new Headers({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
    });

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();
            let isControllerClosed = false;

            const cleanup = () => {
                if (isControllerClosed) return;
                isControllerClosed = true;
                clearInterval(pollInterval);
                clearInterval(heartbeatInterval);
                try {
                    controller.close();
                } catch { }
            };

            const sendUpdate = async () => {
                if (isControllerClosed) return;

                try {
                    const downloadList = await DownloadService.getRecentDownloads(
                        CONFIG.SSE_RECENT_DOWNLOADS_LIMIT
                    );

                    const data = JSON.stringify(downloadList);
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                } catch (error) {
                    console.error("SSE error:", error);
                }
            };

            await sendUpdate();

            const pollInterval = setInterval(async () => {
                if (isControllerClosed) {
                    clearInterval(pollInterval);
                    return;
                }
                await sendUpdate();
            }, CONFIG.SSE_POLL_INTERVAL_MS);

            const heartbeatInterval = setInterval(() => {
                if (isControllerClosed) {
                    clearInterval(heartbeatInterval);
                    return;
                }
                try {
                    controller.enqueue(encoder.encode(": heartbeat\n\n"));
                } catch {
                    cleanup();
                }
            }, CONFIG.SSE_HEARTBEAT_INTERVAL_MS);

            return cleanup;
        },

        cancel() {
            console.log("[SSE] Client disconnected");
        },
    });

    return new Response(stream, { headers });
}
