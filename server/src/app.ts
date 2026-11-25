import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { rateLimit } from 'express-rate-limit';
import { env, clientOrigins } from './config/env';
import { ApiError, errorHandler } from './utils/http';
import { routes } from './routes';
const app = express();
app.disable('x-powered-by'); app.set('trust proxy', env.TRUST_PROXY);
app.use(helmet());
app.use(cors({ origin(origin, callback) { if (!origin || clientOrigins.includes(origin)) callback(null, true); else callback(new ApiError(403, 'Origin is not allowed')); }, credentials: true, allowedHeaders: ['Content-Type', 'Authorization', 'X-SmartCRM-Request'], methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'] }));
app.use(express.json({ limit: '100kb' })); app.use(cookieParser());
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 1500, standardHeaders: 'draft-8', legacyHeaders: false, message: { success: false, message: 'Too many requests. Try again later.' } }));
app.use('/api', (_req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.get('/', (_req, res) => {
  res.json({ success: true, message: 'SmartCRM API Server is running' });
});
app.get('/api/health', (_req, res) => { const ready = mongoose.connection.readyState === 1; res.status(ready ? 200 : 503).json({ success: ready, message: ready ? 'SmartCRM API is running' : 'Database is unavailable' }); });

app.use('/api', routes);
app.use((_req, _res, next) => next(new ApiError(404, 'Route not found')));
app.use(errorHandler);
export default app;
