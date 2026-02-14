/**
 * Grafana Loki integration: fetch logs from Loki and convert to HealFlow incident/log format.
 * Set LOKI_URL (and optionally GRAFANA_LOKI_API_TOKEN) in .env.local to use.
 */

import type { LogEntry } from '../types';

// Vite exposes env via import.meta.env; backend would use process.env
const getEnv = (key: string, viteKey?: string): string => {
  if (typeof import.meta !== 'undefined' && import.meta.env && viteKey) {
    const v = (import.meta.env as Record<string, string>)[viteKey];
    if (v) return v;
  }
  if (typeof process !== 'undefined' && process.env) {
    const v = process.env[key];
    if (v) return v;
  }
  return '';
};
const LOKI_URL = (getEnv('LOKI_URL', 'VITE_LOKI_URL') || '').replace(/\/$/, '');
const LOKI_USER = getEnv('GRAFANA_LOKI_USER', 'VITE_GRAFANA_LOKI_USER');
const LOKI_TOKEN = getEnv('GRAFANA_LOKI_API_TOKEN', 'VITE_GRAFANA_LOKI_API_TOKEN');

/** Loki query_range response (streams). */
interface LokiStream {
  stream: Record<string, string>;
  values: [string, string][]; // [timestamp_ns, line][]
}

interface LokiQueryRangeResponse {
  status?: string;
  data?: {
    resultType?: string;
    result?: LokiStream[];
  };
}

/** Parse log level from a log line or Loki label. */
function parseLevel(line: string, labels: Record<string, string>): LogEntry['level'] {
  const lower = (line + (labels.level || '')).toLowerCase();
  if (lower.includes('error') || lower.includes('err')) return 'ERROR';
  if (lower.includes('warn')) return 'WARN';
  return 'INFO';
}

/** Convert Loki nanosecond timestamp to ISO string. */
function nsToIso(ns: string): string {
  const ms = Math.floor(Number(ns) / 1_000_000);
  return new Date(ms).toISOString();
}

/**
 * Fetch logs from Loki using query_range.
 * @param logql - LogQL query, e.g. `{job="auth-api"}` or `{app="myapp"} |= "error"`
 * @param start - Start time (ISO or seconds)
 * @param end - End time (ISO or seconds)
 * @param limit - Max log lines (default 100)
 */
export async function fetchLogsFromLoki(
  logql: string,
  start?: string | number,
  end?: string | number,
  limit = 100
): Promise<LogEntry[]> {
  if (!LOKI_URL) {
    throw new Error('LOKI_URL is not set. Add it to .env.local to connect to Grafana Loki.');
  }

  const now = Math.floor(Date.now() / 1000);
  const oneHourAgo = now - 3600;
  const startSec = start == null ? oneHourAgo : typeof start === 'string' ? Math.floor(new Date(start).getTime() / 1000) : start;
  const endSec = end == null ? now : typeof end === 'string' ? Math.floor(new Date(end).getTime() / 1000) : end;

  const params = new URLSearchParams({
    query: logql,
    start: String(startSec),
    end: String(endSec),
    limit: String(limit),
    direction: 'backward',
  });

  const url = `${LOKI_URL}/loki/api/v1/query_range?${params.toString()}`;
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (LOKI_TOKEN) {
    const auth = LOKI_USER ? `${LOKI_USER}:${LOKI_TOKEN}` : LOKI_TOKEN;
    const base64 = typeof btoa !== 'undefined' ? btoa(auth) : (typeof Buffer !== 'undefined' ? Buffer.from(auth, 'utf8').toString('base64') : '');
    if (base64) headers.Authorization = `Basic ${base64}`;
  }

  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`Loki query failed: ${res.status} ${res.statusText}`);
  }

  const body = (await res.json()) as LokiQueryRangeResponse;
  const streams = body?.data?.result ?? [];
  const entries: LogEntry[] = [];

  for (const s of streams) {
    for (const [tsNs, line] of s.values) {
      entries.push({
        timestamp: nsToIso(tsNs),
        level: parseLevel(line, s.stream),
        message: line,
      });
    }
  }

  // Sort by time ascending for display
  entries.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  return entries;
}

/**
 * Build a minimal incident-like object from Loki logs + labels for use in the UI.
 * Caller can merge this with existing incident or use as new incident.
 */
export interface LokiIncidentInput {
  logql: string;
  title: string;
  service: string;
  environment?: string;
  repositoryLanguage?: string;
  start?: string | number;
  end?: string | number;
  limit?: number;
}

export async function fetchIncidentFromLoki(input: LokiIncidentInput): Promise<{
  logs: LogEntry[];
  service: string;
  environment: string;
  title: string;
  repositoryLanguage: string;
}> {
  const logs = await fetchLogsFromLoki(
    input.logql,
    input.start,
    input.end,
    input.limit ?? 100
  );
  return {
    logs,
    service: input.service,
    environment: input.environment ?? 'production',
    title: input.title,
    repositoryLanguage: input.repositoryLanguage ?? 'Unknown',
  };
}
