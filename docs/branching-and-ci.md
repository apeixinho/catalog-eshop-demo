# Branching and CI promotion

This repo uses a **promotion ladder** for integration and release validation. CI runs on GitHub Actions; there is no deploy pipeline yet.

## Branch roles

| Branch | Purpose |
|--------|---------|
| `feature/*` | Short-lived work; open PRs into `dev` |
| `dev` | Integration branch — Dependabot targets here; day-to-day merges land here |
| `staging` | Pre-release lane — MariaDB compose smoke on every PR/push |
| `main` | Release tip — same stack smoke as `staging` |

Typical flow:

```
feature/* ──PR──► dev ──PR──► staging ──PR──► main
```

## What CI runs where

### Per-service unit CI (path-filtered)

Runs when files under the matching path change (any branch):

| Workflow | Path | Steps |
|----------|------|-------|
| Frontend CI | `frontend/**` | Vitest (`test:ci`) → build |
| Backend CI | `backend/**` | `mvn -B verify package` (JaCoCo **≥75%** instruction coverage) |
| Auth Server CI | `auth-server/**` | `mvn -B test package` |
| Payment Service CI | `payment-service/**` | `mvn -B test package` |
| Stack CI | Compose / `e2e/**` paths | Dev/staging Compose smoke; Playwright on `dev` |

Frontend CI uses Node 22 (Angular 22 requires Node ≥ 22.22.3 locally; CI resolves a compatible 22.x).

These jobs are **fast feedback** but path-filtered — do **not** use them as required branch checks unless you add separate “gate” jobs (see [Why not require unit CI?](#why-not-require-unit-ci)).

### Stack CI (Compose smoke)

See [Stack CI workflow](../.github/workflows/stack-ci.yml):

| Trigger | Compose smoke |
|---------|----------------|
| PR or push to `dev` | Always **`Compose dev smoke`** (`compose.dev.yml`, H2) |
| PR or push to `staging` / `main` | Always **`Compose staging smoke`** (`compose.staging.yml`, MariaDB + nginx) |
| Stack files change (`compose*.yml`, Dockerfiles, `.env.example`, …) | Also **`Compose staging smoke`** on any branch |

Smoke = `docker compose up --build --wait`, curl health/products/SPA, then Playwright (`e2e/`) on **`dev`** (locale pinned to US English in the test).

**Required check names** (exact job `name:` values — use these in Rulesets):

| Job name | When it runs |
|----------|----------------|
| `Compose dev smoke` | Every PR/push targeting `dev` |
| `Compose staging smoke` | Every PR/push targeting `staging` or `main`; also stack-file changes elsewhere |

## Promoting changes

### Normal path (preferred)

1. Merge feature work into `dev` (`Compose dev smoke` + unit CI on changed paths).
2. Open PR **`dev` → `staging`** when ready to validate the full stack on MariaDB.
3. After staging CI is green, open PR **`staging` → `main`**.

### When `staging` breaks before `dev` is promoted

If `staging`/`main` fails on dependency drift while the fix is already on `dev`:

1. Cherry-pick or open a focused fix PR **directly to `staging`** (as with the Angular peer-deps fix).
2. Merge the staging fix first so promotion PRs unblock.
3. **Close redundant `dev` → `staging` PRs** if branch tips already match — see below.

### Empty diff but GitHub still shows file changes

GitHub PRs use a **three-dot diff** (merge base → head). After a cherry-pick, `staging` and `dev` can have **identical trees** but **different commit SHAs**, so:

- `git diff staging dev` → empty (tips match)
- `git diff staging...dev` → may still list files

Before merging a promotion PR, confirm tip equality:

```bash
git fetch origin
git diff origin/staging origin/dev   # should be empty when nothing to promote
```

If empty, close the PR instead of merging duplicate history.

## Dependabot

Configuration: [`.github/dependabot.yml`](../.github/dependabot.yml)

- All bumps target **`dev`**.
- **npm:** `@angular/*` updates are **grouped** into one weekly PR — merge as a unit to avoid peer dependency mismatches.
- **Maven:** `org.springframework.boot:*` bumps are grouped per service.
- **GitHub Actions:** grouped weekly bump on `dev`.

Frontend runtime `@angular/*` versions are **pinned exactly** in `frontend/package.json` (no `^`). After a Dependabot Angular PR merges, run locally:

```bash
cd frontend && npm ci && npm run test:ci && npm run build
```

---

## GitHub Rulesets (branch protection)

Branch protection is configured in **GitHub repository settings**, not in this repo. Use **Rulesets** (recommended over legacy branch protection) so each promotion branch gets the right required checks.

Official reference: [Creating rulesets for a repository](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository).

### Prerequisites

1. **Admin access** to `apeixinho/catalog-eshop-demo` (Settings → Rules → Rulesets requires it).
2. **At least one green Stack CI run** on each branch so job names appear in the status-check picker:
   - Merge or run Stack CI on a PR into `dev` → registers `Compose dev smoke`.
   - Same for `staging` / `main` → registers `Compose staging smoke`.
3. If a check name is missing from the dropdown, open a PR, wait for Stack CI to finish, then refresh the Ruleset editor.

### UI map (where to click)

```
GitHub repo  →  Settings  →  Rules  →  Rulesets  →  New branch ruleset
```

Legacy alternative (not recommended for new setup):

```
Settings  →  Branches  →  Add branch protection rule
```

### Ruleset 1 — Integration (`dev`)

**Goal:** every merge to `dev` passes full dev Compose smoke; no direct pushes.

| Step | Screen / field | Value |
|------|----------------|-------|
| 1 | **Ruleset name** | `Integration (dev)` |
| 2 | **Enforcement status** | Active |
| 3 | **Bypass list** | Empty (or repo admins only, if you need emergency merges) |
| 4 | **Target branches** → Add target | **Include by pattern** → `dev` |
| 5 | **Branch rules** | Enable **Restrict deletions** (optional) |
| 6 | **Branch rules** | Enable **Require a pull request before merging** |
| 7 | Under pull request | **Required approvals:** `0` (team can tighten later) |
| 8 | **Branch rules** | Enable **Require status checks to pass** |
| 9 | **Required checks** → search/add | **`Compose dev smoke`** only |
| 10 | **Require branches to be up to date** | Enabled (strict) |
| 11 | **Create** | Save ruleset |

**What you should see on a PR into `dev`:**

```
Checks
  ✓ Compose dev smoke          ← required; blocks merge if red
  ✓ Frontend CI / build        ← optional; runs only if frontend/** changed
  ✓ Backend CI / build         ← optional; path-filtered
  …
```

### Ruleset 2 — Pre-Release (`staging`)

**Goal:** MariaDB/nginx stack validated before integration promotes to staging.

| Step | Screen / field | Value |
|------|----------------|-------|
| 1 | **Ruleset name** | `Pre-Release (staging)` |
| 2 | **Target branches** | Include by pattern → `staging` |
| 3 | **Require a pull request before merging** | Enabled (0 approvals, or 1 if you prefer) |
| 4 | **Require status checks to pass** | Enabled |
| 5 | **Required checks** | **`Compose staging smoke`** |
| 6 | **Require branches to be up to date** | Enabled |
| 7 | **Create** | Save |

Promotion PR **`dev` → `staging`** must show green **`Compose staging smoke`** before merge.

### Ruleset 3 — Release (`main`)

**Goal:** same stack gate as staging; **one approving review** before the release tip moves (blocks merge until a reviewer approves).

| Step | Screen / field | Value |
|------|----------------|-------|
| 1 | **Ruleset name** | `Release (main)` |
| 2 | **Target branches** | Include by pattern → `main` |
| 3 | **Require a pull request before merging** | Enabled |
| 4 | **Required approvals** | `1` (recommended for `main`) |
| 5 | **Require status checks to pass** | Enabled |
| 6 | **Required checks** | **`Compose staging smoke`** |
| 7 | **Require branches to be up to date** | Enabled |
| 8 | **Create** | Save |

### Visual checklist (PR merge button)

When rulesets are correct, the PR sidebar looks like this before merge:

**PR → `dev`**

```
☑ All checks have passed
  ✓ Compose dev smoke          (required)
  ✓ Backend CI / build         (not required; may be skipped)

☑ Merging is allowed
```

**PR → `staging` or `main`**

```
☑ All checks have passed
  ✓ Compose staging smoke      (required)

☑ Merging is allowed
(☑ 1 approving review          — main only, if configured)
```

If merge is blocked with *“Required status check … is expected”*, the check never ran or the name does not match — see [Troubleshooting](#troubleshooting).

### Why not require unit CI?

Path-filtered workflows (**Frontend CI**, **Backend CI**, etc.) **skip** when their paths are untouched. GitHub treats skipped jobs as **not passing** required checks, so a backend-only PR would never merge if `Frontend CI / build` were required.

| Approach | Pros | Cons |
|----------|------|------|
| Require **`Compose * smoke` only** | Always runs; one stable job name | Slower (~10–20 min per PR to `dev`) |
| Require unit CI jobs | Faster per-service signal | Needs extra “gate” jobs or always-run wrappers |
| No rulesets | Fast merges | Broken stack can land on `dev`/`main` |

This repo uses **compose smoke as the merge gate** and unit CI as **advisory fast feedback**.

### Verify rulesets after saving

```bash
# List rulesets (requires gh auth with repo admin)
gh api repos/apeixinho/catalog-eshop-demo/rulesets --jq '.[].name'

# Open a test PR and confirm required checks in the UI
gh pr checks <PR_NUMBER>
```

Expected `gh pr checks` output for a PR into `dev` (after Stack CI completes):

```
Compose dev smoke    pass    …    Stack CI
build                pass    …    Backend CI    # if backend changed
```

### Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| Check name not in Ruleset dropdown | Job never ran on that branch | Open a PR, wait for Stack CI green, retry |
| “Expected — waiting for status” forever | Wrong name (e.g. `Stack CI` instead of job name) | Use **`Compose dev smoke`** / **`Compose staging smoke`** exactly |
| PR blocked but all visible checks green | Required check was **skipped** | Remove path-filtered jobs from required list |
| Direct push to `dev` still works | Ruleset not active or wrong pattern | Confirm target `dev` and **Enforcement status: Active** |
| Both compose jobs run on one PR | PR targets `staging` from a branch that also triggers dev | Normal for promotion PRs — only staging check is required |

### Optional: legacy branch protection

If Rulesets are unavailable, use **Settings → Branches → Add rule** with the same check names. Rulesets are preferred because they support multiple named policies and clearer bypass controls.

---

## Related docs

- [Dev and staging environments](dev-and-staging-environments.md) — Compose ports, MariaDB, env vars
- [OAuth2 access policy](oauth2-access-policy.md) — JWT checkout vs payment webhook
- [Root README](../README.md) — Quick start and CI overview
