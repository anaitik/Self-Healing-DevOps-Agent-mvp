# HealFlow: Grafana Logs + Security + Error Remediation

This document outlines how to connect HealFlow to **Grafana logs** (Loki), run **diagnosis**, and remediate **security vulnerabilities** and **runtime errors** in your project.

---

## 1. Architecture Overview

```
┌─────────────────┐     webhook / API      ┌──────────────────┐     ┌─────────────┐
│  Grafana        │ ───────────────────►  │  HealFlow        │ ──►  │  Gemini     │
│  (Alerts/Loki)  │                        │  Backend (opt.)  │      │  (diagnosis)│
└─────────────────┘                        └──────────────────┘      └─────────────┘
        │                                           │
        │  Loki API (query logs)                    │  Incidents + remediation
        ▼                                           ▼
┌─────────────────┐                        ┌──────────────────┐
│  Loki           │ ◄── query_range ─────  │  HealFlow UI     │
│  (log store)    │                        │  (React)         │
└─────────────────┘                        └──────────────────┘
```

- **Grafana** can send alert webhooks to HealFlow when alerts fire.
- **Loki** holds log data; HealFlow queries it via `/loki/api/v1/query_range` to get recent logs for a service/time range.
- **HealFlow** runs AI diagnosis (root cause, security, errors) and proposes fixes (patches, branch, commit).

---

## 2. Connecting to Grafana Logs (Loki)

### 2.1 Loki API

- **Base URL**: Your Loki instance, e.g. `http://localhost:3100` or Grafana Cloud Loki URL.
- **Log query (range)**: `GET /loki/api/v1/query_range`
  - Params: `query` (LogQL), `start`, `end`, `limit` (e.g. 100), `direction=backward`.
- **Example LogQL**: `{job="auth-api"} |= "error"` or `{app="myapp", env="production"}`.

### 2.2 Environment Variables

Add to `.env.local` (and to a backend if you add one):

```bash
# Existing
GEMINI_API_KEY=your_gemini_key

# Grafana / Loki (optional – used when “Connect to Grafana” is enabled)
LOKI_URL=http://localhost:3100
GRAFANA_LOKI_USER=           # optional; for Basic auth
GRAFANA_LOKI_API_TOKEN=      # optional; for Grafana Cloud / auth
```

**Note:** Putting `LOKI_URL` in env only *enables* the app to call Loki. It does **not** auto-poll for logs. You need a "Load from Loki" action or a Grafana webhook to trigger log fetch. See [HOW_IT_WORKS.md](HOW_IT_WORKS.md).

### 2.3 Flow in HealFlow

1. **Incident source**
   - **Option A**: Grafana alert webhook → backend receives payload → backend fetches logs from Loki (by job/app/labels + time range) → creates/updates incident with logs → UI shows it.
   - **Option B**: UI “Load from Loki” → frontend (or backend) calls Loki `query_range` with a chosen LogQL + time range → convert Loki streams to `LogEntry[]` → create incident and run diagnosis.

2. **Log format**
   - Loki returns streams: `result[].stream` (labels), `result[].values` (array of `[timestamp_ns, line]`).
   - HealFlow normalizes these to `LogEntry[]` (`timestamp`, `level`, `message`) so existing Gemini prompt and UI keep working.

See `services/grafanaLokiService.ts` for the client that fetches logs and converts them into incidents/log entries.

---

## 3. Diagnosis (Existing + Security + Errors)

### 3.1 What the AI Does Today

- Takes an **incident** (metadata + metrics + logs).
- Returns a **RemediationPlan**: root cause, severity, confidence, recommended fix, code patch, branch name, commit message.

### 3.2 Extending for Security and Errors

- **Security**: Add to the prompt that the model must:
  - Detect **security-related** issues in logs/config (e.g. exposed secrets, auth failures, CVE mentions, dependency warnings, misconfigurations).
  - Classify them (e.g. `SECURITY_VULNERABILITY`, `SECRET_EXPOSURE`, `AUTH_FAILURE`) and include in `root_cause_category`.
  - Suggest fixes (dependency upgrade, config change, secret rotation, etc.) in `recommended_fix_description` and `suggested_code_patch`.

- **Errors**: The existing flow already uses logs for “errors occurring in the project”:
  - All `ERROR`/`WARN` log lines are passed into the prompt.
  - The model already does root cause and suggested fix; you can explicitly add in the system prompt: “Prioritize recurring application errors and infrastructure errors; suggest concrete code or config changes to resolve them.”

- **Structured output**: Optionally extend `RemediationPlan` with:
  - `finding_type`: `"runtime_error" | "security_vulnerability" | "performance" | "config" | "other"`.
  - `cve_ids`: string[] (if any CVE mentioned).
  - `affected_components`: string[] (e.g. service, file, dependency).

See `constants.tsx` (SYSTEM_PROMPT) and `services/geminiService.ts` for the extended prompt and schema.

---

## 4. Fixing Security Vulnerabilities and Errors

### 4.1 What HealFlow Proposes (No Auto-Apply by Default)

- **Recommended fix description** (human-readable).
- **Suggested code/config patch** (e.g. diff or snippet).
- **Branch name** and **commit message** for a merge request.

The UI already has “Approve” / “Reject”. In a full implementation:

- **Approve** → backend creates a branch, applies patch, opens MR (e.g. GitLab API), and optionally triggers a pipeline.
- **Reject** → mark as rejected and optionally add a reason.

### 4.2 Security-Specific Workflow

1. **Ingest**: Alerts or logs from Grafana/Loki that indicate security (e.g. “Critical” alert from a security dashboard, or log lines containing “CVE”, “vulnerability”, “unauthorized”).
2. **Diagnosis**: AI classifies as security, suggests upgrade/config/rotation.
3. **Remediation**: Human approves → MR with dependency bump or config change; optionally run security scan in CI.

### 4.3 Error-Specific Workflow

1. **Ingest**: Grafana alert on error rate / failed health checks, or Loki logs filtered by `level=error` or similar.
2. **Diagnosis**: AI uses stack traces and log context to suggest code or config fix.
3. **Remediation**: Same approve → MR flow as above.

---

## 5. Implementation Checklist

| Step | Description | Status |
|------|-------------|--------|
| 1 | Add Loki client and map Loki streams → `LogEntry[]` / incident | Implemented in `services/grafanaLokiService.ts` |
| 2 | Extend types: `finding_type`, optional `cve_ids`, `affected_components` | In `types.ts` |
| 3 | Extend SYSTEM_PROMPT for security + errors | In `constants.tsx` |
| 4 | Extend Gemini schema and prompt for new fields | In `services/geminiService.ts` |
| 5 | UI: “Load from Loki” or “Connect Grafana” (project/labels + time range) | Optional – wire `grafanaLokiService` to App state |
| 6 | Backend: Grafana webhook receiver + Loki fetch + persist incidents | Optional – add small Node/Express server and env vars |
| 7 | “Approve” → GitLab (or GitHub) MR creation | Optional – replace mock in `handleApprove` |

---

## 6. Quick Start: Use Loki Logs in HealFlow

1. Set `LOKI_URL` (and if needed `GRAFANA_LOKI_API_TOKEN`) in `.env.local`.
2. In the UI (when implemented), use “Load from Loki” and enter:
   - LogQL, e.g. `{job="auth-api"}` or `{app="myapp"} |= "error"`.
   - Time range (e.g. last 1 hour).
3. HealFlow fetches logs, creates an incident, and runs “Run Autonomous Diagnosis”.
4. Review remediation (including security and error fixes); Approve to create MR (when backend is wired).

---

## 7. GitHub Access for Patch PRs

To **create a real Pull Request** when the user clicks Approve (instead of the current mock), a **backend** needs access to the GitHub repo:

| Env (backend only) | Purpose |
|--------------------|--------|
| `GITHUB_TOKEN` | Fine-grained or Classic PAT with `contents` (read/write) and `pull_requests` (read/write), or scope `repo`. |
| `GITHUB_REPO` | Repo identifier, e.g. `owner/repo`. |

The backend would: create branch from `suggested_branch_name`, apply `suggested_code_patch` to the right file(s), commit with `suggested_commit_message`, push, then open a PR via GitHub API. **Do not** put the token in frontend env. See [HOW_IT_WORKS.md](HOW_IT_WORKS.md) for the full flow (logs → code lookup → PR).

---

## 8. Grafana Alert Webhook (Optional Backend)

To receive Grafana alerts automatically:

1. In Grafana: Alerting → Contact points → New contact point → Webhook.
2. URL: `https://your-healflow-backend/webhook/grafana`.
3. Backend receives payload, extracts labels (e.g. job, app, env), time range, and severity.
4. Backend calls Loki `query_range` with a LogQL built from labels (e.g. `{job="auth-api"}`), then creates an incident and stores it (or pushes to UI via API).
5. UI lists the incident; user runs diagnosis or backend runs it automatically and notifies.

This requires a small backend (e.g. Express) with:
- `POST /webhook/grafana` – parse body, fetch Loki, create incident.
- `GET /api/incidents` – list incidents for the UI.
- Optional: `POST /api/incidents/:id/analyze` – trigger Gemini and attach remediation.

You can keep the current frontend-only MVP and add this backend when you’re ready to go “full pipeline.”
