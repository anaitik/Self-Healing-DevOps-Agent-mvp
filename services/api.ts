/**
 * HealFlow backend API client.
 * Set VITE_API_URL in .env.local (e.g. http://localhost:4000) when using the backend.
 */
import type { Incident, RemediationPlan } from '../types';

const API_URL = (typeof import.meta !== 'undefined' && (import.meta.env?.VITE_API_URL as string)) || 'http://localhost:4000';

export async function fetchLogsFromBackend(params: {
  logql: string;
  start?: string | number;
  end?: string | number;
  limit?: number;
}): Promise<{ logs: { timestamp: string; level: string; message: string }[] }> {
  const res = await fetch(`${API_URL}/api/loki/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || `Loki proxy failed: ${res.status}`);
  }
  return res.json();
}

export async function createRemediationPR(params: {
  incidentId: string;
  remediationPlan: RemediationPlan;
}): Promise<{ ok: boolean; pr_url: string | null; pr_number?: number; error?: string }> {
  const res = await fetch(`${API_URL}/api/remediate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, pr_url: null, error: (data as { error?: string }).error || `Request failed: ${res.status}` };
  }
  return data as { ok: boolean; pr_url: string | null; pr_number?: number };
}

export async function checkBackendHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { method: 'GET' });
    return res.ok;
  } catch {
    return false;
  }
}
