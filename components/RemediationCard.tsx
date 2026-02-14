
import React from 'react';
import { RemediationPlan } from '../types';

interface Props {
  plan: RemediationPlan;
  onApprove: () => void;
  onReject: () => void;
  isSubmitting: boolean;
}

const RemediationCard: React.FC<Props> = ({ plan, onApprove, onReject, isSubmitting }) => {
  const isHighRisk = !plan.auto_patch_safe || plan.confidence < 0.8;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden animate-in fade-in duration-500">
      {/* Safety Header */}
      <div className={`px-6 py-3 border-b border-slate-800 flex justify-between items-center ${plan.auto_patch_safe ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${plan.auto_patch_safe ? 'bg-emerald-500/20 text-emerald-500' : 'bg-amber-500/20 text-amber-500'}`}>
            {plan.auto_patch_safe ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
            )}
          </div>
          <div>
            <span className={`text-[10px] font-bold uppercase tracking-widest ${plan.auto_patch_safe ? 'text-emerald-500' : 'text-amber-500'}`}>
              {plan.auto_patch_safe ? 'Safe for Auto-Apply' : 'Requires Manual Oversight'}
            </span>
            <h3 className="text-white font-bold leading-none">{plan.root_cause_category}</h3>
          </div>
        </div>
        <div className="text-right">
          <span className="text-slate-500 text-[10px] block uppercase font-bold">Confidence</span>
          <span className={`font-mono font-bold ${plan.confidence > 0.9 ? 'text-emerald-400' : 'text-slate-400'}`}>
            {(plan.confidence * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="p-6 space-y-6">
        <div>
          <h4 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Root Cause Summary</h4>
          <p className="text-slate-200 text-sm leading-relaxed">{plan.root_cause_summary}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-4">
            <div>
              <h4 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Proposed Fix</h4>
              <p className="text-slate-300 text-sm">{plan.recommended_fix_description}</p>
            </div>
            <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
              <h4 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Branch Context</h4>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 text-[10px] font-mono w-16">BRANCH:</span>
                  <span className="text-indigo-400 font-mono text-xs truncate">{plan.suggested_branch_name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-600 text-[10px] font-mono w-16">COMMIT:</span>
                  <span className="text-slate-400 font-mono text-xs truncate">{plan.suggested_commit_message}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col h-full">
            <h4 className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-2">Code Patch</h4>
            <div className="flex-1 font-mono text-xs bg-black/40 p-3 rounded border border-slate-800/50 text-emerald-400/90 overflow-y-auto max-h-48">
              <pre className="whitespace-pre-wrap">{plan.suggested_code_patch}</pre>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <button
            onClick={onApprove}
            disabled={isSubmitting}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-6 rounded-lg font-bold transition-all shadow-lg ${
              plan.auto_patch_safe 
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20'
            }`}
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                {plan.auto_patch_safe ? 'Apply Patch Automatically' : 'Open GitLab Merge Request'}
              </>
            )}
          </button>
          <button
            onClick={onReject}
            className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold rounded-lg transition-all"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemediationCard;
