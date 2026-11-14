import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// Initialize Redis if Upstash credentials are provided
const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis =
  redisUrl && redisToken
    ? new Redis({
        url: redisUrl,
        token: redisToken,
      })
    : null;

// Fallback in-memory map for local development when Upstash is not yet configured
const inMemoryCache = new Map<string, { count: number; resetAt: number }>();

function checkInMemoryLimit(key: string, limit: number, windowSeconds: number): boolean {
  const now = Date.now();
  const entry = inMemoryCache.get(key);

  if (!entry || now > entry.resetAt) {
    inMemoryCache.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true; // allowed
  }

  if (entry.count >= limit) {
    return false; // limited
  }

  entry.count += 1;
  return true; // allowed
}

// Upstash limiters (sliding window)
const signupLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      prefix: 'ratelimit:signup',
    })
  : null;

const loginLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, '15 m'),
      prefix: 'ratelimit:login',
    })
  : null;

const resetLimiter = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, '30 m'),
      prefix: 'ratelimit:reset',
    })
  : null;

export interface RateLimitResult {
  allowed: boolean;
  message?: string;
}

/**
 * Checks sign-up rate limit per IP and per normalized email.
 */
export async function checkSignupRateLimit(ip: string, email: string): Promise<RateLimitResult> {
  const normEmail = email.trim().toLowerCase();
  const friendlyMessage =
    "You've tried creating an account several times. To keep the contest fair and secure, please take a quick breather and try again in 15 minutes.";

  if (signupLimiter) {
    const ipRes = await signupLimiter.limit(`ip:${ip}`);
    if (!ipRes.success) return { allowed: false, message: friendlyMessage };

    const emailRes = await signupLimiter.limit(`email:${normEmail}`);
    if (!emailRes.success) return { allowed: false, message: friendlyMessage };

    return { allowed: true };
  }

  // Fallback in memory
  const ipOk = checkInMemoryLimit(`signup:ip:${ip}`, 5, 900);
  const emailOk = checkInMemoryLimit(`signup:email:${normEmail}`, 3, 900);

  if (!ipOk || !emailOk) {
    return { allowed: false, message: friendlyMessage };
  }

  return { allowed: true };
}

/**
 * Checks login rate limit per IP and per normalized email.
 */
export async function checkLoginRateLimit(ip: string, email: string): Promise<RateLimitResult> {
  const normEmail = email.trim().toLowerCase();
  const friendlyMessage =
    "Too many login attempts. To protect your account, please take a quick breather and wait a few minutes before trying again.";

  if (loginLimiter) {
    const ipRes = await loginLimiter.limit(`ip:${ip}`);
    if (!ipRes.success) return { allowed: false, message: friendlyMessage };

    const emailRes = await loginLimiter.limit(`email:${normEmail}`);
    if (!emailRes.success) return { allowed: false, message: friendlyMessage };

    return { allowed: true };
  }

  // Fallback in memory
  const ipOk = checkInMemoryLimit(`login:ip:${ip}`, 5, 900);
  const emailOk = checkInMemoryLimit(`login:email:${normEmail}`, 5, 900);

  if (!ipOk || !emailOk) {
    return { allowed: false, message: friendlyMessage };
  }

  return { allowed: true };
}

/**
 * Checks password reset request rate limit per IP and per normalized email.
 */
export async function checkPasswordResetRateLimit(ip: string, email: string): Promise<RateLimitResult> {
  const normEmail = email.trim().toLowerCase();
  const friendlyMessage =
    "You've requested several password reset links. Please check your inbox (and spam folder) or wait 15 minutes before requesting another link.";

  if (resetLimiter) {
    const ipRes = await resetLimiter.limit(`ip:${ip}`);
    if (!ipRes.success) return { allowed: false, message: friendlyMessage };

    const emailRes = await resetLimiter.limit(`email:${normEmail}`);
    if (!emailRes.success) return { allowed: false, message: friendlyMessage };

    return { allowed: true };
  }

  // Fallback in memory
  const ipOk = checkInMemoryLimit(`reset:ip:${ip}`, 3, 1800);
  const emailOk = checkInMemoryLimit(`reset:email:${normEmail}`, 3, 1800);

  if (!ipOk || !emailOk) {
    return { allowed: false, message: friendlyMessage };
  }

  return { allowed: true };
}

