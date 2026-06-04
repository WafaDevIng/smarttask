const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./config/swagger');

const { globalErrorHandler } = require('./middleware/errorHandler.middleware');
const { globalLimiter, authLimiter } = require('./middleware/rateLimit.middleware');

// Routes
const authRoutes         = require('./routes/auth.routes');
const userRoutes         = require('./routes/user.routes');
const projectRoutes      = require('./routes/project.routes');
const taskRoutes         = require('./routes/task.routes');
const chatRoutes         = require('./routes/chat.routes');
const commentRoutes      = require('./routes/comment.routes');
const commentCrudRoutes  = require('./routes/comment-crud.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

// ── Security ──────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:4200',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// ── Rate limiting ─────────────────────────────────────────────
app.use(globalLimiter);

// ── Logging ───────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// ── Body parsing ──────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ── Swagger docs ──────────────────────────────────────────────
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'SmartTask API Docs'
}));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => {
  const mongoose = require('mongoose');
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    database: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    environment: process.env.NODE_ENV
  });
});

// ── Metrics endpoint (Prometheus compatible) ──────────────────
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send([
    `# HELP process_uptime_seconds Node.js uptime`,
    `# TYPE process_uptime_seconds gauge`,
    `process_uptime_seconds ${process.uptime().toFixed(2)}`,
    `# HELP process_memory_bytes Memory usage`,
    `# TYPE process_memory_bytes gauge`,
    `process_memory_bytes{type="heapUsed"} ${process.memoryUsage().heapUsed}`,
    `process_memory_bytes{type="heapTotal"} ${process.memoryUsage().heapTotal}`,
    `process_memory_bytes{type="rss"} ${process.memoryUsage().rss}`,
  ].join('\n'));
});

// ── API Routes ────────────────────────────────────────────────
app.use('/api/auth',           authLimiter, authRoutes);
app.use('/api/users',          userRoutes);
app.use('/api/projects',       projectRoutes);
app.use('/api/tasks',          taskRoutes);
app.use('/api/tasks/:taskId/comments', commentRoutes);
app.use('/api/comments',       commentCrudRoutes);
app.use('/api/notifications',  notificationRoutes);
app.use('/api/chat',           chatRoutes);

// ── 404 ───────────────────────────────────────────────────────
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: `Route ${req.originalUrl} not found`
  });
});

// ── Global error handler ──────────────────────────────────────
app.use(globalErrorHandler);

module.exports = app;
