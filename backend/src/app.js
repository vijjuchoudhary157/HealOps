require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { metricsMiddleware } = require('./middleware/metrics.middleware');
const logger = require('./middleware/logger.middleware');
const errorHandler = require('./middleware/error.middleware');

const sysRoutes = require('./routes/sys.routes');
const authRoutes = require('./routes/auth.routes');
const tasksRoutes = require('./routes/tasks.routes');

const app = express();

// Global Middleware
app.use(cors());
app.use(express.json());
app.use(logger);
app.use(metricsMiddleware);

// Routes
app.use('/', sysRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/tasks', tasksRoutes);

// 404 Handler
app.use((req, res, next) => {
  res.status(404).json({ error: { message: 'Not Found', status: 404 } });
});

// Error Handler
app.use(errorHandler);

module.exports = app;
