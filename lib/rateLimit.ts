interface RateLimitRecord {
  count: number;
  resetAt: number;
}

// In-memory rate limiting map: IP -> record
const rateLimitMap = new Map<string, RateLimitRecord>();

const WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_REQUESTS = 10; // 10 requests per 10 minutes

/**
 * Clean up expired rate limit entries periodically
 */
function cleanupExpiredRecords(now: number) {
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) {
      rateLimitMap.delete(ip);
    }
  }
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInSeconds: number;
}

/**
 * Checks in-memory rate limit for a client IP.
 * Skips rate limiting only when process.env.EVAL_MODE === "true".
 */
export function checkRateLimit(ip: string): RateLimitResult {
  // Evaluation mode bypass for automated benchmark runs
  if (process.env.EVAL_MODE === 'true') {
    return {
      allowed: true,
      remaining: MAX_REQUESTS,
      resetInSeconds: 0,
    };
  }

  const now = Date.now();
  // Occasional light cleanup
  if (rateLimitMap.size > 500) {
    cleanupExpiredRecords(now);
  }

  const existing = rateLimitMap.get(ip);

  if (!existing || now > existing.resetAt) {
    // New or expired window
    rateLimitMap.set(ip, {
      count: 1,
      resetAt: now + WINDOW_MS,
    });
    return {
      allowed: true,
      remaining: MAX_REQUESTS - 1,
      resetInSeconds: Math.ceil(WINDOW_MS / 1000),
    };
  }

  if (existing.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetInSeconds: Math.max(0, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: MAX_REQUESTS - existing.count,
    resetInSeconds: Math.max(0, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

/**
 * Reset rate limit store (useful for unit tests)
 */
export function _resetRateLimits(): void {
  rateLimitMap.clear();
}
