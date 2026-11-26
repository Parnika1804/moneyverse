import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRoutes from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultClientDistPath = path.resolve(__dirname, '..', '..', '..', 'client', 'dist');

export function parseAllowedOrigins(rawOrigins, nodeEnv = process.env.NODE_ENV) {
  const configured = (rawOrigins || '')
    .split(',')
    .map((origin) => origin.trim().replace(/\/+$/, ''))
    .filter(Boolean);

  if (configured.length > 0) {
    return nodeEnv === 'production'
      ? configured
      : Array.from(new Set([...configured, 'http://localhost:5173', 'http://127.0.0.1:5173']));
  }

  return ['http://localhost:5173', 'http://127.0.0.1:5173'];
}

export function createApp({
  serveFrontend = process.env.NODE_ENV === 'production' || process.env.SERVE_FRONTEND === 'true',
  clientDistPath = process.env.CLIENT_DIST_PATH || defaultClientDistPath,
  corsOrigins = process.env.CORS_ORIGINS || process.env.CLIENT_URL,
} = {}) {
  const app = express();

  const allowedOrigins = parseAllowedOrigins(corsOrigins, process.env.NODE_ENV);

  app.set('trust proxy', 1);

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
          imgSrc: ["'self'", 'data:', 'https:'],
          connectSrc: [
            "'self'",
            'https://identitytoolkit.googleapis.com',
            'https://securetoken.googleapis.com',
            'https://*.googleapis.com',
            'https://*.firebaseio.com',
            'https://*.firebaseapp.com',
          ],
        },
      },
    }),
  );

  app.use(
    cors({
      origin(origin, callback) {
        // Allow same-origin / server-to-server requests (no Origin header) or configured origins
        if (!origin) {
          return callback(null, true);
        }
        const normalized = origin.replace(/\/+$/, '');
        if (allowedOrigins.includes(normalized)) {
          return callback(null, true);
        }
        return callback(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

  // All backend API endpoints live strictly under /api
  app.use('/api', apiRoutes);

  // Unknown /api/* routes always return JSON 404 (never HTML fallback)
  app.use('/api', (_req, res) => {
    res.status(404).json({ error: 'Not Found' });
  });

  // In production, serve the built React/Vite SPA from client/dist
  const indexHtmlPath = path.join(clientDistPath, 'index.html');
  if (serveFrontend && fs.existsSync(indexHtmlPath)) {
    app.use(
      express.static(clientDistPath, {
        index: false,
        maxAge: '1y',
        setHeaders(res, filePath) {
          if (filePath.endsWith('.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          }
        },
      }),
    );

    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexHtmlPath);
    });
  } else {
    app.use((_req, res) => {
      res.status(404).json({ error: 'Not Found' });
    });
  }

  app.use((err, _req, res, _next) => {
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
      error: statusCode === 500 ? 'Internal Server Error' : err.message,
    });
  });

  return app;
}

const app = createApp();

export default app;
