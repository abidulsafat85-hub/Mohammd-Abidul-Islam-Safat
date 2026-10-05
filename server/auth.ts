import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { Repository } from './repository';

const JWT_SECRET =
  process.env.JWT_SECRET ||
  'ghorer-shadh-production-secure-fallback-key-2026-9d8f7b6c5a4e3d2c1';

export const COOKIE_NAME = 'messmate_token';

export const ADMIN_SESSION_LIFETIME_MS = 12 * 60 * 60 * 1000; // 12 hours
export const MEMBER_SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface AuthJwtPayload {
  sessionId: string;
  userId: string;
  memberId: string;
  email: string;
  role: 'admin' | 'member';
  mustChangePassword?: boolean;
}

export function signAuthToken(payload: AuthJwtPayload): string {
  const expiresIn = payload.role === 'admin' ? '12h' : '30d';
  return jwt.sign(payload, JWT_SECRET, { expiresIn });
}

export function setTokenCookie(res: Response, token: string, role: 'admin' | 'member' = 'member'): void {
  const maxAge = role === 'admin' ? ADMIN_SESSION_LIFETIME_MS : MEMBER_SESSION_LIFETIME_MS;
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    maxAge,
    path: '/',
  });
}

export function clearTokenCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    partitioned: true,
    path: '/',
  });
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    path: '/',
  });
}

export function extractAuthToken(req: Request): string | null {
  if (req.cookies && req.cookies[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return null;
}

export function verifyAuthToken(token: string): AuthJwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthJwtPayload;
  } catch {
    return null;
  }
}

// Middleware: Require valid session in Firestore & valid JWT (Part G)
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  // Prevent browser back-button caching of private responses (Part G rule 5)
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  const token = extractAuthToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'লগইন করা আবশ্যক।' });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    clearTokenCookie(res);
    return res.status(401).json({ success: false, error: 'সেশন মেয়াদোত্তীর্ণ হয়েছে। পুনরায় লগইন করুন।' });
  }

  // Check if session record is still active in Firestore
  if (payload.sessionId) {
    const session = await Repository.getSession(payload.sessionId);
    if (!session) {
      clearTokenCookie(res);
      return res.status(401).json({ success: false, error: 'সেশন বাতিল করা হয়েছে। পুনরায় লগইন করুন।' });
    }
  }

  (req as any).user = payload;
  next();
}

// Middleware: Require Admin role
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  const token = extractAuthToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'এডমিন লগইন আবশ্যক।' });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    clearTokenCookie(res);
    return res.status(401).json({ success: false, error: 'সেশন মেয়াদোত্তীর্ণ হয়েছে।' });
  }

  if (payload.sessionId) {
    const session = await Repository.getSession(payload.sessionId);
    if (!session) {
      clearTokenCookie(res);
      return res.status(401).json({ success: false, error: 'সেশন বাতিল করা হয়েছে।' });
    }
  }

  if (payload.role !== 'admin' || payload.email.trim().toLowerCase() !== 'abidulsafat85@gmail.com') {
    return res.status(403).json({ success: false, error: 'শুধুমাত্র মেস এডমিনদের জন্য অনুমোদিত।' });
  }

  (req as any).user = payload;
  next();
}

// Middleware: Member route isolation (member can access only their own data; admin has access)
export async function requireMemberOrAdmin(req: Request, res: Response, next: NextFunction) {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');

  const token = extractAuthToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'লগইন আবশ্যক।' });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    clearTokenCookie(res);
    return res.status(401).json({ success: false, error: 'সেশন মেয়াদোত্তীর্ণ হয়েছে।' });
  }

  if (payload.sessionId) {
    const session = await Repository.getSession(payload.sessionId);
    if (!session) {
      clearTokenCookie(res);
      return res.status(401).json({ success: false, error: 'সেশন বাতিল করা হয়েছে।' });
    }
  }

  (req as any).user = payload;

  const targetMemberId = req.params.memberId;
  const isAdmin = payload.role === 'admin' && payload.email.trim().toLowerCase() === 'abidulsafat85@gmail.com';
  const isTargetMember = payload.memberId === targetMemberId;

  if (isAdmin || isTargetMember) {
    return next();
  }

  return res.status(403).json({
    success: false,
    error: 'অন্য মেম্বারের তথ্যে প্রবেশাধিকার নেই।',
  });
}

// Rate Limiter
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'অতিরিক্ত চেষ্টার কারণে ১৫ মিনিটের জন্য সাময়িক ব্লক করা হয়েছে।',
  },
});
