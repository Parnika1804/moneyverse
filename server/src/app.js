import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import apiRoutes from './routes/index.js';

const app = express();

const clientOrigin = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(helmet());
app.use(
  cors({
    origin: clientOrigin,
    credentials: true,
  }),
);
app.use(express.json());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

app.use('/api', apiRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.use((err, _req, res, _next) => {
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    error: statusCode === 500 ? 'Internal Server Error' : err.message,
  });
});

export default app;
