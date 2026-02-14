<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1xdyilZRfa_zBjLR8A5BNaOIe89Kq0MB1

## Run Locally

**Prerequisites:**  Node.js

1. Install dependencies: `npm install`
2. Copy [.env.example](.env.example) to `.env.local` and set at least `GEMINI_API_KEY`.
3. Run the **frontend**: `npm run dev` → open http://localhost:3000
4. (Optional) Run the **backend** (for Load from Loki via proxy and GitHub PR creation):
   - In `.env.local` set `LOKI_URL` (and optionally `GITHUB_TOKEN`, `GITHUB_REPO`).
   - In a second terminal: `npm run server` → API at http://localhost:4000
   - Set `VITE_API_URL=http://localhost:4000` in `.env.local` so the UI talks to the backend.

## Connect to Grafana Logs + Security & Error Remediation

HealFlow can connect to **Grafana Loki** for live logs, run **diagnosis**, and propose fixes for **runtime errors** and **security vulnerabilities**.

- **How it works (read this first)**: [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md) – Does LOKI_URL auto-check logs? How does it find the code? How does it create a patch PR? **Yes, you need to give GitHub access (token + repo)** for real PRs.
- **Implementation plan**: [docs/IMPLEMENTATION_PLAN.md](docs/IMPLEMENTATION_PLAN.md) – Architecture, Loki API, checklist, and GitHub env for PRs.
- **Optional env** (in `.env.local`) for Loki:
  - `LOKI_URL` – Loki base URL (enables *calling* Loki; does **not** auto-poll – you need "Load from Loki" or a webhook to trigger).
  - `GRAFANA_LOKI_API_TOKEN` – API token if your Loki instance requires auth.
  - `GRAFANA_LOKI_USER` – User for Basic auth (optional).
- **GitHub (backend only)** for creating patch PRs: `GITHUB_TOKEN`, `GITHUB_REPO` – see [docs/HOW_IT_WORKS.md](docs/HOW_IT_WORKS.md).
- **AI behavior**: The agent classifies findings as **runtime_error**, **security_vulnerability**, **performance**, **config**, or **connectivity**, and can return **CVE IDs** and **affected_components**.

## What’s included

- **Load from Loki**: In the sidebar, click **Load from Loki** → enter LogQL (e.g. `{job="auth-api"}`), service, time range → logs are fetched (via backend proxy or direct Loki) and a new incident is created. Then click **Run Autonomous Diagnosis**.
- **Grafana webhook**: `POST /api/webhook/grafana` – send Grafana alert payload; response is an incident with logs from Loki (backend must have `LOKI_URL` set).
- **Create PR**: When you click **Approve** on a remediation, the backend creates a GitHub branch, applies the suggested patch (or writes it to `patches/`), and opens a Pull Request. Requires `GITHUB_TOKEN` and `GITHUB_REPO` in backend env.
