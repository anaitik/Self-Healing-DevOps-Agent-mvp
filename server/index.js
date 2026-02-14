/**
 * HealFlow backend: Loki proxy, Grafana webhook, GitHub PR creation.
 * Run: node server/index.js (from project root).
 * Env: LOKI_URL, GRAFANA_LOKI_API_TOKEN, GITHUB_TOKEN, GITHUB_REPO, PORT (default 4000).
 */
import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';
import dotenv from 'dotenv';

import lokiRoutes from './routes/loki.js';
import webhookRoutes from './routes/webhook.js';
import remediateRoutes from './routes/remediate.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
// Load .env.local from project root
dotenv.config({ path: join(__dirname, '..', '.env.local') });
dotenv.config({ path: join(__dirname, '..', '.env') });

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json({ limit: '1mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.use('/api/loki', lokiRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api', remediateRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`HealFlow API running at http://localhost:${PORT}`);
});
