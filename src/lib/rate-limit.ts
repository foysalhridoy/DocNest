interface RateLimitRecord {
  attempts: number;
  firstAttemptAt: number;
  lockedUntil: number;
}

const loginAttempts = new Map<string, RateLimitRecord>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

/**
 * Checks if an identifier is rate-limited.
 */
export function checkRateLimit(identifier: string): {
  allowed: boolean;
  remainingAttempts: number;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (!record) {
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
    };
  }

  // Check if still locked out
  if (record.lockedUntil > now) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - now) / 1000);
    return {
      allowed: false,
      remainingAttempts: 0,
      retryAfterSeconds,
    };
  }

  // Check if window has expired
  if (now - record.firstAttemptAt > WINDOW_MS) {
    loginAttempts.delete(identifier);
    return {
      allowed: true,
      remainingAttempts: MAX_ATTEMPTS,
    };
  }

  return {
    allowed: record.attempts < MAX_ATTEMPTS,
    remainingAttempts: Math.max(0, MAX_ATTEMPTS - record.attempts),
  };
}

/**
 * Records a failed attempt for an identifier.
 */
export function recordFailedAttempt(identifier: string): {
  remainingAttempts: number;
  lockedOut: boolean;
  retryAfterSeconds?: number;
} {
  const now = Date.now();
  const record = loginAttempts.get(identifier);

  if (!record || now - record.firstAttemptAt > WINDOW_MS) {
    loginAttempts.set(identifier, {
      attempts: 1,
      firstAttemptAt: now,
      lockedUntil: 0,
    });
    return {
      remainingAttempts: MAX_ATTEMPTS - 1,
      lockedOut: false,
    };
  }

  record.attempts += 1;

  if (record.attempts >= MAX_ATTEMPTS) {
    record.lockedUntil = now + LOCKOUT_MS;
    return {
      remainingAttempts: 0,
      lockedOut: true,
      retryAfterSeconds: Math.ceil(LOCKOUT_MS / 1000),
    };
  }

  return {
    remainingAttempts: MAX_ATTEMPTS - record.attempts,
    lockedOut: false,
  };
}

/**
 * Clears rate limiting record upon successful login.
 */
export function resetRateLimit(identifier: string): void {
  loginAttempts.delete(identifier);
}
