import { DownloadService } from "~/services/download.server";

export async function loader() {
    const headers = new Headers({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
    });

    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            const sendUpdate = async () => {
                try {
                    const downloadList = await DownloadService.getRecentDownloads(20);

                    const data = JSON.stringify(downloadList);
                    controller.enqueue(encoder.encode(`data: ${data}\n\n`));
                } catch (error) {
                    console.error("SSE error:", error);
                }
            };

            // Send initial data
            await sendUpdate();

            // Poll database and send updates every 2 seconds
            const interval = setInterval(sendUpdate, 2000);

            // Cleanup on close
            const cleanup = () => {
                clearInterval(interval);
                controller.close();
            };

            // Keep connection alive with heartbeat
            const heartbeat = setInterval(() => {
                try {
                    controller.enqueue(encoder.encode(": heartbeat\n\n"));
                } catch {
                    cleanup();
                }
            }, 30000);

            // Handle abort
            return () => {
                clearInterval(interval);
                clearInterval(heartbeat);
            };
        },
    });

    return new Response(stream, { headers });
}
