/**
 * Proxy Loki query_range so the frontend doesn't need LOKI_URL or tokens in the browser.
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

/** POST /api/loki/query – body: { logql, start?, end?, limit? } */
router.post('/query', async (req, res) => {
  if (!LOKI_URL) {
    return res.status(503).json({ error: 'LOKI_URL not configured' });
  }
  const { logql, start, end, limit = 100 } = req.body || {};
  if (!logql || typeof logql !== 'string') {
    return res.status(400).json({ error: 'logql is required' });
  }
  const now = Math.floor(Date.now() / 1000);
  const oneHourAgo = now - 3600;
  const startSec = start == null ? oneHourAgo : (typeof start === 'string' ? Math.floor(new Date(start).getTime() / 1000) : start);
  const endSec = end == null ? now : (typeof end === 'string' ? Math.floor(new Date(end).getTime() / 1000) : end);

  const params = new URLSearchParams({
    query: logql,
    start: String(startSec),
    end: String(endSec),
    limit: String(Number(limit) || 100),
    direction: 'backward',
  });
  const url = `${LOKI_URL}/loki/api/v1/query_range?${params.toString()}`;
  try {
    const r = await fetch(url, { headers: { Accept: 'application/json', ...authHeader() } });
    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json(data || { error: 'Loki request failed' });
    }
    const streams = data?.data?.result || [];
    const logs = [];
    for (const s of streams) {
      for (const [tsNs, line] of s.values || []) {
        const ms = Math.floor(Number(tsNs) / 1e6);
        const level = /error|err/i.test(line + (s.stream?.level || '')) ? 'ERROR' : /warn/i.test(line) ? 'WARN' : 'INFO';
        logs.push({
          timestamp: new Date(ms).toISOString(),
          level,
          message: line,
        });
      }
    }
    logs.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    res.json({ logs });
  } catch (e) {
    res.status(502).json({ error: e.message || 'Loki request failed' });
  }
});

export default router;
