import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSessionFromRequest } from "@/lib/auth";
import { getFileById } from "@/lib/supabase";
import { getDriveFileRangeStream, getDriveSlotConfig } from "@/lib/drive";
import { Readable } from "stream";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  // 1. Verify admin session on server
  const isAdmin = await verifyAdminSessionFromRequest(req);
  if (!isAdmin) {
    return new NextResponse("Unauthorized: Admin session required", {
      status: 401,
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  }

  try {
    const { id } = await context.params;
    const file = await getFileById(id);

    if (!file) {
      return new NextResponse("File not found", {
        status: 404,
        headers: {
          "Cache-Control": "private, no-store",
        },
      });
    }

    const { searchParams } = new URL(req.url);
    const isDownload = searchParams.get("download") === "true";
    const rangeHeader = req.headers.get("range");

    const safeFilename = encodeURIComponent(
      file.title.endsWith(".pdf") || file.title.endsWith(".pptx")
        ? file.title
        : `${file.title}.${file.mime_type.includes("presentation") ? "pptx" : "pdf"}`
    );

    const disposition = isDownload
      ? `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`
      : `inline; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`;

    const slotConfig = getDriveSlotConfig(file.drive_slot);

    // 2. Fetch from Google Drive using Service Account
    if (slotConfig.isConfigured && !file.drive_file_id.startsWith("mock_")) {
      try {
        const { stream, headers: driveHeaders, status } = await getDriveFileRangeStream(
          file.drive_slot,
          file.drive_file_id,
          rangeHeader
        );

        const responseHeaders = new Headers();
        responseHeaders.set("Content-Type", driveHeaders["content-type"] || file.mime_type);
        responseHeaders.set("Content-Disposition", disposition);
        responseHeaders.set("Cache-Control", "private, no-store");
        responseHeaders.set("Accept-Ranges", "bytes");

        if (driveHeaders["content-length"]) {
          responseHeaders.set("Content-Length", driveHeaders["content-length"]);
        }
        if (driveHeaders["content-range"]) {
          responseHeaders.set("Content-Range", driveHeaders["content-range"]);
        }

        const webStream = new ReadableStream({
          start(controller) {
            const readable = stream as Readable;
            readable.on("data", (chunk) => controller.enqueue(chunk));
            readable.on("end", () => controller.close());
            readable.on("error", (err) => controller.error(err));
          },
        });

        return new Response(webStream, {
          status: status || (rangeHeader ? 206 : 200),
          headers: responseHeaders,
        });
      } catch (driveErr) {
        console.error("[DocNest] Error streaming private file from Google Drive:", driveErr);
        return new NextResponse("Error streaming file from storage provider", {
          status: 502,
          headers: { "Cache-Control": "private, no-store" },
        });
      }
    }

    // 3. Mock mode fallback for local testing without real credentials
    const sampleBuffer = Buffer.from(
      `%PDF-1.4\n%DocNest Demo Stream for Private File: ${file.title}\nCategory: ${file.category}\nPrivate: true\n%%EOF`
    );

    if (rangeHeader && rangeHeader.startsWith("bytes=")) {
      const parts = rangeHeader.replace("bytes=", "").split("-");
      const start = parseInt(parts[0], 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : sampleBuffer.length - 1;
      const chunk = sampleBuffer.subarray(start, end + 1);

      return new Response(chunk, {
        status: 206,
        headers: {
          "Content-Type": file.mime_type,
          "Content-Range": `bytes ${start}-${end}/${sampleBuffer.length}`,
          "Content-Length": String(chunk.length),
          "Content-Disposition": disposition,
          "Accept-Ranges": "bytes",
          "Cache-Control": "private, no-store",
        },
      });
    }

    return new Response(sampleBuffer, {
      status: 200,
      headers: {
        "Content-Type": file.mime_type,
        "Content-Length": String(sampleBuffer.length),
        "Content-Disposition": disposition,
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    console.error("[DocNest] GET /api/admin/file/[id]/stream error:", err);
    return new NextResponse("Internal Server Error", {
      status: 500,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
}

