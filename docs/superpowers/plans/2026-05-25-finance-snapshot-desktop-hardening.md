# Finance Snapshot Desktop Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the desktop `personal-os` finance snapshot workflow explain write readiness and blockers clearly while preserving API-owned durable writes.

**Architecture:** Add a small shared `internal/systemstatus` package for repo/cache status and doctor blockers, reuse it from the API and CLI doctor, then render those blockers in the existing Vue single-page UI. Keep create/correct writes on the existing `AssetStore` path and keep `snapshot.void` out of the UI.

**Tech Stack:** Go 1.25, Vue 3 + TypeScript + Naive UI, Playwright, Git-backed `personal-assets`, SQLite cache.

---

## File Map

- Create: `personal-os/internal/systemstatus/status.go`
  - Owns `Status`, `Blocker`, `Report`, `Collect`, and blocker assessment.
- Modify: `personal-os/apps/api/main.go`
  - Use `systemstatus.Collect` for `/api/system/cache/status` and `/api/system/doctor`.
- Modify: `personal-os/apps/api/dto.go`
  - Remove duplicated `StatusResp` or replace it with an alias if needed.
- Modify: `personal-os/tools/doctor/main.go`
  - Reuse `systemstatus.Report` and output `{ok,status,blockers}`.
- Modify: `personal-os/apps/api/main_test.go`
  - Add doctor tests for clean, dirty, stale cache states.
- Modify: `personal-os/apps/web/src/api/finance.ts`
  - Add status blocker types if the Web consumes doctor response; otherwise keep cache status shape unchanged.
- Modify: `personal-os/apps/web/src/App.vue`
  - Add write blocker computed state and render write readiness in snapshot/status panels.
- Modify: `personal-os/apps/web/src/style.css`
  - Add compact desktop styles for blocker lists and status rows.
- Modify: `personal-os/apps/web/e2e/finance-snapshot.spec.ts`
  - Assert duplicate-date and dirty-repo blockers in the Web.
- Modify: `personal-os/docs/api.md`
  - Document doctor blockers and current V1 desktop-only scope.

## Task 1: Shared System Status

**Files:**
- Create: `personal-os/internal/systemstatus/status.go`

- [ ] **Step 1: Create status types and collector**

```go
package systemstatus

import (
	"context"
	"os"

	"github.com/walker-qiang/personal-os/internal/config"
	financecache "github.com/walker-qiang/personal-os/packages/finance-cache"
)

type Status struct {
	AssetRepoPath     string `json:"asset_repo_path"`
	AssetRepoExists   bool   `json:"asset_repo_exists"`
	AssetRepoDirty    bool   `json:"asset_repo_dirty"`
	CurrentCommit     string `json:"current_commit"`
	CachePath         string `json:"cache_path"`
	CacheExists       bool   `json:"cache_exists"`
	CacheSourceCommit string `json:"cache_source_commit"`
	CacheBuiltAt      string `json:"cache_built_at"`
	CacheFresh        bool   `json:"cache_fresh"`
	AssetCount        int    `json:"asset_count"`
	SnapshotCount     int    `json:"snapshot_count"`
	TargetCount       int    `json:"target_count"`
	Error             string `json:"error,omitempty"`
}
```

- [ ] **Step 2: Add blocker/report helpers**

```go
type Blocker struct {
	Code     string `json:"code"`
	Label    string `json:"label"`
	Detail   string `json:"detail"`
	Severity string `json:"severity"`
	Action   string `json:"action"`
}

type Report struct {
	OK       bool      `json:"ok"`
	Status   Status    `json:"status"`
	Blockers []Blocker `json:"blockers"`
}

func ReportFor(status Status) Report {
	blockers := Blockers(status)
	return Report{OK: len(blockers) == 0, Status: status, Blockers: blockers}
}
```

- [ ] **Step 3: Wire exact blocker codes**

Use these blocker codes only:

```text
asset_repo_missing
asset_repo_dirty
cache_missing
cache_error
cache_stale
```

## Task 2: API and CLI Doctor

**Files:**
- Modify: `personal-os/apps/api/main.go`
- Modify: `personal-os/apps/api/dto.go`
- Modify: `personal-os/tools/doctor/main.go`
- Test: `personal-os/apps/api/main_test.go`

- [ ] **Step 1: Add API tests first**

Add tests named:

```go
func TestDoctorEndpointReportsCleanStatus(t *testing.T)
func TestDoctorEndpointReportsDirtyRepoBlocker(t *testing.T)
func TestDoctorEndpointReportsStaleCacheBlocker(t *testing.T)
```

Each test should decode:

```go
var resp struct {
	OK       bool `json:"ok"`
	Blockers []struct {
		Code string `json:"code"`
	} `json:"blockers"`
}
```

- [ ] **Step 2: Run failing API tests**

Run:

```bash
go test ./apps/api -run 'TestDoctorEndpointReports' -count=1
```

Expected before implementation: compile failure or missing `blockers`.

- [ ] **Step 3: Update API to use `systemstatus`**

Replace the local status implementation with:

```go
func (a *API) cacheStatus(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, systemstatus.Collect(r.Context(), a.cfg))
}

func (a *API) doctor(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, systemstatus.ReportFor(systemstatus.Collect(r.Context(), a.cfg)))
}
```

- [ ] **Step 4: Update CLI doctor**

Make `tools/doctor/main.go` marshal `systemstatus.ReportFor(systemstatus.Collect(ctx, cfg))` and exit non-zero when `report.OK` is false.

- [ ] **Step 5: Run API tests**

Run:

```bash
go test ./apps/api -run 'TestDoctorEndpointReports' -count=1
```

Expected: PASS.

## Task 3: Web Write Readiness UI

**Files:**
- Modify: `personal-os/apps/web/src/App.vue`
- Modify: `personal-os/apps/web/src/style.css`

- [ ] **Step 1: Add blocker model in `App.vue`**

Add:

```ts
interface WriteBlocker {
  code: string;
  label: string;
  detail: string;
  severity: 'warning' | 'error';
  action: string;
}
```

- [ ] **Step 2: Derive `writeBlockers`**

Include blockers for repo missing, repo dirty, cache missing, cache error, cache stale, and duplicate snapshot. Duplicate blocker must use code `duplicate_snapshot_date`.

- [ ] **Step 3: Render write status**

Add one `NAlert` in the snapshot form with `data-testid="write-status"` and list items with `data-testid="write-blocker-${blocker.code}"`.

- [ ] **Step 4: Enrich runtime status card**

Add `Cache commit`, `Cache fresh`, `Repo dirty`, and a compact blocker list to the existing status card.

- [ ] **Step 5: Add CSS**

Add classes:

```css
.write-status {}
.write-blocker-list {}
.write-blocker-item {}
.status-blockers {}
.status-grid {}
```

Keep the desktop layout compact and do not add mobile-specific rules.

## Task 4: Web E2E Coverage

**Files:**
- Modify: `personal-os/apps/web/e2e/finance-snapshot.spec.ts`

- [ ] **Step 1: Extend existing duplicate-date assertions**

After create succeeds, assert:

```ts
await expect(page.locator('[data-testid="write-blocker-duplicate_snapshot_date"]')).toContainText('已有该资产快照');
```

- [ ] **Step 2: Add dirty repo assertion**

Create an untracked file in `assetsPath`, reload, and assert:

```ts
await expect(page.locator('[data-testid="write-blocker-asset_repo_dirty"]')).toContainText('未提交修改');
await expect(page.locator('[data-testid="snapshot-submit"]')).toBeDisabled();
```

- [ ] **Step 3: Clean the dirty fixture**

Delete the untracked file at the end of the test so the fixture repo is not left dirty.

## Task 5: Docs and Verification

**Files:**
- Modify: `personal-os/docs/api.md`

- [ ] **Step 1: Document doctor blockers**

Update the `/api/system/doctor` section to mention `blockers` and the five blocker codes.

- [ ] **Step 2: Run Go tests**

Run:

```bash
go test ./...
```

Expected: PASS.

- [ ] **Step 3: Run Web build**

Run from `personal-os/apps/web`:

```bash
npm run build
```

Expected: PASS.

- [ ] **Step 4: Run Web smoke/e2e**

Run from `personal-os`:

```bash
tools/smoke/finance-web-e2e.sh
```

Expected: PASS and output `finance web e2e ok`.
