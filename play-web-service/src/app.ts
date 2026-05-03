import type { CorsOptions } from 'cors';
import type { NextFunction, Request, Response } from 'express';
import path from 'node:path';
import cors from 'cors';
import express from 'express';
import logger from 'morgan';

import { CORS_ALLOW_ORIGIN, PUBLIC_DIR } from './config/runtime';
import apiRouter from './routes/api';
import playRouter from './routes/play';
import { getCloudbaseCredentialState } from './services/cloudbase';
import { sendError, sendSuccess } from './utils/http-response';

const HTML_CACHE_CONTROL = 'public, max-age=0, must-revalidate';
const STATIC_ASSET_CACHE_CONTROL = 'public, max-age=86400';

const app = express();
const corsOptions: CorsOptions = {
  origin: CORS_ALLOW_ORIGIN === '*' ? true : CORS_ALLOW_ORIGIN,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.disable('x-powered-by');
app.use(logger('dev'));
app.use(express.json());
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.get(['/', '/index.html'], (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});
app.use(
  express.static(PUBLIC_DIR, {
    redirect: false,
    setHeaders: (res, filePath) => {
      const ext = path.extname(filePath).toLowerCase();
      const cacheControl = ext === '.html'
        ? HTML_CACHE_CONTROL
        : STATIC_ASSET_CACHE_CONTROL;
      res.setHeader('Cache-Control', cacheControl);
    },
  }),
);

app.get('/health', (_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  return sendSuccess(res, {
    service: 'play-web-service',
    message: 'Service is running normally',
    cloudbase: getCloudbaseCredentialState(),
  });
});

app.use('/api', withNoStore, apiRouter);
app.use('/play', playRouter);

app.use((_req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'no-store');
  return sendError(res, 'NOT_FOUND', 'Request path not found', 404);
});

function withNoStore(_req: Request, res: Response, next: NextFunction): void {
  res.setHeader('Cache-Control', 'no-store');
  next();
}

export default app;
