import serverless from 'serverless-http';
import { app } from '../../server/app';

// Netlify Serverless Function handler wrapping Express app
export const handler = serverless(app);
