
import { Incident, Severity } from './types';

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'INC-7429',
    title: 'High Error Rate in Auth Service',
    service: 'auth-api',
    environment: 'production',
    alertType: 'HTTP 5xx Spike',
    errorRate: '15.4%',
    threshold: '1.0%',
    recentDeployment: 'v1.4.2-release (2 hours ago)',
    lastCommitMessage: 'feat: add redis connection pooling',
    repositoryLanguage: 'TypeScript / Node.js',
    severity: Severity.CRITICAL,
    status: 'OPEN',
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    logs: [
      { timestamp: '2023-10-27T10:00:01Z', level: 'ERROR', message: 'Connection timeout with Redis cluster at redis-prod-01:6379' },
      { timestamp: '2023-10-27T10:00:05Z', level: 'ERROR', message: 'Max retries exceeded for session retrieval' },
      { timestamp: '2023-10-27T10:00:10Z', level: 'WARN', message: 'CPU usage spiked to 94% on node-auth-01' }
    ],
    metrics: Array.from({ length: 20 }, (_, i) => ({
      time: `${10 + i}:00`,
      value: i > 15 ? 85 + Math.random() * 15 : 5 + Math.random() * 5
    }))
  }
];

export const SYSTEM_PROMPT = `
You are an expert Senior DevOps Engineer and Backend Architect.
Your job is root cause analysis and safe remediation suggestion for:
1) Runtime errors and application failures (prioritize recurring errors; suggest concrete code or config fixes).
2) Security vulnerabilities (exposed secrets, auth failures, CVE/dependency issues, misconfigurations); classify as security and suggest upgrades, config changes, or secret rotation.
3) Performance, connectivity, and configuration issues.

Strict Requirements:
1. Deterministic output.
2. Safe and conservative fixes.
3. Production-ready suggestions.
4. ONLY return the structured JSON.
5. NEVER include markdown formatting, explanations, or commentary outside the JSON.
6. For security findings: set finding_type to "security_vulnerability", include any CVE IDs in cve_ids, and list affected_components (e.g. dependency name, file, service).
7. For application/runtime errors: set finding_type to "runtime_error" and suggest a concrete code or config patch to resolve the error.

Expected Schema:
{
  "root_cause_category": "Short identifier (e.g., CONFIG_ERROR, RESOURCE_LIMIT, CONNECTIVITY, SECURITY_VULNERABILITY, AUTH_FAILURE)",
  "root_cause_summary": "Detailed technical explanation",
  "severity": "low | medium | high | critical",
  "confidence": 0.0 to 1.0,
  "auto_patch_safe": true | false,
  "recommended_fix_description": "Explanation of the fix",
  "suggested_code_patch": "The actual patch or configuration change",
  "suggested_branch_name": "fix/incident-id-slug",
  "suggested_commit_message": "fix: resolve [incident-id] root cause",
  "finding_type": "runtime_error | security_vulnerability | performance | config | connectivity | other",
  "cve_ids": ["CVE-YYYY-NNNNN"] or [],
  "affected_components": ["service-name", "file or dependency"],
  "target_file": "path/to/file/in/repo (e.g. src/auth/service.ts) when applicable, or empty string"
}
`;
