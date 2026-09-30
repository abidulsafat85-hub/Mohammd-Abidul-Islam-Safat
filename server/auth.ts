import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const JWT_SECRET = process.env.JWT_SECRET || 'messmate-super-secure-jwt-key-2026-production';
export const COOKIE_NAME = 'messmate_token';

export interface AuthJwtPayload {
  userId: string;
  memberId: string;
  email: string;
  role: 'admin' | 'member';
  mustChangePassword?: boolean;
}

export function signAuthToken(payload: AuthJwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function setTokenCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    path: '/',
  });
}

export function clearTokenCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
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

// Middleware: Require valid JWT (via httpOnly cookie or Bearer token)
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = extractAuthToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Authentication required (লগইন করা আবশ্যক)' });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token (সেশন মেয়াদোত্তীর্ণ হয়েছে)' });
  }

  (req as any).user = payload;
  next();
}

// Middleware: Require Admin role (abidulsafat85@gmail.com)
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  const token = extractAuthToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Admin authentication required' });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
  }

  if (payload.role !== 'admin' || payload.email.trim().toLowerCase() !== 'abidulsafat85@gmail.com') {
    return res.status(403).json({ success: false, error: 'Forbidden: Admin access required (শুধুমাত্র এডমিনদের জন্য)' });
  }

  // If admin has not changed the initial password, block access to administrative operations
  if (payload.mustChangePassword) {
    return res.status(403).json({
      success: false,
      mustChangePassword: true,
      error: 'Admin must change initial password before accessing admin features (পাসওয়ার্ড পরিবর্তন করুন)',
    });
  }

  (req as any).user = payload;
  next();
}

// Middleware: Member route isolation. Works only when JWT memberId equals :memberId (or if user is Admin)
export function requireMemberOrAdmin(req: Request, res: Response, next: NextFunction) {
  const token = extractAuthToken(req);
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Member login required' });
  }

  const payload = verifyAuthToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: 'Unauthorized: Invalid or expired token' });
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
    error: 'Forbidden: You can only access your own member data (অন্য মেম্বারের তথ্যে প্রবেশাধিকার নেই)',
  });
}

// Rate Limiter: max 5 requests per 15 minutes for auth endpoints
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many authentication attempts. Please try again after 15 minutes. (অতিরিক্ত চেষ্টার কারণে ১৫ মিনিটের জন্য সাময়িক ব্লক করা হয়েছে)',
  },
});
