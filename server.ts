import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import authRoutes from './routes/auth.js';
import favoriteRoutes from './routes/favorites.js';
import wordpressRoutes from './routes/wordpress.js';
import searchHistoryRoutes from './routes/searchHistory.js';
import scanResultRoutes from './routes/scanResults.js';
import notificationRoutes from './routes/notifications.js';
import { uploadthingRouteHandler } from './routes/uploadthing.js';
import connectDB from './config/db.js';

const PORT = process.env.PORT || 8000;
const app = express();

// === Request Timing Logger Middleware ===
const requestLogger = (req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 9);
  const timestamp = new Date().toISOString();

  // Log incoming request
  console.log(
    `\n🔵 [${timestamp}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
  );
  console.log(`📥 [${requestId}] ${req.method} ${req.originalUrl}`);
  if (
    req.body &&
    Object.keys(req.body).length > 0 &&
    !req.originalUrl.includes('uploadthing')
  ) {
    console.log(
      `   📦 Body: ${JSON.stringify(req.body).substring(0, 200)}${
        JSON.stringify(req.body).length > 200 ? '...' : ''
      }`
    );
  }

  // Capture response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Color code based on response time and status
    let emoji = '✅';
    let timeColor = '';
    if (statusCode >= 400) emoji = '❌';
    else if (statusCode >= 300) emoji = '↪️';

    if (duration > 5000) timeColor = '🔴'; // Very slow (>5s)
    else if (duration > 2000) timeColor = '🟠'; // Slow (>2s)
    else if (duration > 500) timeColor = '🟡'; // Medium (>500ms)
    else timeColor = '🟢'; // Fast (<500ms)

    console.log(
      `${emoji} [${requestId}] ${req.method} ${req.originalUrl} → ${statusCode}`
    );
    console.log(`   ${timeColor} Duration: ${duration}ms`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
  });

  next();
};

// Apply request logger middleware (before other middleware)
app.use(requestLogger);

// === Allowed origins for CORS ===
const allowedOrigins = [
  'http://localhost:5173', // Vite dev server
  'capacitor://localhost', // Capacitor WebView
  'https://localhost', // Capacitor HTTPS
  process.env.APP_URL, // Production URL (Heroku or custom domain)
].filter(Boolean);

// === Environment validation ===
const requiredEnv = ['JWT_SECRET', 'ATLAS_URL'];
requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ Missing required environment variable: ${key}`);
  }
});
if (!process.env.JWT_SECRET || !process.env.ATLAS_URL) {
  console.warn(
    '⚠️ Server starting with missing env vars may cause runtime failures (token generation or DB connection).'
  );
}

// === Middleware ===
// CORS configuration - bearer token auth doesn't need credentials
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, Postman, curl)
      if (!origin) return callback(null, true);

      // Allow whitelisted origins
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      // Log rejected origin but still allow it (for debugging)
      console.log('⚠️ Origin not in whitelist but allowing:', origin);
      return callback(null, true);
    },
    credentials: false, // Disabled - using bearer tokens instead of cookies
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    // Allow headers required by UploadThing and tracing libraries
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'x-uploadthing-package',
      'x-uploadthing-version',
      'x-uploadthing-client',
      // Distributed tracing headers commonly sent by browsers/libraries
      'traceparent',
      'b3',
    ],
    exposedHeaders: [
      'set-auth-token', // Bearer token header
      'Authorization',
    ],
  })
);

// Parse JSON bodies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Connect to MongoDB
connectDB();

// === Custom Authentication Routes ===
app.use('/api/auth', authRoutes);
// === Favorites Routes ===
app.use('/api/favorites', favoriteRoutes);
// === WordPress Proxy Routes ===
app.use('/api/wordpress', wordpressRoutes);
// === Search History Routes ===
app.use('/api/search-history', searchHistoryRoutes);
// === Scan Results Routes ===
app.use('/api/scan-results', scanResultRoutes);

// === Notification Routes ===
app.use('/api/notifications', notificationRoutes);
// === UploadThing Routes ===
app.use('/api/uploadthing', uploadthingRouteHandler);

// Health check
app.get('/', (_req: Request, res: Response) => {
  res.json({ message: 'API is running...' });
});

// Start the Express server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
