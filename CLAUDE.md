# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Operating discipline for all models — read and follow literally:
@FABLE5_THINKING.md

## Quick project reference

| Project | Type | Status | Current version | Dev workflow |
|---------|------|--------|---|---|
| Work Log Dev | HTML app | Active | v1.6.6 | Edit `Project/Work Log Dev/`, sync to index, push beta |
| Work Log | HTML app (prod) | Active | v1.6.1 | Copy from dev after user approval, push origin |
| Work Log Shared | HTML read-only | Active | TBD | Independent version, own backup cycle |
| APP Test Case Testing | HTML (CIRQ XML multi-file) | Active | TBD | See CIRQ XML section below |
| Data Progress Report | HTML report | Active | TBD | Standalone, independent version |
| Project Manager | HTML app | — | TBD | Standalone |
| Task Manager | HTML app | — | TBD | Standalone |
| Work Log AI Proxy | Backend/util | — | TBD | Standalone |
| Pretty UI (Worklog UI test) | Theme test | Experimental | TBD | Test file only, never push to index.html |

---

## Project: Work Log

`Project/Work Log/worklog.html` is a single-file HTML app with no build step and no server. Open it directly in Chrome — there is no `npm install`, no compilation, and no dev server.

- All app logic, styles, and markup live in one file.
- Data is persisted in the browser's `localStorage`.
- Google Calendar/Tasks integration uses OAuth; the redirect URI must be `https://famelx.github.io/Work-Log/`.

## Running and driving the app

Use the `/run-worklog` skill to launch, screenshot, interact with, or verify the app programmatically. All commands run from the project root (`C:\Users\Uesr01\Desktop\Work Files\AI\`):

```powershell
# Screenshot (auto-launches Chrome if not running)
.\.claude\skills\run-worklog\driver.ps1 screenshot C:\Temp\out.png

# Evaluate JavaScript
.\.claude\skills\run-worklog\driver.ps1 eval "entries.length"

# Click a selector / set a field value
.\.claude\skills\run-worklog\driver.ps1 click ".btn-primary"
.\.claude\skills\run-worklog\driver.ps1 set "#f-name" "Task name"

# Add an entry end-to-end
.\.claude\skills\run-worklog\driver.ps1 add-entry "Work name" "Type" "2026-06-25"

# Stop the debug Chrome instance
.\.claude\skills\run-worklog\driver.ps1 stop
```

The driver uses `cdp.exe` (pre-compiled C# binary in `.claude/skills/run-worklog/`) over Chrome DevTools Protocol on port 9222. To rebuild:
```
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe /target:exe /out:.claude\skills\run-worklog\cdp.exe .claude\skills\run-worklog\cdp.cs
```

## Deployment workflow

There are two git remotes:
- `origin` → **production** (`famelx.github.io/Work-Log/`) — push only after user confirms
- `beta` → **staging** (`famelx.github.io/Work-Log-Beta/`) — push here first for testing

Workflow for every change:
1. Edit `Project/Work Log Dev/worklog dev.html` (development file)
2. Sync to `index.html`: `cp "Project/Work Log Dev/worklog dev.html" index.html`
3. Commit and push to beta: `git push beta main`
4. Wait for user to test on beta and approve
5. Copy to production folder: `cp "Project/Work Log Dev/worklog dev.html" "Project/Work Log/worklog.html"`
6. Push to production: `git push origin main`

**Never push to `origin` without explicit user confirmation.**

### Pre-push checklist (beta or origin)

Before any push:
1. Bump version number in file (topbar + file comment line 1)
2. Create timestamped backup in `PROJECT_BACKUP/` (see "All projects: Versioning & 10-day backup retention" section)
3. Test via `/run-worklog` skill (screenshot, click, eval, add-entry)
4. Verify both light and dark theme if UI change
5. Verify empty state and edge cases if logic change

## Key form selectors

| Field | Selector |
|---|---|
| Work name | `#f-name` |
| Type dropdown | `#f-type` |
| Start/deadline date | `#f-deadline` |
| End date | `#f-deadline-end` |
| Task due date | `#f-deadline-task` |
| Event start time | `#f-time` |
| Event end time | `#f-time-to` |
| Add entry | `.btn-primary` |
| Event mode toggle | `#mode-event-btn` |
| Task mode toggle | `#mode-task-btn` |

Valid type values: `Meeting`, `Review`, `Report`, `Research`, `Other` (plus any user-added custom types).

## Architecture

The JS is organized into clearly-labelled sections (search for `// ──`):

| Section | What it does |
|---|---|
| State | `let` globals: `entries`, `archived`, `trash`, `gcalToken`, `filterType`, `sortMode`, `editingId`, etc. |
| Settings state | `customTypes`, `typeColors`, `typeGCalIds`, `uiColors` |
| OAuth token auto-capture | Reads `#access_token` from redirect URL on page load |
| Init | `initializeTimePickers()`, sets sync mode, populates selects |
| CRUD | `addEntry`, `deleteEntry`, `archiveEntry`, `restoreEntry`, `startEdit`, `saveEdit`, `save` |
| Due/Overdue Alert Modal | `checkDueOverdue()` — runs on load to surface overdue/due-today entries |
| Time Picker | Custom scroll-wheel picker replacing native `<input type="time">` |
| Render / Sort | `render()`, `sorted()`, `entryHTML()`, `deadlineStatus()` |
| Export | CSV, JSON, XLSX |
| Toast | `toast(msg, dur)` |
| Google Calendar | OAuth, `pushToGCal`, `patchGCal`, `syncAllToGCal`, `buildGCalEvent` |
| Google Tasks | `pushToGTask`, `patchGTask` |
| Settings | UI for colours, custom types, GCal colour mapping |
| Changelog | Paginated modal, one page per version |
| AI Panel | Optional AI key (Groq/OpenAI-compatible), chat-style suggestions |

## Entry object schema

```js
{
  id: number,           // Date.now() at creation
  name: string,
  remark: string,
  type: string,
  deadline: string,     // YYYY-MM-DD (start date / only date)
  deadlineEnd: string,  // YYYY-MM-DD (end date for multi-day events, optional)
  time: string,         // HH:MM (event start time, optional)
  timeTo: string,       // HH:MM (event end time, optional)
  syncMode: 'event'|'task',
  gcalEventId: string,  // set after first push to GCal; used to PATCH instead of POST
  gtaskId: string,      // set after first push to GTasks
  createdAt: string,    // ISO timestamp
  updatedAt: string,    // ISO timestamp (updated on every saveEdit)
}
```

## localStorage keys

| Key | Contents |
|---|---|
| `wl2_entries` | Active entries array |
| `wl2_archived` | Archived entries array |
| `wl2_trash` | Trashed entries array |
| `wl2_gcal_token` | OAuth access token string |
| `wl2_custom_types` | User-added type names array |
| `wl2_type_colors` | `{ [type]: hexColor }` for entry card colour coding |
| `wl2_type_gcal_ids` | `{ [type]: gcalColorId }` (IDs 1–11 per Google Calendar API) |
| `wl2_ui_colors` | `{ accent, accentText, bg, surface, ... }` theme overrides |
| `wl2_ai_key` | AI API key |
| `wl2_ai_model` | AI model string |

## GCal integration notes

- **Duplicate prevention**: `pushToGCal(entry)` checks `entry.gcalEventId` first. If set, it calls `patchGCal` (HTTP PATCH). If not set, it POSTs a new event and stores the returned `id` back into the entry.
- **Silent sync**: `syncAllToGCal(silent=true)` suppresses per-entry toasts; only shows a final summary toast.
- **Color IDs**: GCal uses numeric IDs 1–11 mapped in `GCAL_COLOR_MAP` (hex) and `GCAL_COLOR_NAMES`. Stored per type in `wl2_type_gcal_ids`.
- **Multi-day events**: `buildGCalEvent` uses `deadlineEnd` for the event end date when present.
- **timeTo**: If `entry.timeTo` is set, used as the event end time; otherwise falls back to `entry.time`.

## Versioning

Format: `MAJOR.MINOR.PATCH`
- `MAJOR` — complete redesign or platform change (e.g. v2 → v3 would be a full rewrite)
- `MINOR` — feature bundle release (multiple features grouped together)
- `PATCH` — bug fixes only

Current production version: **v1.1.0**. Beta is ahead with unreleased features.
Version is displayed in the topbar and clicking it opens the Changelog modal.

## Other files

- `Project/Work Log Dev/worklog dev.html` — **active development file**; all new features go here first.
- `Project/Work Log/worklog.html` — production-approved version only; matches what's on `famelx.github.io/Work-Log/`.
- `Project/Work Log Shared/worklog-shared.html` — read-only shared view variant.
- `Project/TaskManagerPro.html` — separate task manager prototype, unrelated to Work Log.
- `Test Project/` — standalone HTML experiments, no relation to worklog.
- `REF/` — reference documents only; not deployed or executed.

---

## Project: Thailand APPS Certification (SITA CIRQ XML)

`APP Test Case Testing/` contains SITA iBorders APP certification materials for Thai Airways.

### Key files

| File | Purpose |
|---|---|
| `CIRQ_XML_ALL.html` | **Main deliverable** — all 86 test cases, one page each, with search + copy |
| `CIRQ_XML_Builder.html` | **Standalone builder** — form-based tool to generate a CIRQ XML for any custom traveller; fully independent from `CIRQ_XML_ALL.html` (no cross-links, separate output) |
| `CIRQ_XML_TC13-TC17.html` | Prototype for first 5 passengers (superseded by ALL) |
| `test_cases.json` | Extracted test case data (source of truth for passenger details) |
| `CIRQ In Ref.docx` | Reference XML for inbound check-in (TG320 DEL→BKK, TC66/67 format) |
| `CIRQ Out Ref.docx` | Reference XML for outbound check-in (TG321 BKK→DEL) |
| `Thailand_APPS_...xlsx` | Master test case spreadsheet (v3.17) |

### CIRQ XML architecture (`CIRQ_XML_ALL.html`)

The file is fully self-contained (no external deps). All 86 test cases are embedded as `RAW[]` in JavaScript and rendered client-side.

Key functions:
- `buildXML(r)` — generates the XML string for a test case; handles `CheckInTravellerRequest` vs `CancelTravellerRequest` automatically based on `direction`
- `highlightXML(xml)` — tokeniser-based syntax highlighter; produces coloured `<span>` output inside `<pre>`
- `flightInfo(dir, tcNo)` — maps direction → correct flight (TG320 or TG321) and all port/country/time fields
- `copyXML(tc, btn)` — clipboard copy with `execCommand` fallback for non-HTTPS
- `jumpToTC()` — search box handler; finds index in `RAW[]` by test number

### CIRQ XML Builder (`CIRQ_XML_Builder.html`)

Two-panel single-page app: form on the left, syntax-highlighted XML output on the right.

- Direction dropdown auto-populates all flight fields with the correct preset (same TG320/TG321 defaults as test cases).
- Multiple travel documents supported — add/remove rows; each row has Number, Type, Issuing State, Expiry.
- `buildXML()` assembles the XML string from form values; same `highlightXML()` tokeniser as `CIRQ_XML_ALL.html`.
- **Intentionally no link to `CIRQ_XML_ALL.html`** — the two files are fully independent. Do not add cross-navigation between them.

### CIRQ XML rules

| Direction | Root element | Flight |
|---|---|---|
| Inbound / Inbound Transit | `CheckInTravellerRequest` | TG320 DEL(IN)→BKK(TH), dep 23:30, arr 05:25+1 |
| Outbound / Outbound Transfer | `CheckInTravellerRequest` | TG321 BKK(TH)→DEL(IN), dep 10:30, arr 14:00 |
| Cancellation | `CancelTravellerRequest` | Inherits direction from prior TC via `CANCEL_DIR` map |

- `paxCrew === 'C'` → `<com:Type>OperatingCrew</com:Type>`; `'P'` → `Passenger`
- `override === 'A'` → `<com:OverrideCode><com:Type>Airline</com:Type>…`; `'G'` → `Government`; empty → omit block entirely
- TC 85–86 are Manifest/FlightClose requests — no CIRQ XML; rendered as a notice card instead
- Namespaces: `xmlns:app="http://sita.aero/iborders/APP/APPService/V1"`, `xmlns:com="http://sita.aero/iborders/APP/common/V1"`

### Test case sections

| TC range | Section |
|---|---|
| 1–41 | Passenger transactions |
| 42–80 | Crew transactions |
| 81–84 | Other airline transactions |
| 85–86 | Flight Close / Manifest |

### Regenerating test_cases.json

If the spreadsheet is updated, re-extract with PowerShell COM automation (Excel must be installed):

```powershell
$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$wb = $excel.Workbooks.Open("$PWD\APP Test Case Testing\Thailand_APPS_...xlsx")
$ws = $wb.Sheets.Item(1)
# Headers in row 6, data from row 7; skip blank rows and section-header rows
```

Date formats from Excel: DOB as `DDMonYYYY` (e.g. `01Jan1990`), expiry as `DD-Mon-YYYY` (e.g. `16-Jun-2030`). The HTML converts both to `YYYY-MM-DD` via `parseDOB()` / `parseExp()`.

---

## All projects: Versioning & 10-day backup retention

Every project in this workspace gets independent versioning + automatic backup. **No variants** — each distinct app/tool is its own project with its own version.

### Versioning format (all projects)

`MAJOR.MINOR.PATCH`
- `MAJOR` — complete redesign, platform change, or breaking changes
- `MINOR` — feature bundle release (multiple features grouped)
- `PATCH` — bug fixes, small improvements

### When to bump version

- **Patch**: bug fix, small improvement, UI tweak — bump in dev, push beta
- **Minor**: new feature shipped on dev; when promoting dev→prod if multiple commits since last prod bump
- **Major**: breaking changes, complete redesign only
- Always bump BEFORE creating backup and committing

### Version location by project type

| Project | Type | Version location | Backup folder |
|---------|------|------------------|---|
| Work Log Dev | HTML app (dev) | `#version-pill` in topbar + file comment line 1 | `PROJECT_BACKUP/` |
| Work Log | HTML app (prod) | `#version-pill` in topbar + file comment line 1 | `PROJECT_BACKUP/` |
| Work Log Shared | HTML app (read-only) | `#version-pill` in topbar + file comment line 1 | `PROJECT_BACKUP/` |
| Work Log AI Proxy | Backend/util | File comment line 1 (top) | `PROJECT_BACKUP/` |
| APP Test Case Testing (CIRQ XML) | HTML apps (multi-file) | File comment line 1 in each | `PROJECT_BACKUP/` |
| Data Progress Report | HTML report | `#version-badge` in topbar + file comment line 1 | `PROJECT_BACKUP/` |
| Project Manager | HTML app | `#version-badge` in topbar + file comment line 1 | `PROJECT_BACKUP/` |
| Task Manager | HTML app | `#version-badge` in topbar + file comment line 1 | `PROJECT_BACKUP/` |
| Pretty UI (Worklog UI test) | Theme test file | File comment line 1 (top) | `PROJECT_BACKUP/` |

### Backup workflow (every update)

When updating ANY project file and preparing to push/commit:

1. **Create timestamped backup:**
   ```powershell
   # Backup format: YYYY-MM-DD_HHMM_vX.Y.Z_filename.ext
   # Example: 2026-07-20_1430_v1.6.6_worklog.html
   
   mkdir "PROJECT_BACKUP" -ErrorAction SilentlyContinue
   Copy-Item "worklog dev.html" "PROJECT_BACKUP/$(Get-Date -Format 'yyyy-MM-dd_HHmm')_v1.6.6_worklog-dev.html"
   ```

2. **Prune backups older than 10 days:**
   ```powershell
   $cutoff = (Get-Date).AddDays(-10)
   Get-ChildItem "PROJECT_BACKUP/" -Filter "*.html", "*.json", "*.xlsx" | 
     Where-Object { $_.LastWriteTime -lt $cutoff } | 
     Remove-Item -Force
   ```

3. **Commit backup folder to git** (do NOT gitignore):
   ```powershell
   git add "PROJECT_BACKUP/"
   git commit -m "backup: v1.6.6 snapshot before [change description]"
   ```

### Why backups + git?

- **Rollback safety**: "Revert to yesterday's version" is a file copy, not archaeological git log diving
- **Audit trail**: see which version ran when, especially useful for production + beta dual-remote setup
- **Survive across machines**: backups travel with the repo, not stored locally
- **Dual-remote safety** (Work Log): beta + prod backups created once per push (not twice)

### Version bump triggers

Bump version **before every push/release/significant snapshot:**
- Work Log Dev → Beta push: bump DEV version, backup, push beta
- Work Log Dev → Production: bump PROD version, backup, push origin
- Any other project release: bump version, backup, push/commit
- Bug fix on DEV: patch bump; feature on DEV: minor bump

### Current versions (as of today)

| Project | Current |
|---------|---------|
| Work Log Dev | v1.6.6 |
| Work Log | v1.6.1 |
| Work Log Shared | Not yet versioned |
| Work Log AI Proxy | Not yet versioned |
| APP Test Case Testing (CIRQ XML ALL) | Not yet versioned |
| Data Progress Report | Not yet versioned |
| Project Manager | Not yet versioned |
| Task Manager | Not yet versioned |
| Pretty UI (Worklog UI test) | Not yet versioned |

---

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
