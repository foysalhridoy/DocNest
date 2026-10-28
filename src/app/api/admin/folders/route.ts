import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSessionFromRequest } from "@/lib/auth";
import { createFolderRecord, deleteFolderRecord, getFolderById } from "@/lib/supabase";
import crypto from "crypto";

export const dynamic = "force-dynamic";

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
    const { name, parentId, isPrivate } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: "Folder name is required" },
        { status: 400 }
      );
    }

    const cleanName = name.trim();
    const id = `folder-${crypto.randomUUID()}`;

    const newFolder = await createFolderRecord({
      id,
      name: cleanName,
      parent_id: parentId || null,
      is_private: Boolean(isPrivate),
    });

    return NextResponse.json({
      success: true,
      data: newFolder,
      message: "Folder created successfully",
    });
  } catch (err) {
    console.error("[DocNest] POST /api/admin/folders error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to create folder",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const isAdmin = await verifyAdminSessionFromRequest(req);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required" },
      { status: 401 }
    );
  }

  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Folder ID is required" },
        { status: 400 }
      );
    }

    const existing = await getFolderById(id);
    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Folder not found" },
        { status: 404 }
      );
    }

    await deleteFolderRecord(id);

    return NextResponse.json({
      success: true,
      message: "Folder and all contents deleted successfully",
    });
  } catch (err) {
    console.error("[DocNest] DELETE /api/admin/folders error:", err);
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : "Failed to delete folder",
      },
      { status: 500 }
    );
  }
}

