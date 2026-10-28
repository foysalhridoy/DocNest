import { NextRequest, NextResponse } from "next/server";
import { verifyAdminSessionFromRequest } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const isAdmin = await verifyAdminSessionFromRequest(req);
  return NextResponse.json({
    authenticated: isAdmin,
    role: isAdmin ? "admin" : "public",
  });
}
