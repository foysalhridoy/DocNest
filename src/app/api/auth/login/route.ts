import { NextRequest, NextResponse } from "next/server";
import { checkAdminPassword, createAdminSessionToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { checkRateLimit, recordFailedAttempt, resetRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  try {
    // Identify client by IP for rate limiting
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "127.0.0.1";

    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: `Too many failed login attempts. Please try again in ${rateCheck.retryAfterSeconds} seconds.`,
          retryAfterSeconds: rateCheck.retryAfterSeconds,
        },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { password } = body;

    if (!password || typeof password !== "string") {
      return NextResponse.json(
        { success: false, error: "Password is required" },
        { status: 400 }
      );
    }

    const isValid = checkAdminPassword(password);

    if (!isValid) {
      const failInfo = recordFailedAttempt(ip);
      const message = failInfo.lockedOut
        ? `Account locked due to multiple failed attempts. Try again in ${failInfo.retryAfterSeconds} seconds.`
        : `Incorrect password. ${failInfo.remainingAttempts} attempt(s) remaining.`;

      return NextResponse.json(
        {
          success: false,
          error: message,
          remainingAttempts: failInfo.remainingAttempts,
          lockedOut: failInfo.lockedOut,
        },
        { status: 401 }
      );
    }

    // Success: reset rate limit & issue signed JWT cookie
    resetRateLimit(ip);
    const token = await createAdminSessionToken();

    const response = NextResponse.json({
      success: true,
      message: "Admin login successful",
    });

    response.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    console.error("[DocNest] Login error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error during authentication" },
      { status: 500 }
    );
  }
}
