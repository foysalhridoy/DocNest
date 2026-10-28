import { NextRequest, NextResponse } from "next/server";
import { getFolders } from "@/lib/supabase";
import { verifyAdminSessionFromRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parentIdParam = searchParams.get("parentId");
    const parentId = parentIdParam === "null" || parentIdParam === "" || parentIdParam === null ? null : parentIdParam;
    const onlyPrivate = searchParams.get("onlyPrivate") === "true";

    // Server-side check: is requester a verified admin?
    const isAdmin = await verifyAdminSessionFromRequest(req);

    // If not admin, strictly exclude all private and effectively private folders
    const includePrivate = isAdmin;
    const folders = await getFolders(parentId, includePrivate, onlyPrivate);

    const headers: Record<string, string> = {};
    if (isAdmin) {
      headers["Cache-Control"] = "private, no-store";
    } else {
      headers["Cache-Control"] = "public, s-maxage=60, stale-while-revalidate=30";
    }

    return NextResponse.json(
      {
        success: true,
        data: folders,
      },
      { headers }
    );
  } catch (err) {
    console.error("[DocNest] GET /api/folders error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch folders" },
      { status: 500 }
    );
  }
}

