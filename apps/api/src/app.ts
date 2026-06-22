import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { rateLimit } from 'express-rate-limit';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import { env } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middleware/errorHandler.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createApp() {
  const app = express();

  if (process.env.TRUST_PROXY === '1' || process.env.TRUST_PROXY === 'true') {
    app.set('trust proxy', 1);
  }

  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } },
  });

  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: { error: { code: 'RATE_LIMITED', message: 'Too many requests, please try again later.' } },
  });

  app.use('/api/v1/auth', authLimiter);
  app.use('/api/v1', apiLimiter);

  app.use('/api/v1', apiRouter);

  if (env.NODE_ENV !== 'production') {
    const openapiPath = path.join(__dirname, '../docs/openapi.yaml');
    if (fs.existsSync(openapiPath)) {
      const doc = YAML.parse(fs.readFileSync(openapiPath, 'utf8'));
      app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(doc));
    }
  }

  const webDist = path.join(__dirname, '../../web/dist');
  if (env.NODE_ENV === 'production' && fs.existsSync(webDist)) {
    app.use(express.static(webDist));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(webDist, 'index.html'));
    });
  }

  app.use(errorHandler);

  return app;
}
