
export enum Severity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface LogEntry {
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR';
  message: string;
}

export interface Incident {
  id: string;
  title: string;
  service: string;
  environment: string;
  alertType: string;
  errorRate: string;
  threshold: string;
  recentDeployment: string;
  lastCommitMessage: string;
  repositoryLanguage: string;
  severity: Severity;
  status: 'OPEN' | 'ANALYZING' | 'REMEDIATION_PROPOSED' | 'RESOLVED' | 'REJECTED';
  timestamp: string;
  logs: LogEntry[];
  metrics: { time: string; value: number }[];
}

export interface RemediationPlan {
  root_cause_category: string;
  root_cause_summary: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  auto_patch_safe: boolean;
  recommended_fix_description: string;
  suggested_code_patch: string;
  suggested_branch_name: string;
  suggested_commit_message: string;
}

export interface MetricData {
  time: string;
  value: number;
}
