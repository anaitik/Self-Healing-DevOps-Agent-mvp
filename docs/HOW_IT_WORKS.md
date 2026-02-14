# How HealFlow Works: Loki, Errors, Code, and PRs

This doc answers: **Does adding LOKI_URL auto-check logs?** • **How does it find the code for an error?** • **How does it create a patch PR?** • **Do we need GitHub access?**

---

## 1. If I put LOKI_URL in .env, will it check for logs and errors?

**Short answer: No, not automatically.**

- Putting **`LOKI_URL`** in `.env.local` only **enables** the app to talk to Loki. It does **not** start any background job that polls Loki for logs.
- Today, incidents are still loaded from **mock data** in the sidebar. Nothing calls Loki until you add one of these:
  1. **"Load from Loki" in the UI** – You (or we) add a button/modal where you enter a LogQL query (e.g. `{job="auth-api"} |= "error"`) and optional time range. The app then calls `fetchLogsFromLoki()` / `fetchIncidentFromLoki()`, creates an incident with those logs, and you can click **"Run Autonomous Diagnosis"**.
  2. **Grafana alert webhook** – A small backend receives Grafana alert webhooks, fetches logs from Loki using labels from the alert, creates an incident, and (optionally) runs diagnosis. The UI would then show that incident.

So: **LOKI_URL = “we can read Loki when something triggers a request.”** To actually “check for logs and errors,” you need either the UI flow or the webhook backend to trigger that request.

---

## 2. If it finds an error, how does it look for the “respective code”?

**Short answer: It infers from log text only; it does not have access to your repo.**

- The AI (Gemini) receives **only** what we send in the prompt: **incident metadata + log lines** (timestamp, level, message). It does **not** see your GitHub repo, file tree, or source code.
- So it “finds” the relevant code by **interpreting the log messages** (e.g. “Connection timeout at redis-prod-01”, “TypeError in auth-service.ts line 42”, “CVE-2024-1234 in package lodash”). From that, it suggests:
  - **Root cause** and **recommended fix** (text).
  - **`suggested_code_patch`** – a **text patch or snippet** (e.g. a diff or code block) that *would* fix the issue, based on what the logs imply.

To actually **map that to your repo and apply it** you need a **backend (or script)** that:

1. Has access to the repo (clone or GitHub API).
2. Uses the AI’s suggestion (file path / function name if the logs mention it, or a search by error message / stack trace) to **locate the file(s)**.
3. Applies the **suggested_code_patch** (or a transformed version of it) to the right file.
4. Commits and opens a PR (see below).

So today: **HealFlow suggests the fix from logs; a separate step (backend + repo access) is needed to “look up” the real file and apply the patch.**

---

## 3. How does it “release a patch PR”?

**Short answer: Right now it doesn’t. “Approve” is mocked. To really create a PR you need a backend + GitHub access.**

- In the app, **Approve** currently only:
  - Waits 2 seconds (simulated API call).
  - Marks the incident as **RESOLVED** in the UI.
- It does **not** call GitHub (or GitLab), create a branch, apply a patch, or open a Pull Request.

To **actually create a patch PR** you need:

1. **GitHub (or GitLab) access** – token + repo identifier (see below).
2. **A backend** (e.g. Node/Express) that:
   - Exposes an endpoint like `POST /api/remediate` with `{ incidentId, remediationPlan }`.
   - Creates a new branch (e.g. from `main`).
   - Applies the `suggested_code_patch` to the right file (using repo access and optionally the “find code” logic above).
   - Commits with `suggested_commit_message`, pushes the branch.
   - Opens a Pull Request via GitHub API (or GitLab API).
3. **Frontend** – “Approve” would call this backend instead of the mock.

So: **Yes, you need to “give access” to the GitHub project (token + repo) and run a backend that uses that access to create the PR.**

---

## 4. Don’t we have to give access to that GitHub project too?

**Yes.** To create a real patch PR, HealFlow (via a backend) needs:

| What | Purpose |
|------|--------|
| **GitHub token** | Create branch, commit, push, open PR. Use a Fine-Grained PAT or Classic PAT with `contents` (read/write) and `pull_requests` (read/write), or scope `repo`. |
| **Repo identifier** | Which repo to patch, e.g. `owner/repo` (e.g. `myorg/my-service`). |

These should **not** be in the frontend (browser). Put them in **backend env** (e.g. `.env` on the server):

```bash
# Backend .env (server only – do not expose in frontend)
GITHUB_TOKEN=ghp_xxxx...
GITHUB_REPO=your-org/your-repo
```

The backend then uses the GitHub API (e.g. REST or Octokit) to:

- Create branch `fix/incident-xxx`.
- Create/update file(s) with the suggested patch (or a diff applied to the right path).
- Commit, push, create Pull Request.

---

## 5. End-to-end flow (what exists vs what you add)

| Step | Today | What you need for “full” flow |
|------|--------|--------------------------------|
| 1. Get logs | Mock incidents only | **LOKI_URL** + UI “Load from Loki” or Grafana webhook backend |
| 2. Find errors | You run “Run Autonomous Diagnosis” on an incident | Same; optionally backend auto-triggers diagnosis when webhook fires |
| 3. AI suggests fix | Yes – root cause + `suggested_code_patch` | No change |
| 4. “Find” code in repo | AI infers from logs only | Backend with repo access + logic to map suggestion → file/line and apply patch |
| 5. Create patch PR | No – Approve is mock | **GITHUB_TOKEN** + **GITHUB_REPO** + backend that creates branch, applies patch, opens PR |

So:

- **LOKI_URL in .env** → app *can* read Loki when you (or a webhook) trigger a request; it does **not** auto-check logs.
- **Finding “respective code”** → AI suggests a patch from logs; a backend with repo access is needed to map that to real files and apply it.
- **Releasing a patch PR** → you **do** need to give access to the GitHub project (token + repo) and implement a backend that creates the PR.

If you want, next step can be: (1) add a “Load from Loki” UI so that with LOKI_URL set you can pull logs and run diagnosis, and/or (2) sketch the backend API and GitHub PR flow (env vars, endpoints, and high-level steps).
