import express, { Express } from 'express';
import path from 'path';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { whatsappRouter } from './api';
import { messRouter } from './messApi';
import { initFirestoreDatabase, getFirestore, Collections } from './db';
import { WhatsAppAutomationService } from './whatsappService';
import { runMigration } from './db/migrate';

export function createApp(): Express {
  const app = express();

  // Security Headers via Helmet
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    })
  );

  // Cookie parser for signed/httpOnly auth JWT cookies
  app.use(cookieParser());

  // JSON & URL-encoded request body parser (5mb limit for logo upload)
  app.use(express.json({ limit: '5mb' }));
  app.use(express.urlencoded({ extended: true, limit: '5mb' }));

  // Initialize Firestore DB and run idempotent migration on first boot
  initFirestoreDatabase()
    .then(() => runMigration())
    .catch((err: any) => {
      console.error('[Database] Initialization error:', err);
    });

  // Internal Cron Scheduler runs ONLY when RUN_INTERNAL_SCHEDULER=true
  if (process.env.RUN_INTERNAL_SCHEDULER === 'true') {
    WhatsAppAutomationService.getInstance();
  }

  // Health check: verifies Firestore connection and returns ok with no sensitive data (Part B rule 14)
  app.get('/api/health', async (_req, res) => {
    try {
      const db = getFirestore();
      await db.collection(Collections.SETTINGS).doc('app_settings').get();
      res.json({ status: 'ok', database: 'connected', time: new Date().toISOString() });
    } catch {
      res.status(500).json({ status: 'error', database: 'disconnected' });
    }
  });

  // Public branding shortcut endpoint: /api/branding (Part C rule 1)
  app.get('/api/branding', async (_req, res) => {
    try {
      const db = getFirestore();
      const doc = await db.collection(Collections.SETTINGS).doc('app_settings').get();
      const data = doc.exists ? doc.data() : {};
      res.json({
        success: true,
        data: {
          appName: data.appName || data.messName || 'MessMate',
          logo: data.logo || undefined,
        },
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // WhatsApp Poll & Webhook routes
  app.use('/api/whatsapp', whatsappRouter);

  // Mess API routes
  app.use('/api/mess', messRouter);

  return app;
}

export const app = createApp();
