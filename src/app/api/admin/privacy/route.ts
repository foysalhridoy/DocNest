import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSessionFromRequest } from "@/lib/auth";
import {
  setFolderPrivacySubtree,
  setFilePrivacy,
  getFolderSubtree,
  getFileById,
  getFolderById,
} from "@/lib/supabase";
import { batchUpdateDrivePrivacy } from "@/lib/drive";
import { FileRecord, FolderRecord } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // 1. Verify admin session on server
  const isAdmin = await verifyAdminSessionFromRequest(req);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json().catch(() => ({}));
    const {
      targetType, // "folder" | "file"
      targetId,   // string
      isPrivate,  // boolean
      items,      // optional bulk items: Array<{ type: "folder" | "file"; id: string }>
    } = body;

    if (typeof isPrivate !== "boolean") {
      return NextResponse.json(
        { success: false, error: "isPrivate (boolean) is required" },
        { status: 400 }
      );
    }

    const itemsToProcess: Array<{ type: "folder" | "file"; id: string }> = [];

    if (Array.isArray(items) && items.length > 0) {
      itemsToProcess.push(...items);
    } else if (targetType && targetId) {
      itemsToProcess.push({ type: targetType, id: targetId });
    } else {
      return NextResponse.json(
        { success: false, error: "targetType & targetId OR items array is required" },
        { status: 400 }
      );
    }

    const allAffectedFiles: FileRecord[] = [];
    const allAffectedFolders: FolderRecord[] = [];

    for (const item of itemsToProcess) {
      if (item.type === "folder") {
        // Change privacy for entire subtree
        const { updatedFolders, updatedFiles } = await setFolderPrivacySubtree(
          item.id,
          isPrivate
        );
        allAffectedFolders.push(...updatedFolders);
        allAffectedFiles.push(...updatedFiles);
      } else if (item.type === "file") {
        const updatedFile = await setFilePrivacy(item.id, isPrivate);
        if (updatedFile) {
          allAffectedFiles.push(updatedFile);
        }
      }
    }

    // Deduplicate files by ID
    const uniqueFilesMap = new Map<string, FileRecord>();
    for (const f of allAffectedFiles) {
      uniqueFilesMap.set(f.id, f);
    }
    const uniqueFiles = Array.from(uniqueFilesMap.values());

    // Deduplicate folders by ID
    const uniqueFoldersMap = new Map<string, FolderRecord>();
    for (const f of allAffectedFolders) {
      uniqueFoldersMap.set(f.id, f);
    }
    const uniqueFolders = Array.from(uniqueFoldersMap.values());

    // 2. Synchronize Google Drive permissions for all affected files
    const driveFiles = uniqueFiles.map((f) => ({
      drive_slot: f.drive_slot,
      drive_file_id: f.drive_file_id,
    }));

    const driveResult = await batchUpdateDrivePrivacy(driveFiles, isPrivate);

    return NextResponse.json(
      {
        success: true,
        message: `Successfully set ${isPrivate ? "Private" : "Public"} for ${uniqueFolders.length} folder(s) and ${uniqueFiles.length} file(s).`,
        data: {
          affectedFolders: uniqueFolders.length,
          affectedFiles: uniqueFiles.length,
          driveUpdated: driveResult.successCount,
          driveErrors: driveResult.errors,
        },
      },
      {
        headers: {
          "Cache-Control": "private, no-store",
        },
      }
    );
  } catch (err) {
    console.error("[DocNest] POST /api/admin/privacy error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to update privacy",
      },
      { status: 500 }
    );
  }
}

