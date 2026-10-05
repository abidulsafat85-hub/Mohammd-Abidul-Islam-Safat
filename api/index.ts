import type { VercelRequest, VercelResponse } from '@vercel/node';
import { app } from '../server/app';

// Vercel Serverless Function entry point
export default function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure req.url starts with /api if rewritten without prefix
  if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + req.url;
  }
  return app(req, res);
}
