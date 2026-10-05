import 'dotenv/config';
import express from 'express';
import logger from '#config/logger.js';
import authRoutes from '#routes/auth.routes.js';
import healthRoutes from '#routes/health.routes.js';
import helmet from 'helmet';
import morgan from 'morgan';
import cors from 'cors';
import cookieParser from 'cookie-parser';

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(
  morgan('combined', {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

app.get('/', (req, res) => {
  logger.info('Hello from Acquisitions!');

  res.status(200).send('Hello from Acquisitions!');
});

// Health & Observability routes (/health, /ready)
app.use(healthRoutes);

app.get('/api', (req, res) => {
  res.status(200).send('API');
});

app.use('/api/auth', authRoutes);

// Global error handler — must be last middleware
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  logger.error('Unhandled error', err);
  res.status(err.status || 500).json({
    message: err.message || 'Internal server error',
  });
});

export default app;
