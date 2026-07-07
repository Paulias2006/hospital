import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import process from 'process';

import { errorHandler } from './middleware/errorHandler.js';
import { authMiddleware } from './middleware/auth.js';
import { requestLogger as logRequests } from './middleware/logging.js';

// Import routes
import authRoutes from './routes/auth.js';
import roomRoutes from './routes/rooms.js';
import patientRoutes from './routes/patients.js';
import paymentRoutes from './routes/payments.js';
import insuranceRoutes from './routes/insurance.js';
import historyRoutes from './routes/history.js';
import dashboardRoutes from './routes/dashboard.js';

const app = express();

// ============================================================================
// MIDDLEWARE DE SÉCURITÉ
// ============================================================================

// Helmet pour les headers de sécurité
app.use(helmet());

// CORS
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];
const corsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow non-browser requests
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error(`CORS origin denied: ${origin}`));
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requêtes par 15 min
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging
app.use(logRequests);

// ============================================================================
// ROUTES DE SANTÉ
// ============================================================================

app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '✅ API Hôpital EL-ELYON est fonctionnelle',
    timestamp: new Date(),
  });
});

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: '🏥 Hôpital EL-ELYON',
    version: '1.0.0',
    description: 'Système de gestion hospitalière professionnel',
    endpoints: {
      auth: 'POST /api/auth/register, POST /api/auth/login',
      patients: 'GET/POST /api/patients',
      rooms: 'GET/POST /api/rooms',
      payments: 'GET /api/payments/patient/:id',
      insurance: 'GET/POST /api/insurance/:patientId',
      dashboard: 'GET /api/dashboard',
      history: 'GET /api/history',
    },
    documentation: 'https://github.com/your-repo/hospital-api',
  });
});

app.get('/api/config', (req, res) => {
  res.status(200).json({
    success: true,
    backendUrl: process.env.BACKEND_URL || process.env.RENDER_EXTERNAL_URL || '',
  });
});

// ============================================================================
// ROUTES API
// ============================================================================

// Auth (pas besoin d'auth)
app.use('/api/auth', authRoutes);

// Toutes les autres routes requièrent l'authentification
app.use('/api/rooms', authMiddleware, roomRoutes);
app.use('/api/patients', authMiddleware, patientRoutes);
app.use('/api/payments', authMiddleware, paymentRoutes);
app.use('/api/insurance', authMiddleware, insuranceRoutes);
app.use('/api/history', authMiddleware, historyRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);

// ============================================================================
// GESTION D'ERREURS
// ============================================================================

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route non trouvée',
    code: 'NOT_FOUND',
    path: req.originalUrl,
  });
});

// Error handler global
app.use(errorHandler);

export default app;
