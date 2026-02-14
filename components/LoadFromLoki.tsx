import React, { useState } from 'react';
import { fetchLogsFromBackend } from '../services/api';
import { fetchLogsFromLoki } from '../services/grafanaLokiService';
import type { Incident, LogEntry } from '../types';
import { Severity } from '../types';

interface LoadFromLokiProps {
  onIncidentLoaded: (incident: Incident) => void;
  onClose: () => void;
  useBackend: boolean;
}

const LoadFromLoki: React.FC<LoadFromLokiProps> = ({ onIncidentLoaded, onClose, useBackend }) => {
  const [logql, setLogql] = useState('{job=~".+"}');
  const [service, setService] = useState('');
  const [title, setTitle] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hoursBack, setHoursBack] = useState(1);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const end = Math.floor(Date.now() / 1000);
    const start = end - hoursBack * 3600;
    try {
      let logs: LogEntry[] = [];
      if (useBackend) {
        const res = await fetchLogsFromBackend({ logql, start, end, limit: 100 });
        logs = (res.logs || []).map((l) => ({
          timestamp: l.timestamp,
          level: (l.level === 'ERROR' || l.level === 'WARN' ? l.level : 'INFO') as LogEntry['level'],
          message: l.message,
        }));
      } else {
        logs = await fetchLogsFromLoki(logql, start, end, 100);
      }
      const incidentId = `LOKI-${Date.now()}`;
      const incident: Incident = {
        id: incidentId,
        title: title || `Logs: ${service || 'unknown'} (${hoursBack}h)`,
        service: service || 'unknown',
        environment: 'production',
        alertType: 'Loki Query',
        errorRate: '—',
        threshold: '—',
        recentDeployment: '—',
        lastCommitMessage: '—',
        repositoryLanguage: 'Unknown',
        severity: Severity.HIGH,
        status: 'OPEN',
        timestamp: new Date().toISOString(),
        logs,
        metrics: [],
      };
      onIncidentLoaded(incident);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load logs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-slate-800 bg-slate-900 p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-white">Load from Loki</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-white"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              LogQL query
            </label>
            <input
              type="text"
              value={logql}
              onChange={(e) => setLogql(e.target.value)}
              placeholder='e.g. {job="auth-api"} |= "error"'
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Service name
              </label>
              <input
                type="text"
                value={service}
                onChange={(e) => setService(e.target.value)}
                placeholder="e.g. auth-api"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Hours back
              </label>
              <select
                value={hoursBack}
                onChange={(e) => setHoursBack(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:border-indigo-500 focus:outline-none"
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={6}>6 hours</option>
                <option value={24}>24 hours</option>
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Title (optional)
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Auth service errors"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-indigo-500 focus:outline-none"
            />
          </div>
          {error && (
            <div className="rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}
          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-lg bg-indigo-600 px-4 py-2 font-bold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              {loading ? 'Loading…' : 'Load logs & create incident'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 font-bold text-slate-400 hover:bg-slate-800"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoadFromLoki;
