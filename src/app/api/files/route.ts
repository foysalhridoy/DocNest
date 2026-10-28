import { NextRequest, NextResponse } from "next/server";
import { getFiles, isFolderEffectivelyPrivate } from "@/lib/supabase";
import { verifyAdminSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || undefined;
    const type = (searchParams.get("type") as "pdf" | "pptx" | "docx" | "xlsx") || undefined;
    const category = searchParams.get("category") || undefined;
    const sort = (searchParams.get("sort") as "newest" | "oldest" | "name" | "size") || "newest";
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "12", 10);
    const folderIdParam = searchParams.get("folder_id");
    const onlyPrivate = searchParams.get("onlyPrivate") === "true";

    const folder_id = folderIdParam === "all" || folderIdParam === "" || folderIdParam === null ? undefined : folderIdParam === "root" ? null : folderIdParam;

    const isAdmin = await verifyAdminSessionFromRequest(req);

    // If folder_id is specified and user is not admin, verify folder is not private
    if (folder_id && !isAdmin) {
      const isFolderPrivate = await isFolderEffectivelyPrivate(folder_id);
      if (isFolderPrivate) {
        return NextResponse.json(
          { success: false, error: "Folder not found" },
          { status: 404 }
        );
      }
    }

    const result = await getFiles({
      search,
      type,
      category,
      sort,
      page: Math.max(1, page),
      limit: Math.min(100, Math.max(1, limit)),
      folder_id,
      includePrivate: isAdmin,
      onlyPrivate: isAdmin ? onlyPrivate : false,
    });

    // Public users must NEVER see drive_file_id of any private file
    if (!isAdmin) {
      result.files = result.files.map((file) => ({
        ...file,
        drive_file_id: file.is_private ? "" : file.drive_file_id,
      }));
    }

    const headers: Record<string, string> = {};
    if (isAdmin) {
      headers["Cache-Control"] = "private, no-store";
    }

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { headers }
    );
  } catch (err) {
    console.error("[DocNest] GET /api/files error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch files" },
      { status: 500 }
    );
  }
}
