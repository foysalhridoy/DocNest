import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const SESSION_COOKIE_NAME = "admin_session";
const SESSION_EXPIRY_DAYS = 7;

function getSessionSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET || "docnest-default-fallback-dev-secret-do-not-use-in-prod";
  return new TextEncoder().encode(secret);
}

export interface SessionPayload {
  role: "admin";
  iat: number;
  exp: number;
}

/**
 * Creates a signed JWT for the admin session.
 */
export async function createAdminSessionToken(): Promise<string> {
  const secret = getSessionSecret();
  const token = await new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_EXPIRY_DAYS}d`)
    .sign(secret);

  return token;
}

/**
 * Verifies a JWT token.
 */
export async function verifyAdminSessionToken(token?: string): Promise<SessionPayload | null> {
  if (!token) return null;

  try {
    const secret = getSessionSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });

    if (payload.role === "admin") {
      return payload as unknown as SessionPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Checks if the request contains a valid admin session cookie.
 */
export async function verifyAdminSessionFromRequest(
  req?: NextRequest
): Promise<boolean> {
  let token: string | undefined;

  if (req) {
    token = req.cookies.get(SESSION_COOKIE_NAME)?.value;
    if (!token) {
      const authHeader = req.headers.get("authorization");
      if (authHeader?.startsWith("Bearer ")) {
        token = authHeader.substring(7);
      }
    }
  } else {
    try {
      const cookieStore = await cookies();
      token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    } catch {
      return false;
    }
  }

  const payload = await verifyAdminSessionToken(token);
  return Boolean(payload);
}

/**
 * Validates the provided password against ADMIN_PASSWORD.
 */
export function checkAdminPassword(password: string): boolean {
  const configuredPassword = process.env.ADMIN_PASSWORD;

  // If no password set, fall back to "admin123" with console warning
  if (!configuredPassword) {
    console.warn(
      "[DocNest] Warning: ADMIN_PASSWORD is not set in environment. Falling back to default 'admin123'."
    );
    return password === "admin123";
  }

  return password === configuredPassword;
}
