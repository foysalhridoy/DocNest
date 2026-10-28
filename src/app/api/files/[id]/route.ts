import { NextRequest, NextResponse } from "next/server";
import { getFileById, isFileEffectivelyPrivate } from "@/lib/supabase";
import { verifyAdminSessionFromRequest } from "@/lib/auth";

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

    // If private and requester is not authenticated admin, return 404 Not Found (not Forbidden)
    if (isEffPrivate && !isAdmin) {
      return NextResponse.json(
        { success: false, error: "File not found" },
        { status: 404 }
      );
    }

    const headers: Record<string, string> = {};
    if (isAdmin || isEffPrivate) {
      headers["Cache-Control"] = "private, no-store";
    }

    // Do not expose Drive file IDs of private files
    const fileData = {
      ...file,
      is_effectively_private: isEffPrivate,
      drive_file_id: isEffPrivate && !isAdmin ? "" : file.drive_file_id,
    };

    return NextResponse.json(
      {
        success: true,
        data: fileData,
      },
      { headers }
    );
  } catch (err) {
    console.error("[DocNest] GET /api/files/[id] error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to retrieve file details" },
      { status: 500 }
    );
  }
}
