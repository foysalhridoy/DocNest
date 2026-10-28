import { NextRequest, NextResponse } from "next/server";
import { getFileById, isFileEffectivelyPrivate } from "@/lib/supabase";
import { getDriveFileMediaStream, getDriveSlotConfig } from "@/lib/drive";
import { verifyAdminSessionFromRequest } from "@/lib/auth";
import { Readable } from "stream";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const isAdmin = await verifyAdminSessionFromRequest(req);
    const file = await getFileById(id);

    if (!file) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }

    const isEffPrivate = await isFileEffectivelyPrivate(file);

    // If private and requester is not authenticated admin, return 404 Not Found
    if (isEffPrivate && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }

    // If private file and requester is admin, stream via authenticated service account
    if (isEffPrivate && isAdmin) {
      const streamUrl = new URL(`/api/admin/file/${file.id}/stream?download=true`, req.url);
      return NextResponse.redirect(streamUrl);
    }

    const driveConfig = getDriveSlotConfig(file.drive_slot);

    // If Google Drive credentials for this slot are configured, stream from Drive
    if (driveConfig.isConfigured && !file.drive_file_id.startsWith("mock_")) {
      try {
        const stream = await getDriveFileMediaStream(file.drive_slot, file.drive_file_id);

        const safeFilename = encodeURIComponent(
          file.title.endsWith(".pdf") || file.title.endsWith(".pptx")
            ? file.title
            : `${file.title}.${file.mime_type.includes("presentation") ? "pptx" : "pdf"}`
        );

        const webStream = new ReadableStream({
          start(controller) {
            const readable = stream as Readable;
            readable.on("data", (chunk) => controller.enqueue(chunk));
            readable.on("end", () => controller.close());
            readable.on("error", (err) => controller.error(err));
          },
        });

        return new Response(webStream, {
          headers: {
            "Content-Type": file.mime_type,
            "Content-Disposition": `attachment; filename="${safeFilename}"; filename*=UTF-8''${safeFilename}`,
            "Cache-Control": "public, max-age=3600",
          },
        });
      } catch (driveErr) {
        console.warn(
          "[DocNest] Stream proxy failed, falling back to direct Drive download URL:",
          driveErr
        );
        // Fallback: direct download link since file is public
        const directUrl = `https://drive.google.com/uc?export=download&id=${file.drive_file_id}`;
        return NextResponse.redirect(directUrl);
      }
    }

    // Mock file fallback when running without Google Drive credentials
    const dummyContent = `DocNest Demo Document\n\nTitle: ${file.title}\nCategory: ${file.category}\nOriginal Format: ${file.mime_type}\n\nThis is a sample download provided by DocNest demonstration mode.`;
    return new Response(dummyContent, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(file.title)}.txt"`,
      },
    });
  } catch (err) {
    console.error("[DocNest] File download error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to download file" },
      { status: 500 }
    );
  }
}
