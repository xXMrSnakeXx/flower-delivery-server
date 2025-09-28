import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';

import { connectDB } from './db/connection.js';
import { shopsRouter } from './routes/shops.js';
import { ordersRouter } from './routes/orders.js';
import { customersRouter } from './routes/customers.js';
import { errorHandler } from './middleware/errors.js';

const app = express();

const API_PREFIX = process.env.API_PREFIX || '/api';
const PORT = Number(process.env.PORT) || 4000;

const origins = (process.env.CORS_ORIGIN ?? '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(cors({ origin: origins.length ? origins : true, credentials: true }));
app.use(express.json());

app.get(`${API_PREFIX}/health`, (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.use(`${API_PREFIX}/shops`, shopsRouter);
app.use(`${API_PREFIX}/orders`, ordersRouter);
app.use(`${API_PREFIX}/customers`, customersRouter);

app.use((req, res, next) => {
  if (req.path.startsWith(API_PREFIX)) {
    return res.status(404).json({ error: 'Not Found', path: req.path });
  }
  next();
});

app.use(errorHandler);

async function main() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('[env] MONGODB_URI not found');
    process.exit(1);
  }
  await connectDB(uri);
  app.listen(PORT, () => {
    console.log(`[server] listening on http://localhost:${PORT}${API_PREFIX}`);
  });
}

process.on('unhandledRejection', (err) =>
  console.error('[unhandledRejection]', err)
);
process.on('uncaughtException', (err) =>
  console.error('[uncaughtException]', err)
);

void main();
