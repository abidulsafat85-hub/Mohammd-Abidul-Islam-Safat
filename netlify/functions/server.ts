// Ensure global import.meta.url is never undefined in CommonJS/serverless bundles
if (typeof import.meta === 'undefined' || !import.meta.url) {
  try {
    const fallbackUrl = typeof __filename !== 'undefined' ? `file://${__filename}` : 'file:///var/task/server.js';
    if (typeof import.meta === 'undefined') {
      (globalThis as any).import = { meta: { url: fallbackUrl } };
    } else {
      (import.meta as any).url = fallbackUrl;
    }
  } catch {}
}

import serverless from 'serverless-http';
import { app } from '../../server/app';

// Netlify Serverless Function handler wrapping Express app
export const handler = serverless(app);
