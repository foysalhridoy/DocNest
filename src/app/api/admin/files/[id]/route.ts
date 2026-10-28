import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSessionFromRequest } from "@/lib/auth";
import { getFileById, updateFileRecord, deleteFileRecord } from "@/lib/supabase";
import { deleteDriveFile, renameDriveFile, getDriveSlotConfig, makeFilePrivate, makeFilePublic } from "@/lib/drive";
import { sanitizeFilename } from "@/lib/utils";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdminSessionFromRequest(req);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required" },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { title, category, folder_id, is_private } = body;

    const existing = await getFileById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }

    const updates: { title?: string; category?: string; folder_id?: string | null; is_private?: boolean } = {};
    if (typeof title === "string" && title.trim()) {
      updates.title = sanitizeFilename(title);
    }
    if (typeof category === "string" && category.trim()) {
      updates.category = category.trim();
    }
    if (folder_id !== undefined) {
      updates.folder_id = folder_id === "root" || folder_id === "" ? null : folder_id;
    }
    if (typeof is_private === "boolean") {
      updates.is_private = is_private;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const slotConfig = getDriveSlotConfig(existing.drive_slot);

    // If title changed and Drive is configured, rename in Drive as well
    if (updates.title && updates.title !== existing.title) {
      if (slotConfig.isConfigured && !existing.drive_file_id.startsWith("mock_")) {
        try {
          await renameDriveFile(existing.drive_slot, existing.drive_file_id, updates.title);
        } catch (driveErr) {
          console.warn("[DocNest] Warning: Could not rename file in Google Drive:", driveErr);
        }
      }
    }

    // If is_private changed, update Drive permissions
    if (typeof updates.is_private === "boolean" && updates.is_private !== existing.is_private) {
      if (slotConfig.isConfigured && !existing.drive_file_id.startsWith("mock_")) {
        try {
          if (updates.is_private) {
            await makeFilePrivate(existing.drive_slot, existing.drive_file_id);
          } else {
            await makeFilePublic(existing.drive_slot, existing.drive_file_id);
          }
        } catch (permErr) {
          console.warn("[DocNest] Warning: Could not update Drive permission:", permErr);
        }
      }
    }

    const updated = await updateFileRecord(id, updates);

    return NextResponse.json({
      success: true,
      data: updated,
      message: "File updated successfully",
    });
  } catch (err) {
    console.error("[DocNest] PATCH /api/admin/files/[id] error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update file",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const isAdmin = await verifyAdminSessionFromRequest(req);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required" },
      { status: 401 }
    );
  }

  try {
    const { id } = await context.params;
    const existing = await getFileById(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }

    // Delete from Google Drive
    const slotConfig = getDriveSlotConfig(existing.drive_slot);
    if (slotConfig.isConfigured && !existing.drive_file_id.startsWith("mock_")) {
      try {
        await deleteDriveFile(existing.drive_slot, existing.drive_file_id);
      } catch (driveErr) {
        console.warn("[DocNest] Warning: Could not delete file from Google Drive:", driveErr);
      }
    }

    // Delete row from Supabase
    await deleteFileRecord(id);

    return NextResponse.json({
      success: true,
      message: "File deleted successfully from Drive and database",
    });
  } catch (err) {
    console.error("[DocNest] DELETE /api/admin/files/[id] error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to delete file",
      },
      { status: 500 }
    );
  }
}
