/**
 * Grafana alert webhook: receive alert payload, fetch logs from Loki, return incident payload.
 */
import { Router } from 'express';

const router = Router();
const LOKI_URL = (process.env.LOKI_URL || '').replace(/\/$/, '');
const LOKI_USER = process.env.GRAFANA_LOKI_USER || '';
const LOKI_TOKEN = process.env.GRAFANA_LOKI_API_TOKEN || '';

function authHeader() {
  if (!LOKI_TOKEN) return {};
  const auth = LOKI_USER ? `${LOKI_USER}:${LOKI_TOKEN}` : LOKI_TOKEN;
  return { Authorization: `Basic ${Buffer.from(auth, 'utf8').toString('base64')}` };
}

function parseLevel(line, labels = {}) {
  const lower = (line + (labels.level || '')).toLowerCase();
  if (lower.includes('error') || lower.includes('err')) return 'ERROR';
  if (lower.includes('warn')) return 'WARN';
  return 'INFO';
}

function nsToIso(ns) {
  return new Date(Math.floor(Number(ns) / 1_000_000)).toISOString();
}

/** Build LogQL from Grafana alert labels (job, app, instance, etc.) */
function buildLogQL(labels) {
  if (!labels || typeof labels !== 'object') return '{job=~".+"}';
  const parts = Object.entries(labels)
    .filter(([k, v]) => v && ['job', 'app', 'instance', 'namespace', 'container'].includes(k))
    .map(([k, v]) => `${k}="${v}"`);
  if (parts.length === 0) return '{job=~".+"}';
  return `{${parts.join(', ')}}`;
}

/** POST /api/webhook/grafana – Grafana alert webhook payload */
router.post('/grafana', async (req, res) => {
  if (!LOKI_URL) {
    return res.status(503).json({ error: 'LOKI_URL not configured' });
  }
  const body = req.body || {};
  // Grafana alert payloads: body.alerts[] with labels, annotations, state
  const alerts = Array.isArray(body.alerts) ? body.alerts : [];
  const first = alerts[0];
  const labels = first?.labels || body.labels || {};
  const annotations = first?.annotations || body.annotations || {};
  const logql = buildLogQL(labels);
  const now = Math.floor(Date.now() / 1000);
  const start = now - 3600;

  const params = new URLSearchParams({
    query: logql,
    start: String(start),
    end: String(now),
    limit: '100',
    direction: 'backward',
  });
  const url = `${LOKI_URL}/loki/api/v1/query_range?${params.toString()}`;
  let logs = [];
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json', ...authHeader() } });
    const data = await r.json();
    const streams = data?.data?.result || [];
    for (const s of streams) {
      for (const [tsNs, line] of s.values || []) {
        logs.push({
          timestamp: nsToIso(tsNs),
          level: parseLevel(line, s.stream),
          message: line,
        });
      }
    }
    logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  } catch (e) {
    // continue with empty logs
  }

  const title = annotations.summary || annotations.title || first?.status || 'Grafana Alert';
  const service = labels.job || labels.app || labels.instance || 'unknown';
  const incident = {
    id: `GRAF-${Date.now()}`,
    title,
    service,
    environment: labels.namespace || labels.env || 'production',
    alertType: 'Grafana Webhook',
    errorRate: '—',
    threshold: '—',
    recentDeployment: '—',
    lastCommitMessage: '—',
    repositoryLanguage: 'Unknown',
    severity: (first?.labels?.severity || 'high').toLowerCase(),
    status: 'OPEN',
    timestamp: new Date().toISOString(),
    logs,
    metrics: [],
  };
  res.json(incident);
});

export default router;
