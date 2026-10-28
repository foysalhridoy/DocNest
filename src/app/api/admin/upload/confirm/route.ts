import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSessionFromRequest } from "@/lib/auth";
import { makeFilePublic, getDriveSlotConfig } from "@/lib/drive";
import { createFileRecord, isFolderEffectivelyPrivate } from "@/lib/supabase";
import { sanitizeFilename } from "@/lib/utils";
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
    const body = await req.json().catch(() => ({}));
    const { title, driveSlot, driveFileId, mimeType, sizeBytes, category, folderId, folder_id, isPrivate, is_private } = body;

    if (!title || !driveSlot || !driveFileId || !mimeType || typeof sizeBytes !== "number") {
      return NextResponse.json(
        {
          success: false,
          error: "title, driveSlot, driveFileId, mimeType, and sizeBytes are required",
        },
        { status: 400 }
      );
    }

    const cleanTitle = sanitizeFilename(title);
    const slot = driveSlot as 1 | 2;
    const cleanCategory = typeof category === "string" && category.trim() ? category.trim() : "General";
    const targetFolderId = folderId || folder_id || null;

    // Check privacy of target destination
    let isEffectivelyPrivate = Boolean(isPrivate || is_private);
    if (targetFolderId) {
      const parentIsPrivate = await isFolderEffectivelyPrivate(targetFolderId);
      if (parentIsPrivate) {
        isEffectivelyPrivate = true;
      }
    }

    // Only set public permission if the file is NOT private
    const slotConfig = getDriveSlotConfig(slot);
    if (!isEffectivelyPrivate && slotConfig.isConfigured && !driveFileId.startsWith("mock_")) {
      try {
        await makeFilePublic(slot, driveFileId);
      } catch (permErr) {
        console.warn("[DocNest] Warning: Could not set public permission on Drive file:", permErr);
      }
    }

    // Save metadata in Supabase
    const id = crypto.randomUUID();
    const newFile = await createFileRecord({
      id,
      title: cleanTitle,
      drive_slot: slot,
      drive_file_id: driveFileId,
      mime_type: mimeType,
      size_bytes: sizeBytes,
      category: cleanCategory,
      folder_id: targetFolderId,
      is_private: isEffectivelyPrivate,
    });

    return NextResponse.json({
      success: true,
      data: newFile,
      message: "File uploaded and registered successfully",
    });
  } catch (err) {
    console.error("[DocNest] Confirm upload error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to register file in database",
      },
      { status: 500 }
    );
  }
}
