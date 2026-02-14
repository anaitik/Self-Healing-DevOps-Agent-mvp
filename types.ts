
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

/** Type of finding: runtime errors, security, performance, config, etc. */
export type FindingType =
  | 'runtime_error'
  | 'security_vulnerability'
  | 'performance'
  | 'config'
  | 'connectivity'
  | 'other';

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
  /** Extended: classification for security vs errors vs config */
  finding_type?: FindingType;
  /** CVE IDs when security vulnerability is detected */
  cve_ids?: string[];
  /** Affected components (service, file, dependency) */
  affected_components?: string[];
  /** Target file path in repo to apply patch (e.g. src/auth/service.ts) */
  target_file?: string;
}

export interface MetricData {
  time: string;
  value: number;
}
