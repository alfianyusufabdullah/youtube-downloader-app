import { type LoaderFunctionArgs } from "react-router";
import { DownloadService } from "~/services/download.server";
import fs from "fs";
import path from "path";

export async function loader({ params }: LoaderFunctionArgs) {
    const downloadId = parseInt(params.id!);
    if (isNaN(downloadId)) {
        return new Response("Invalid ID", { status: 400 });
    }

    const download = await DownloadService.getDownloadById(downloadId);
    if (!download || !download.fileName) {
        return new Response("File not found or not ready", { status: 404 });
    }

    const downloadsDir = "/downloads";
    const filePath = path.join(downloadsDir, download.fileName);

    if (!fs.existsSync(filePath)) {
        return new Response("Physical file not found on server", { status: 404 });
    }

    const stat = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath);

    return new Response(fileStream as any, {
        status: 200,
        headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${encodeURIComponent(download.fileName)}"`,
            "Content-Length": stat.size.toString(),
        },
    });
}
