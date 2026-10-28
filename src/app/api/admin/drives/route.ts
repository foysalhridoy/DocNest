import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSessionFromRequest } from "@/lib/auth";
import { getDriveStorageStats, getTargetDriveSlot } from "@/lib/drive";

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdminSessionFromRequest(req);
  if (!isAdmin) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Admin session required" },
      { status: 401 }
    );
  }

  try {
    const drives = await getDriveStorageStats();
    const activeSlot = await getTargetDriveSlot();

    return NextResponse.json({
      success: true,
      data: {
        drives,
        activeSlot,
      },
    });
  } catch (err) {
    console.error("[DocNest] GET /api/admin/drives error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to fetch drive storage statistics" },
      { status: 500 }
    );
  }
}
