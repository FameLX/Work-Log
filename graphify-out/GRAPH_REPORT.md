# Graph Report - .  (2026-08-03)

## Corpus Check
- Large corpus: 104 files · ~868,716 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 845 nodes · 1799 edges · 81 communities (74 shown, 7 thin omitted)
- Extraction: 95% EXTRACTED · 5% INFERRED · 0% AMBIGUOUS · INFERRED: 94 edges (avg confidence: 0.68)
- Token cost: 0 input · 560,671 output

## Community Hubs (Navigation)
- Inhouse App User/Perm Management
- Inhouse App KM Checklist Editor
- Inhouse App CRUD Entities
- Inhouse App Host Detail/Theme
- Task Manager App
- Inhouse App Host Contact Forms
- Inhouse App Static Data Layer
- Animation Vocabulary Skill (.agents)
- Theme System (Misc)
- DateTime Picker Widget
- Coordinate Template Library App
- Inhouse App Template Management
- Date Picker Widget
- Emil Design/Find-Animation Skills (.claude)
- Due/Overdue Alert Modal
- Prototype Picker Skill (.agents)
- Check-in Push Backup Snapshots v1.0-1.1
- Emil Design/Find-Animation Skills (.agents)
- Improve-Animations Audit Skill (.agents)
- Time Picker Widget
- Output Layout Renderer (Misc)
- Pick-UI-Library Skill (.agents)
- Inhouse App Export/Theming Utils
- Improve-Animations Audit Skill (.claude)
- Inhouse App Cutover Status
- run-worklog SKILL Doc
- Emil Design/Review-Animations Skill (.agents)
- CDP Chrome Driver
- Inhouse App KM Page Renderer
- Inhouse App KM General Section
- Inhouse App KM Rich Editor
- Hex Palette Generator (Misc)
- Status Popup Widget (Misc)
- Inhouse App Engagement Home/Filter
- Inhouse App Export (CSV/XLSX)
- Inhouse App KM Sidebar
- Inhouse App KM Table Editor
- CE Logo Brand (Misc copy)
- Multi-Date Picker (Misc)
- Recurrence Picker (Misc)
- Timezone Converter (Misc)
- Inhouse App Nav/Logout
- Inhouse App Rich Text Table Edit
- CE Logo Brand (root copy)
- Export Data Widget (Misc)
- Fuzzy Date Search (Misc)
- Inhouse App Host Documents
- Inhouse App Referenced JS Modules
- Claude Code Portable Setup
- Date Input Masking (Misc)
- Fame Signature/Lizard GIF Assets
- Smart Tooltip Widget (Misc)
- Inhouse App Tree Checkbox State
- AI Chat Panel (Misc)
- Pixel Grid Widget (Misc)
- Work Log Backup Snapshots v1.6-1.7
- Inhouse App RTE Font Size Menu
- Inhouse App KM General Editors
- Worklog Driver Script
- Scream GIF Reaction Asset
- Inhouse App Nav History
- Inhouse App RTE Format Block
- Fable5 Workspace Non-Negotiables
- Misc/index.html (Work Log variant)

## God Nodes (most connected - your core abstractions)
1. `escapeHtml()` - 81 edges
2. `byId()` - 76 edges
3. `toast()` - 58 edges
4. `DB` - 57 edges
5. `route()` - 47 edges
6. `renderKmDataSubtab()` - 29 edges
7. `modalHeader()` - 27 edges
8. `uid()` - 26 edges
9. `Session` - 25 edges
10. `Modal` - 24 edges

## Surprising Connections (you probably didn't know these)
- `Find Animation Opportunities Skill (.agents)` --semantically_similar_to--> `Find Animation Opportunities Skill (.claude)`  [INFERRED] [semantically similar]
  .agents/skills/find-animation-opportunities/SKILL.md → .claude/skills/find-animation-opportunities/SKILL.md
- `Improve Animations Audit Playbook (.agents)` --semantically_similar_to--> `Improve Animations Audit Playbook (.claude)`  [INFERRED] [semantically similar]
  .agents/skills/improve-animations/AUDIT.md → .claude/skills/improve-animations/AUDIT.md
- `Improve Animations Plan Template (.agents)` --semantically_similar_to--> `Improve Animations Plan Template (.claude)`  [INFERRED] [semantically similar]
  .agents/skills/improve-animations/PLAN-TEMPLATE.md → .claude/skills/improve-animations/PLAN-TEMPLATE.md
- `Improve Animations Skill (.agents)` --semantically_similar_to--> `Improve Animations Skill (.claude)`  [INFERRED] [semantically similar]
  .agents/skills/improve-animations/SKILL.md → .claude/skills/improve-animations/SKILL.md
- `Review Animations Skill (.agents)` --semantically_similar_to--> `Review Animations Skill (.claude)`  [INFERRED] [semantically similar]
  .agents/skills/review-animations/SKILL.md → .claude/skills/review-animations/SKILL.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CDP Browser Automation Flow for Work Log** — claude_skills_run_worklog_skill_driver_script, claude_skills_run_worklog_skill_cdp_exe, claude_skills_run_worklog_skill_worklog_app [INFERRED 0.85]
- **Fable 5 Operating Discipline Pattern** — fable5_thinking_core_loop, fable5_thinking_evidence_discipline, fable5_thinking_verification_standards [INFERRED 0.85]
- **Motion Design Skill Family (.agents)** — agents_skills_animation_vocabulary_skill, agents_skills_apple_design_skill, agents_skills_emil_design_eng_skill, agents_skills_find_animation_opportunities_skill, agents_skills_improve_animations_skill, agents_skills_review_animations_skill, agents_skills_prototype_skill [INFERRED 0.75]
- **Improve-Animations Toolkit (.agents)** — agents_skills_improve_animations_skill, agents_skills_improve_animations_audit, agents_skills_improve_animations_plan_template [EXTRACTED 1.00]
- **Prototype Exploration Toolkit (.agents)** — agents_skills_prototype_skill, agents_skills_prototype_picker, agents_skills_pick_ui_library_skill [INFERRED 0.80]
- **GCal push/patch duplicate-prevention pattern reused across apps** — index_work_log_build_gcal_event, ce_ai_projects_task_manager_taskmanager_buildgcalevent, claude_gcal_integration_notes [INFERRED 0.80]
- **Reusable UI component/theme demo ecosystem (Component Library + Fame Easter Egg + Theme System demos)** — misc_component_library_app, misc_fame_easter_egg_demo_app, misc_fame_easter_egg_modal_app, misc_theme_system_demo_app [INFERRED 0.85]
- **Carrier Engagement team internal tooling suite (CE AI Projects)** — ce_ai_projects_coordinate_template_library_app, ce_ai_projects_pnr_checker_pnr_edifact_checker_app, ce_ai_projects_task_manager_taskmanager_app, ce_ai_projects_inhouse_app_prototype_1_inhouse_app_prototype_index_app [INFERRED 0.75]

## Communities (81 total, 7 thin omitted)

### Community 0 - "Inhouse App User/Perm Management"
Cohesion: 0.08
Nodes (79): activateUser(), applyPermissionPicker(), blankKmTable(), byId(), canEditKm(), closeAirlineDetailModal(), closeHostDetailModal(), confirmDuplicateChecklist() (+71 more)

### Community 1 - "Inhouse App KM Checklist Editor"
Cohesion: 0.04
Nodes (29): cancelKmGeneralEdit(), cancelKmPageEdit(), CHECKLIST_STEPS, copyQuickSumNarrative(), currentRoute(), engFilters, exportKmPdf(), forgotPasswordAttempts (+21 more)

### Community 2 - "Inhouse App CRUD Entities"
Cohesion: 0.08
Nodes (33): addTplConditionRow(), CRUD_ENTITIES, crudFieldDisplay(), deleteCrudItem(), escapeHtml(), kmGeneralCoopInternalHtml(), openTemplateEditForm(), pageFooter() (+25 more)

### Community 3 - "Inhouse App Host Detail/Theme"
Cohesion: 0.11
Nodes (31): airlineHostSummary(), applyTheme(), cancelHostDetailEdit(), hasPerm(), hostDetailDataTypeLabel(), isAdmin(), loadThemeForCurrentUser(), navHistoryButtonsHtml() (+23 more)

### Community 4 - "Task Manager App"
Cohesion: 0.08
Nodes (28): Task Manager Pro (app), applyTheme / applyHeaderColor (header color theming), buildGCalEvent (task-to-GCal event builder), Task Manager localStorage schema (tm_tasks_v6, tm_countries, tm_projects, tm_members, tm_statuses, tm_priorities), saveTask / deleteTask / toggleComplete (task CRUD), GCal integration notes (CLAUDE.md), Task Manager Project (CLAUDE.md quick reference), Work Log Project (CLAUDE.md) (+20 more)

### Community 5 - "Inhouse App Host Contact Forms"
Cohesion: 0.13
Nodes (27): addHostContactRow(), fmtDateTime(), hostContactRowHtml(), modalHeader(), openAirlineForm(), openChecklistForm(), openChecklistItemForm(), openCrudForm() (+19 more)

### Community 6 - "Inhouse App Static Data Layer"
Cohesion: 0.09
Nodes (21): assignTocIds(), ckBanner(), ckId(), ckItem(), cloneTocTree(), DEFAULT_DB, HOST_CONNECTIVITY_CHECKLIST_ITEMS, IAPI_LA_CHECKLIST_ITEMS (+13 more)

### Community 7 - "Animation Vocabulary Skill (.agents)"
Cohesion: 0.08
Nodes (26): Animation Vocabulary Skill (.agents), Origin-aware Animation, Reduced Motion, Rubber-banding, Spring (glossary term), Stagger, Apple Design Skill (.agents), Apple's Eight Design Principles (+18 more)

### Community 8 - "Theme System (Misc)"
Cohesion: 0.26
Nodes (23): applySavedTheme(), applyTokenSet(), buildCustomEditor(), clearThemeOverrides(), createThemeSystem(), deleteSavedTheme(), loadSavedThemes(), loadTheme() (+15 more)

### Community 9 - "DateTime Picker Widget"
Cohesion: 0.24
Nodes (21): applyDisplay(), calendarIconSvg(), createDateTimeTrigger(), dtpClear(), dtpClose(), dtpCompose(), dtpOnSelChange(), dtpOnTimeBlur() (+13 more)

### Community 10 - "Coordinate Template Library App"
Cohesion: 0.11
Nodes (21): Coordinate Template Library (app), applyAccent / theme accent-color system, buildZulipMarkdownTable / buildEmailTableHtml (dual-format table builders), defTpl (default template seed data), Dual email/Zulip type taxonomy (intTypes/zIntTypes, coordTypes/zCoordTypes, fuTypes/zFuTypes, maTypes/zMaTypes), renderLibTable (template library table renderer), TableBlot (custom Quill table blot), PNR EDIFACT Checker (app) (+13 more)

### Community 11 - "Inhouse App Template Management"
Cohesion: 0.16
Nodes (19): bulkDeleteTemplates(), clearTemplateSelection(), deleteTemplate(), openTemplatePopup(), openTemplatePreview(), renderTemplatePopupBody(), renderTemplatesPage(), renderTemplatesPageBody() (+11 more)

### Community 12 - "Date Picker Widget"
Cohesion: 0.27
Nodes (18): applyDisplay(), calendarIconSvg(), createDateTrigger(), dpClear(), dpClose(), dpOnSelChange(), dpOnTriggerBlur(), dpOnTriggerInput() (+10 more)

### Community 13 - "Emil Design/Find-Animation Skills (.claude)"
Cohesion: 0.13
Nodes (17): Animation Decision Framework, Find Animation Opportunities Skill (.claude), Delight Budget, Frequency Tiers, Purpose Taxonomy, The Gate (four-question filter), Easing & Duration Audit Category, Purpose & Frequency Audit Category (+9 more)

### Community 14 - "Due/Overdue Alert Modal"
Cohesion: 0.26
Nodes (16): buildRow(), checkDueAlerts(), classify(), closeDueAlerts(), closeIconSvg(), daysUntil(), ensureOverlay(), formatDisplay() (+8 more)

### Community 15 - "Prototype Picker Skill (.agents)"
Cohesion: 0.13
Nodes (16): Prototype Picker Spec (.agents), Highlight Slide Animation, Keyboard Behavior Contract, Proto-picker Component, Prototype Skill (.agents), Picker Harness, Prototyping Workflow, Variant Divergence Principle (+8 more)

### Community 16 - "Check-in Push Backup Snapshots v1.0-1.1"
Cohesion: 0.12
Nodes (16): checkin-push v1.0.0 snapshot, checkin-push v1.0.1 snapshot, checkin-push v1.0.2 snapshot, checkin-push v1.0.3 snapshot, checkin-push v1.1.0 snapshot, checkin-push v1.1.1 snapshot, checkin-push v1.1.2 snapshot, checkin-push v1.1.3 snapshot (+8 more)

### Community 17 - "Emil Design/Find-Animation Skills (.agents)"
Cohesion: 0.15
Nodes (15): Animation Decision Framework, Find Animation Opportunities Skill (.agents), Delight Budget, Frequency Tiers, Purpose Taxonomy, The Gate (four-question filter), Purpose & Frequency Audit Category, Review Animations Skill (.agents) (+7 more)

### Community 18 - "Improve-Animations Audit Skill (.agents)"
Cohesion: 0.15
Nodes (14): Improve Animations Audit Playbook (.agents), Accessibility Audit Category, Easing & Duration Audit Category, Performance Audit Category, Physicality & Origin Audit Category, Improve Animations Plan Template (.agents), Feel Check, Plan Boundaries (+6 more)

### Community 19 - "Time Picker Widget"
Cohesion: 0.32
Nodes (12): h(), buildColumn(), clearTimePicker(), closeAllPickers(), createTimePicker(), getSelectedValue(), pad2(), parseTimeString() (+4 more)

### Community 20 - "Output Layout Renderer (Misc)"
Cohesion: 0.33
Nodes (12): buildItemEl(), computeThreshold(), copyItem(), createOutputLayout(), currentCols(), doCopy(), fallbackCopy(), measureWidestContent() (+4 more)

### Community 21 - "Pick-UI-Library Skill (.agents)"
Cohesion: 0.17
Nodes (12): Pick UI Library Skill (.agents), base-ui, Motion (Framer Motion), Sonner (toast library), Virtuoso, zustand, Pick UI Library Skill (.claude), base-ui (+4 more)

### Community 22 - "Inhouse App Export/Theming Utils"
Cohesion: 0.21
Nodes (11): argb(), computeAccentTokens(), darkenHex(), downloadExcelWorkbook(), exportProgressReport(), fillCell(), hexToHsl(), hslToHex() (+3 more)

### Community 23 - "Improve-Animations Audit Skill (.claude)"
Cohesion: 0.18
Nodes (12): Improve Animations Audit Playbook (.claude), Accessibility Audit Category, Performance Audit Category, Physicality & Origin Audit Category, Improve Animations Plan Template (.claude), Feel Check, Plan Boundaries, Plan Template Structure (+4 more)

### Community 24 - "Inhouse App Cutover Status"
Cohesion: 0.22
Nodes (11): airlineDetailDataTypeLabel(), airlineDetailHostOptions(), cancelAirlineDetailEdit(), CUTOVER_DIRECTIONS, GO_LIVE_STATUSES, openAirlineDetailModal(), relevantAirlineChecklists(), renderAirlineDetailEditHtml() (+3 more)

### Community 25 - "run-worklog SKILL Doc"
Cohesion: 0.18
Nodes (11): run-worklog Skill, cdp.cs, cdp.exe, Chrome DevTools Protocol Automation, driver.ps1, worklog.html App (driven target), Constraint Retention, Fable 5 Core Loop (Understand-Gather-Plan-Act-Verify-Report) (+3 more)

### Community 26 - "Emil Design/Review-Animations Skill (.agents)"
Cohesion: 0.24
Nodes (10): Emil Design Eng Skill (.agents), Popover Origin-awareness, Scale(0) Anti-pattern, Sonner Principles, Ten Non-Negotiable Standards, Emil Design Eng Skill (.claude), Popover Origin-awareness, Scale(0) Anti-pattern (+2 more)

### Community 27 - "CDP Chrome Driver"
Cohesion: 0.33
Nodes (4): CancellationToken, CDP, ClientWebSocket, int

### Community 28 - "Inhouse App KM Page Renderer"
Cohesion: 0.36
Nodes (9): findTocNode(), renderKmGeneral(), renderKmHome(), renderKmProject(), renderKmProjectShell(), renderKmRoute(), renderKmShell(), renderKmTocPage() (+1 more)

### Community 29 - "Inhouse App KM General Section"
Cohesion: 0.22
Nodes (9): findTocPath(), generalSectionForNode(), kmGeneralAddCoopRow(), kmGeneralAddRow(), kmGeneralRemoveCoopRowEl(), kmGeneralRemoveRow(), kmGeneralRenameCoopKeyEl(), renderKmGeneralBody() (+1 more)

### Community 30 - "Inhouse App KM Rich Editor"
Cohesion: 0.28
Nodes (9): getActiveKmPage(), isKmImageValue(), renderKmPageChooser(), renderKmPageWorkspace(), renderKmRichEditor(), renderKmTableEditor(), renderKmTableView(), renderKmTocPageBody() (+1 more)

### Community 31 - "Hex Palette Generator (Misc)"
Cohesion: 0.47
Nodes (8): createPaletteGeneratorUI(), darken(), generatePalette(), hexToRgb(), injectStyles(), lighten(), normHex(), rgbToHex()

### Community 32 - "Status Popup Widget (Misc)"
Cohesion: 0.50
Nodes (8): attachStatusPopup(), closeStatusPopup(), colorsOf(), ensureOverlay(), openFor(), renderGrid(), resolveOptions(), selectOption()

### Community 33 - "Inhouse App Engagement Home/Filter"
Cohesion: 0.25
Nodes (8): clearEngFilter(), defaultEngFilter(), renderEngagementHome(), renderEngagementProject(), renderEngagementRoute(), renderEngFilterBar(), renderEngTabBody(), renderProjectBrowser()

### Community 34 - "Inhouse App Export (CSV/XLSX)"
Cohesion: 0.29
Nodes (8): downloadCsv(), downloadXlsx(), exportQuickSum(), exportUserReport(), openQuickSumModal(), quickSumFilteredRecords(), quickSumNarrativeText(), runQuickSum()

### Community 35 - "Inhouse App KM Sidebar"
Cohesion: 0.29
Nodes (7): KM_SIDEBAR_EXPANDED, renderKmSidebar(), renderKmSidebarToolbar(), renderTocEditToolbar(), renderTocNodeHtml(), tocDefaultIcon(), toggleKmSidebarGroup()

### Community 36 - "Inhouse App KM Table Editor"
Cohesion: 0.29
Nodes (7): kmTableAddColumn(), kmTableAddRow(), kmTableClearCellImage(), kmTableInsertCellImage(), kmTableRemoveColumn(), kmTableRemoveRow(), rerenderKmPageWorkspace()

### Community 37 - "CE Logo Brand (Misc copy)"
Cohesion: 0.38
Nodes (7): "Beyond Limits" tagline, Carrier Engagement (brand/product), "CE" monogram mark (airplane/ring motif), Carrier Engagement Logo (ce-logo.png), Purple/grey/violet color scheme, Somapa IT (company), Multimodal transport iconography (plane, ship, train, fuel truck)

### Community 38 - "Multi-Date Picker (Misc)"
Cohesion: 0.48
Nodes (6): createMultiDatePicker(), fmtDisplay(), isValidIso(), normalizeDates(), pad2(), todayIso()

### Community 39 - "Recurrence Picker (Misc)"
Cohesion: 0.52
Nodes (6): createRecurrencePicker(), generateRepeatDates(), isoOfDate(), pad2(), parseIsoDate(), todayIso()

### Community 40 - "Timezone Converter (Misc)"
Cohesion: 0.57
Nodes (6): convertLocalToZone(), convertPreview(), gmtOffsetLabel(), tzOffsetMinutes(), tzParts(), wallToUtc()

### Community 41 - "Inhouse App Nav/Logout"
Cohesion: 0.33
Nodes (6): doLogout(), nav(), navHistoryBack(), navHistoryForward(), navTocNode(), resetNavHistory()

### Community 42 - "Inhouse App Rich Text Table Edit"
Cohesion: 0.33
Nodes (6): rteDeleteColumn(), rteDeleteRow(), rteInsertColumn(), rteInsertRow(), rteIsHeaderRow(), rteResolveActiveCell()

### Community 43 - "CE Logo Brand (root copy)"
Cohesion: 0.53
Nodes (6): "Beyond Limits" Tagline, Carrier Engagement (Brand), Stylized "CE" Monogram, Carrier Engagement Logo, Somapa IT, Multimodal Transport Icon Set (Plane, Ship, Train, Fuel Truck)

### Community 44 - "Export Data Widget (Misc)"
Cohesion: 0.67
Nodes (5): dl(), exportCSV(), exportJSON(), exportXLSX(), inferColumns()

### Community 45 - "Fuzzy Date Search (Misc)"
Cohesion: 0.47
Nodes (4): esc(), fmtTime12(), highlightMatches(), timeSearchBlob()

### Community 46 - "Inhouse App Host Documents"
Cohesion: 0.40
Nodes (5): hostDocRowHtml(), hostEngagementDataBoxHtml(), removeHostDocument(), renderHostFormDocs(), uploadHostDocument()

### Community 47 - "Inhouse App Referenced JS Modules"
Cohesion: 0.70
Nodes (5): app.js (inhouse-app-prototype shared application logic, referenced not read), data.js (inhouse-app-prototype shared data, referenced not read), Layered export pipeline: SheetJS (plain xlsx) -> ExcelJS (colored cells) -> jsPDF+PDF.js (KM export/import round-trip via embedded Base64 JSON), Inhouse Application — Carrier Engagement (prototype entry point), Inhouse Application — Knowledge Management (KM-only build)

### Community 48 - "Claude Code Portable Setup"
Cohesion: 0.40
Nodes (5): Claude Code Portable Setup Guide, Global Design Instructions Section, Permission Allowlist Section, Plain-Language Permission Explanations Section, ~/.claude/settings.json

### Community 50 - "Fame Signature/Lizard GIF Assets"
Cohesion: 0.40
Nodes (5): Small Teal Salamander/Lizard Character, Fame Signature Animation, Misc Folder, Trending Lizard GIF, Teal Lizard/Salamander Character (forest scene)

### Community 51 - "Smart Tooltip Widget (Misc)"
Cohesion: 0.70
Nodes (4): ensurePop(), hide(), initSmartTooltips(), show()

### Community 53 - "Inhouse App Tree Checkbox State"
Cohesion: 0.50
Nodes (4): onTreeCheckboxChange(), refreshTreeParentStates(), setParentBoxState(), treeSelectAll()

### Community 56 - "Pixel Grid Widget (Misc)"
Cohesion: 0.83
Nodes (3): createPixelGrid(), renderCells(), shuffledIndices()

### Community 57 - "Work Log Backup Snapshots v1.6-1.7"
Cohesion: 0.67
Nodes (4): worklog-dev v1.6.11 snapshot, worklog (prod) v1.6.1 snapshot, worklog-dev v1.6.12 snapshot, worklog (prod) v1.7.0 snapshot

### Community 58 - "Inhouse App RTE Font Size Menu"
Cohesion: 0.67
Nodes (3): closeRteSizeMenu(), rteSetFontSize(), toggleRteSizeMenu()

### Community 59 - "Inhouse App KM General Editors"
Cohesion: 0.67
Nodes (3): kmGeneralArrayEditor(), renderGenEditContact(), renderGenEditCredentials()

### Community 61 - "Scream GIF Reaction Asset"
Cohesion: 0.67
Nodes (3): Reaction Meme / Easter Egg Asset, Misc/GIF Asset Folder, Screaming Lizard Reaction GIF

## Knowledge Gaps
- **139 isolated node(s):** `RTE_FONT_SIZES`, `loginAttempts`, `forgotPasswordAttempts`, `KM_GENERAL_ARRAY_FIELDS`, `KM_GENERAL_SECTION_RENDERERS` (+134 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `h()` connect `Time Picker Widget` to `Inhouse App KM Checklist Editor`?**
  _High betweenness centrality (0.012) - this node is a cross-community bridge._
- **Why does `Review Animations Skill (.agents)` connect `Emil Design/Find-Animation Skills (.agents)` to `Improve-Animations Audit Skill (.agents)`, `Emil Design/Review-Animations Skill (.agents)`, `Emil Design/Find-Animation Skills (.claude)`, `Prototype Picker Skill (.agents)`?**
  _High betweenness centrality (0.005) - this node is a cross-community bridge._
- **Are the 6 inferred relationships involving `route()` (e.g. with `app.js` and `renderLanding()`) actually correct?**
  _`route()` has 6 INFERRED edges - model-reasoned connections that need verification._
- **What connects `RTE_FONT_SIZES`, `loginAttempts`, `forgotPasswordAttempts` to the rest of the system?**
  _139 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Inhouse App User/Perm Management` be split into smaller, more focused modules?**
  _Cohesion score 0.08081791626095423 - nodes in this community are weakly interconnected._
- **Should `Inhouse App KM Checklist Editor` be split into smaller, more focused modules?**
  _Cohesion score 0.043478260869565216 - nodes in this community are weakly interconnected._
- **Should `Inhouse App CRUD Entities` be split into smaller, more focused modules?**
  _Cohesion score 0.07575757575757576 - nodes in this community are weakly interconnected._