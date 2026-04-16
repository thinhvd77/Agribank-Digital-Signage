import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

import healthRouter from './routes/health';
import authRouter from './routes/auth';
import screensRouter from './routes/screens';
import profilesRouter from './routes/profiles';
import mediaRouter from './routes/media';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      mediaSrc: ["'self'", "blob:"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
    },
  },
}));

// CORS for LAN
app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const lanPattern = /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|localhost|127\.0\.0\.1)(:\d+)?$/;
    if (lanPattern.test(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));

app.use(express.json());

// Static files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// API routes
app.use('/api/health', healthRouter);
app.use('/api/auth', authRouter);
app.use('/api/screens', screensRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/media', mediaRouter);

// Serve static frontend in production
const distPath = path.join(process.cwd(), 'dist');
app.use(express.static(distPath, {
  extensions: ['html'],
  index: 'index.html',
}));

// Catch-all for SPA routing (exclude /api)
app.get(/^\/(?!api\/).*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
