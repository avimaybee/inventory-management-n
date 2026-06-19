import { createRemoteJWKSet, jwtVerify } from 'jose';

const FIREBASE_PROJECT_ID = 'neelamfeeds-inv';
const FIREBASE_PROJECT_NUMBER = '752517322012';
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

const jwks = createRemoteJWKSet(new URL(JWKS_URL));

export async function verifyToken(token: string): Promise<{ uid: string; email: string | null }> {
  const { payload } = await jwtVerify(token, jwks, {
    issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
    audience: FIREBASE_PROJECT_NUMBER,
  });
  return {
    uid: payload.sub as string,
    email: (payload.email as string) || null,
  };
}

export function extractToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (!auth || !auth.startsWith('Bearer ')) return null;
  return auth.slice(7);
}

const ALLOWED_ORIGINS = [
  'https://neelamfeedsinv.pages.dev',
  'http://localhost:5173',
  'http://localhost:8788',
];

export function checkOrigin(request: Request): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  return ALLOWED_ORIGINS.includes(origin);
}

const requestCounts = new Map<string, { count: number; windowStart: number }>();

const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 60;

export function checkRateLimit(key: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();

  if (requestCounts.size > 1000) {
    const cutoff = now - RATE_LIMIT_WINDOW * 2;
    for (const [k, entry] of requestCounts) {
      if (entry.windowStart < cutoff) requestCounts.delete(k);
    }
  }

  const entry = requestCounts.get(key);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    requestCounts.set(key, { count: 1, windowStart: now });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX) {
    const retryAfter = Math.ceil((entry.windowStart + RATE_LIMIT_WINDOW - now) / 1000);
    return { allowed: false, retryAfter };
  }

  entry.count++;
  return { allowed: true };
}

export const SHEET_ID_REGEX = /^[A-Za-z0-9_-]{10,100}$/;
