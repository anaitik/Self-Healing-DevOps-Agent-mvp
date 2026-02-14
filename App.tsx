
import React, { useState, useEffect, useCallback } from 'react';
import { Incident, RemediationPlan, Severity } from './types';
import { MOCK_INCIDENTS } from './constants';
import MetricsChart from './components/MetricsChart';
import RemediationCard from './components/RemediationCard';
import { analyzeIncident } from './services/geminiService';

const App: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>(MOCK_INCIDENTS);
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_INCIDENTS[0].id);
  const [analysis, setAnalysis] = useState<Record<string, RemediationPlan>>({});
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [isApproving, setIsApproving] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'details' | 'logs' | 'analysis'>('details');

  const selectedIncident = incidents.find(i => i.id === selectedId);

  const handleAnalyze = async (incident: Incident) => {
    if (analysis[incident.id]) return;
    
    setLoadingStates(prev => ({ ...prev, [incident.id]: true }));
    try {
      const result = await analyzeIncident(incident);
      setAnalysis(prev => ({ ...prev, [incident.id]: result }));
      setIncidents(prev => prev.map(i => i.id === incident.id ? { ...i, status: 'REMEDIATION_PROPOSED' } : i));
      setActiveTab('analysis');
    } catch (err) {
      console.error(err);
      alert("AI Agent failed to analyze alert. Connectivity or model error.");
    } finally {
      setLoadingStates(prev => ({ ...prev, [incident.id]: false }));
    }
  };

  const handleApprove = async (incidentId: string) => {
    setIsApproving(true);
    // Simulate API call to GitLab/Backend
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setIncidents(prev => prev.map(i => i.id === incidentId ? { ...i, status: 'RESOLVED' } : i));
    } catch (err) {
      alert("Failed to communicate with GitLab API.");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = (incidentId: string) => {
    setIncidents(prev => prev.map(i => i.id === incidentId ? { ...i, status: 'REJECTED' } : i));
    setAnalysis(prev => {
      const next = { ...prev };
      delete next[incidentId];
      return next;
    });
    setActiveTab('details');
  };

  const getSeverityColor = (sev: Severity | string) => {
    switch (sev.toLowerCase()) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col lg:flex-row">
      <aside className="w-full lg:w-80 border-r border-slate-800 bg-slate-950 p-4 lg:fixed lg:h-full lg:overflow-y-auto z-10">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight text-white">HealFlow</h1>
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Production Self-Heal</p>
          </div>
        </div>

        <h2 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-4 px-2 text-white">Monitoring Webhooks</h2>
        <div className="space-y-2">
          {incidents.map(incident => (
            <button
              key={incident.id}
              onClick={() => {
                setSelectedId(incident.id);
                if (incident.status === 'RESOLVED') {
                  setActiveTab('details');
                }
              }}
              className={`w-full text-left p-4 rounded-xl transition-all border ${
                selectedId === incident.id 
                  ? 'bg-slate-900 border-indigo-500/50 shadow-lg' 
                  : 'bg-transparent border-transparent hover:bg-slate-900/50'
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <span className="text-[10px] font-mono text-slate-500 uppercase">{incident.alertType}</span>
                <span className={`w-2 h-2 rounded-full ${getSeverityColor(incident.severity)}`}></span>
              </div>
              <h3 className={`font-semibold text-sm truncate ${selectedId === incident.id ? 'text-white' : 'text-slate-300'}`}>
                {incident.title}
              </h3>
              <div className="flex items-center justify-between mt-2">
                <span className="text-[10px] font-mono text-indigo-400">{incident.service}</span>
                <span className={`text-[10px] font-bold uppercase ${incident.status === 'RESOLVED' ? 'text-emerald-500' : 'text-slate-600'}`}>
                  {incident.status === 'RESOLVED' ? 'Resolved' : incident.environment}
                </span>
              </div>
            </button>
          ))}
        </div>
      </aside>

      <main className="flex-1 lg:ml-80 min-h-screen">
        {selectedIncident ? (
          <div className="max-w-4xl mx-auto p-6 lg:p-12 space-y-8">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase ${getSeverityColor(selectedIncident.severity)}`}>
                    {selectedIncident.severity}
                  </span>
                  <span className="text-slate-600 text-xs font-mono">{selectedIncident.id}</span>
                </div>
                <h2 className="text-3xl font-bold text-white tracking-tight">{selectedIncident.title}</h2>
                <div className="flex gap-4 text-xs font-medium text-slate-400">
                  <span>Env: <span className="text-slate-200">{selectedIncident.environment}</span></span>
                  <span>Lang: <span className="text-slate-200">{selectedIncident.repositoryLanguage}</span></span>
                </div>
              </div>

              {selectedIncident.status === 'OPEN' && !analysis[selectedIncident.id] && (
                <button
                  onClick={() => handleAnalyze(selectedIncident)}
                  disabled={loadingStates[selectedIncident.id]}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold px-8 py-3 rounded-lg shadow-xl shadow-indigo-600/20 transition-all flex items-center gap-2"
                >
                  {loadingStates[selectedIncident.id] ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                  )}
                  {loadingStates[selectedIncident.id] ? 'AI Agent Analyzing...' : 'Run Autonomous Diagnosis'}
                </button>
              )}
            </div>

            {selectedIncident.status !== 'RESOLVED' ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Traffic vs Error Threshold</h4>
                      <span className="text-red-400 text-xs font-mono">{selectedIncident.errorRate} Error Rate</span>
                    </div>
                    <MetricsChart data={selectedIncident.metrics} color="#ef4444" />
                  </div>
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 space-y-4">
                    <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Deployment Stats</h4>
                    <div className="space-y-3">
                      <div>
                        <span className="text-[10px] text-slate-600 block">LAST DEPLOY</span>
                        <span className="text-xs text-slate-300">{selectedIncident.recentDeployment}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-600 block">LAST COMMIT</span>
                        <span className="text-xs text-slate-300 italic">"{selectedIncident.lastCommitMessage}"</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-600 block">ERROR THRESHOLD</span>
                        <span className="text-xs text-red-400 font-mono">{selectedIncident.threshold}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-1 border-b border-slate-900">
                  {['details', 'logs', 'analysis'].map(tab => (
                    <button 
                      key={tab}
                      onClick={() => setActiveTab(tab as any)}
                      disabled={tab === 'analysis' && !analysis[selectedIncident.id]}
                      className={`px-6 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all disabled:opacity-20 ${activeTab === tab ? 'border-indigo-500 text-indigo-400' : 'border-transparent text-slate-600 hover:text-slate-400'}`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="min-h-[300px]">
                  {activeTab === 'details' && (
                    <div className="prose prose-invert max-w-none">
                      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                        <h3 className="text-white text-lg font-bold mb-2 text-white">Automated Alert Analysis</h3>
                        <p className="text-slate-400 leading-relaxed text-sm">
                          This incident was ingested via Prometheus/Grafana webhook. The AI Agent is currently monitoring logs for pattern matching against known failure modes in <code className="text-indigo-400">{selectedIncident.repositoryLanguage}</code> environments.
                        </p>
                      </div>
                    </div>
                  )}

                  {activeTab === 'logs' && (
                    <div className="bg-slate-950 border border-slate-800 rounded-xl overflow-hidden font-mono text-xs">
                      <div className="bg-slate-900 px-4 py-2 text-slate-500 border-b border-slate-800">Container Runtime Logs (JSON)</div>
                      <div className="p-4 space-y-1 overflow-x-auto max-h-[400px]">
                        {selectedIncident.logs.map((log, idx) => (
                          <div key={idx} className="flex gap-4 hover:bg-slate-900/40 p-1 rounded">
                            <span className="text-slate-600">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className={log.level === 'ERROR' ? 'text-red-400' : 'text-slate-400'}>{log.level}</span>
                            <span className="text-slate-300">{log.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {activeTab === 'analysis' && analysis[selectedIncident.id] && (
                    <RemediationCard 
                      plan={analysis[selectedIncident.id]} 
                      onApprove={() => handleApprove(selectedIncident.id)}
                      onReject={() => handleReject(selectedIncident.id)}
                      isSubmitting={isApproving}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-12 text-center animate-in zoom-in duration-500">
                <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">Remediation Executed</h3>
                <p className="text-slate-400 text-lg max-w-xl mx-auto leading-relaxed">
                  Self-healing procedure complete. A production-ready fix has been pushed to GitLab.
                </p>
                <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
                  <div className="bg-slate-900 border border-slate-800 px-6 py-4 rounded-xl text-left">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold mb-1">GitLab Merge Request</span>
                    <a href="#" className="text-emerald-400 font-mono text-sm hover:underline">mr/fix-{selectedIncident.id.toLowerCase()}</a>
                  </div>
                  <div className="bg-slate-900 border border-slate-800 px-6 py-4 rounded-xl text-left">
                    <span className="text-[10px] text-slate-500 block uppercase font-bold mb-1">Deployment Pipeline</span>
                    <span className="text-indigo-400 font-mono text-sm flex items-center gap-2">
                      <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
                      running
                    </span>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedId(null)}
                  className="mt-10 text-slate-500 text-xs hover:text-white transition-colors uppercase tracking-widest font-bold"
                >
                  Return to Monitoring Overview
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex flex-col items-center justify-center p-12 text-center">
            <div className="w-24 h-24 bg-slate-900 rounded-3xl border border-slate-800 flex items-center justify-center mb-6">
               <svg className="w-12 h-12 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <h3 className="text-2xl font-bold text-slate-400 mb-2">HealFlow Active</h3>
            <p className="text-slate-600 max-w-sm">Awaiting incident webhooks from monitoring infrastructure. Select an alert from the sidebar to begin.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
