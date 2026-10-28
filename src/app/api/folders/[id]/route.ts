import { NextRequest, NextResponse } from "next/server";
import {
  getFolderById,
  isFolderEffectivelyPrivate,
  getBreadcrumbs,
  getFolders,
  getFiles,
} from "@/lib/supabase";
import { verifyAdminSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const isAdmin = await verifyAdminSessionFromRequest(req);

    const folder = await getFolderById(id);
    if (!folder) {
      return NextResponse.json(
        { success: false, error: "Folder not found" },
        { status: 404 }
      );
    }

    const isEffPrivate = await isFolderEffectivelyPrivate(folder.id);

    // If folder is private and user is not admin, return 404 Not Found (not Forbidden)
    if (isEffPrivate && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "Folder not found" },
        { status: 404 }
      );
    }

    // Fetch breadcrumbs, subfolders, and files
    const breadcrumbs = await getBreadcrumbs(folder.id, isAdmin);
    const subfolders = await getFolders(folder.id, isAdmin);
    const filesResponse = await getFiles({
      folder_id: folder.id,
      includePrivate: isAdmin,
      limit: 100,
    });

    // If not admin, sanitize: remove drive_file_id from any private items (though they're already filtered)
    let files = filesResponse.files;
    if (!isAdmin) {
      files = files.map((f) => ({
        ...f,
        drive_file_id: f.is_private ? "" : f.drive_file_id,
      }));
    }

    const headers: Record<string, string> = {};
    if (isAdmin || isEffPrivate) {
      headers["Cache-Control"] = "private, no-store";
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          folder: {
            ...folder,
            is_effectively_private: isEffPrivate,
          },
          breadcrumbs,
          subfolders,
          files,
          totalFiles: filesResponse.total,
          totalSubfolders: subfolders.length,
        },
      },
      { headers }
    );
  } catch (err) {
    console.error("[DocNest] GET /api/folders/[id] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to load folder details" },
      { status: 500 }
    );
  }
}

