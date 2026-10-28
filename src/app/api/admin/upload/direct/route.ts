import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSessionFromRequest } from "@/lib/auth";
import { getDriveClient, getTargetDriveSlot, makeFilePublic, getDriveSlotConfig } from "@/lib/drive";
import { createFileRecord, isFolderEffectivelyPrivate } from "@/lib/supabase";
import { validateFileType, sanitizeFilename } from "@/lib/utils";
import { DIRECT_UPLOAD_MAX_BYTES } from "@/lib/config";
import { Readable } from "stream";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const isAdmin = await verifyAdminSessionFromRequest(req);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required" },
      { status: 401 }
    );
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const customTitle = formData.get("title") as string | null;
    const category = (formData.get("category") as string | null) || "General";
    const folderId = (formData.get("folderId") as string | null) || (formData.get("folder_id") as string | null);
    const isPrivateRaw = formData.get("isPrivate") || formData.get("is_private");
    let isEffectivelyPrivate = isPrivateRaw === "true";

    const targetFolderId = folderId && folderId !== "root" && folderId !== "" ? folderId : null;
    if (targetFolderId) {
      const folderIsPrivate = await isFolderEffectivelyPrivate(targetFolderId);
      if (folderIsPrivate) {
        isEffectivelyPrivate = true;
      }
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: "No file provided" },
        { status: 400 }
      );
    }

    if (file.size > DIRECT_UPLOAD_MAX_BYTES) {
      return NextResponse.json(
        {
          success: false,
          error: `Direct upload exceeds ${DIRECT_UPLOAD_MAX_BYTES / (1024 * 1024)} MB. Please use direct resumable upload for larger files.`,
        },
        { status: 400 }
      );
    }

    const validation = validateFileType(file.name, file.type);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error },
        { status: 400 }
      );
    }

    const displayTitle = sanitizeFilename(customTitle?.trim() || file.name);
    const targetSlot = await getTargetDriveSlot();
    const slotConfig = getDriveSlotConfig(targetSlot);

    let driveFileId = `mock_drive_file_${Date.now()}`;

    if (slotConfig.isConfigured) {
      const { drive, folderId: driveFolderId } = getDriveClient(targetSlot);
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const readableStream = new Readable();
      readableStream.push(buffer);
      readableStream.push(null);

      const driveRes = await drive.files.create({
        supportsAllDrives: true,
        requestBody: {
          name: displayTitle,
          parents: [driveFolderId],
          mimeType: file.type || "application/octet-stream",
        },
        media: {
          mimeType: file.type || "application/octet-stream",
          body: readableStream,
        },
        fields: "id,name,size",
      });

      if (!driveRes.data.id) {
        throw new Error("Failed to receive created file ID from Google Drive");
      }

      driveFileId = driveRes.data.id;

      // Set public viewing permission ONLY if file is public
      if (!isEffectivelyPrivate) {
        try {
          await makeFilePublic(targetSlot, driveFileId);
        } catch (permErr) {
          console.warn("[DocNest] Could not set public permission on direct upload:", permErr);
        }
      }
    }

    // Save to Supabase
    const id = crypto.randomUUID();
    const newRecord = await createFileRecord({
      id,
      title: displayTitle,
      drive_slot: targetSlot,
      drive_file_id: driveFileId,
      mime_type: file.type || (file.name.endsWith(".pdf") ? "application/pdf" : "application/vnd.openxmlformats-officedocument.presentationml.presentation"),
      size_bytes: file.size,
      category: category.trim() || "General",
      folder_id: targetFolderId,
      is_private: isEffectivelyPrivate,
    });

    return NextResponse.json({
      success: true,
      data: newRecord,
      message: "File uploaded successfully",
    });
  } catch (err) {
    console.error("[DocNest] Direct upload error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Direct upload failed",
      },
      { status: 500 }
    );
  }
}
