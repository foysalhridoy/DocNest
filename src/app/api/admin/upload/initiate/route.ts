import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSessionFromRequest } from "@/lib/auth";
import { createResumableUploadSession, getDriveSlotConfig } from "@/lib/drive";
import { validateFileType, sanitizeFilename } from "@/lib/utils";
import { MAX_FILE_SIZE_BYTES } from "@/lib/config";

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminSessionFromRequest(req);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { filename, mimeType, sizeBytes } = body;

    if (!filename || !mimeType || typeof sizeBytes !== "number") {
      return NextResponse.json(
        { success: false, error: "filename, mimeType, and sizeBytes are required" },
        { status: 400 }
      );
    }

    if (sizeBytes > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `File size exceeds the maximum limit of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`,
        },
        { status: 400 }
      );
    }

    const validation = validateFileType(filename, mimeType);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const cleanTitle = sanitizeFilename(filename);

    // Check if at least one drive is configured
    const slot1 = getDriveSlotConfig(1);
    const slot2 = getDriveSlotConfig(2);

    if (!slot1.isConfigured && !slot2.isConfigured) {
      // Mock mode for local dev when credentials are not yet set
      return NextResponse.json({
        success: true,
        data: {
          uploadUrl: "mock-resumable-url",
          driveSlot: 1,
          mock: true,
        },
      });
    }

    const session = await createResumableUploadSession({
      title: cleanTitle,
      mimeType,
      sizeBytes,
    });

    return NextResponse.json({
      success: true,
      data: session,
    });
  } catch (err) {
    console.error("[DocNest] Initiate upload error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to initiate upload session",
      },
      { status: 500 }
    );
  }
}
