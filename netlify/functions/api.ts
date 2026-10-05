import serverless from 'serverless-http';
import { app } from '../../server/app';

// Netlify serverless function wrapper
export const handler = serverless(app);
