# Graph Report - .  (2026-07-15)

## Corpus Check
- 22 files · ~158,812 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 132 nodes · 198 edges · 15 communities (14 shown, 1 thin omitted)
- Extraction: 91% EXTRACTED · 9% INFERRED · 1% AMBIGUOUS · INFERRED: 17 edges (avg confidence: 0.66)
- Token cost: 0 input · 191,968 output

## Community Hubs (Navigation)
- Work Log Project Docs
- DateTime Picker Widget
- Date Picker Widget
- Component Library & Theming
- Time Picker Widget
- CDP Chrome Driver
- CE Logo Brand (Misc copy)
- CE Logo Brand (root copy)
- Claude Code Portable Setup
- Worklog Driver Script
- Fame Signature Animation

## God Nodes (most connected - your core abstractions)
1. `CDP` - 8 edges
2. `createTimePicker()` - 8 edges
3. `openDatePicker()` - 7 edges
4. `ensurePopover()` - 7 edges
5. `dtpCompose()` - 7 edges
6. `openDateTimePicker()` - 7 edges
7. `Work Log Project` - 7 edges
8. `syncPickerToValue()` - 6 edges
9. `Component Library (component-library.html)` - 6 edges
10. `ensurePopover()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `worklog.html App (driven target)` --references--> `index.html (Work Log production-synced build)`  [INFERRED]
  .claude/skills/run-worklog/SKILL.md → index.html
- `Misc/index.html (Work Log variant copy)` --conceptually_related_to--> `Work Log Entry Object Schema`  [AMBIGUOUS]
  Misc/index.html → CLAUDE.md
- `Component Library (component-library.html)` --conceptually_related_to--> `index.html (Work Log production-synced build)`  [INFERRED]
  Misc/component-library.html → index.html
- `Misc/index.html (Work Log variant copy)` --shares_data_with--> `index.html (Work Log production-synced build)`  [INFERRED]
  Misc/index.html → index.html
- `Failure Modes to Guard Against` --rationale_for--> `Work Log Project`  [EXTRACTED]
  FABLE5_THINKING.md → CLAUDE.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **CDP Browser Automation Flow for Work Log** — claude_skills_run_worklog_skill_driver_script, claude_skills_run_worklog_skill_cdp_exe, claude_skills_run_worklog_skill_worklog_app [INFERRED 0.85]
- **Fable 5 Operating Discipline Pattern** — fable5_thinking_core_loop, fable5_thinking_evidence_discipline, fable5_thinking_verification_standards [INFERRED 0.85]
- **Fame Easter Egg Feature Assets** — misc_fame_easter_egg_demo, misc_fame_easter_egg_modal, misc_component_library_easter_egg_css [INFERRED 0.85]

## Communities (15 total, 1 thin omitted)

### Community 0 - "Work Log Project Docs"
Cohesion: 0.11
Nodes (24): CLAUDE.md (root project instructions), CIRQ_XML_ALL.html, CIRQ_XML_Builder.html, Work Log Deployment Workflow (beta then origin), Work Log Entry Object Schema, Google Calendar Integration Notes, run-worklog Skill, cdp.cs (+16 more)

### Community 1 - "DateTime Picker Widget"
Cohesion: 0.25
Nodes (19): applyDisplay(), calendarIconSvg(), createDateTimeTrigger(), dtpClear(), dtpClose(), dtpCompose(), dtpOnSelChange(), dtpOnTimeBlur() (+11 more)

### Community 2 - "Date Picker Widget"
Cohesion: 0.29
Nodes (16): applyDisplay(), calendarIconSvg(), createDateTrigger(), dpClear(), dpClose(), dpOnSelChange(), dpPickDay(), dpRender() (+8 more)

### Community 3 - "Component Library & Theming"
Cohesion: 0.14
Nodes (11): Component Library (component-library.html), date-picker.css, datetime-picker.css, easter-egg.css, Component Library Light/Dark Theme Tokens, time-picker.css, fame-easter-egg.css, Creator Modal (#creator-modal) (+3 more)

### Community 4 - "Time Picker Widget"
Cohesion: 0.36
Nodes (11): buildColumn(), clearTimePicker(), closeAllPickers(), createTimePicker(), getSelectedValue(), pad2(), parseTimeString(), scrollSelectedIntoView() (+3 more)

### Community 5 - "CDP Chrome Driver"
Cohesion: 0.33
Nodes (4): CancellationToken, CDP, ClientWebSocket, int

### Community 6 - "CE Logo Brand (Misc copy)"
Cohesion: 0.38
Nodes (7): "Beyond Limits" tagline, Carrier Engagement (brand/product), "CE" monogram mark (airplane/ring motif), Carrier Engagement Logo (ce-logo.png), Purple/grey/violet color scheme, Somapa IT (company), Multimodal transport iconography (plane, ship, train, fuel truck)

### Community 7 - "CE Logo Brand (root copy)"
Cohesion: 0.53
Nodes (6): "Beyond Limits" Tagline, Carrier Engagement (Brand), Stylized "CE" Monogram, Carrier Engagement Logo, Somapa IT, Multimodal Transport Icon Set (Plane, Ship, Train, Fuel Truck)

### Community 8 - "Claude Code Portable Setup"
Cohesion: 0.40
Nodes (5): Claude Code Portable Setup Guide, Global Design Instructions Section, Permission Allowlist Section, Plain-Language Permission Explanations Section, ~/.claude/settings.json

### Community 13 - "Fame Signature Animation"
Cohesion: 0.67
Nodes (3): Small Teal Salamander/Lizard Character, Fame Signature Animation, Misc Folder

## Ambiguous Edges - Review These
- `Work Log Entry Object Schema` → `Misc/index.html (Work Log variant copy)`  [AMBIGUOUS]
  Misc/index.html · relation: conceptually_related_to

## Knowledge Gaps
- **19 isolated node(s):** `cdp.cs`, `Work Log Versioning Scheme (MAJOR.MINOR.PATCH)`, `Failure Modes to Guard Against`, `Global Design Instructions Section`, `Plain-Language Permission Explanations Section` (+14 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **1 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What is the exact relationship between `Work Log Entry Object Schema` and `Misc/index.html (Work Log variant copy)`?**
  _Edge tagged AMBIGUOUS (relation: conceptually_related_to) - confidence is low._
- **Why does `Component Library (component-library.html)` connect `Component Library & Theming` to `Work Log Project Docs`?**
  _High betweenness centrality (0.042) - this node is a cross-community bridge._
- **Why does `index.html (Work Log production-synced build)` connect `Work Log Project Docs` to `Component Library & Theming`?**
  _High betweenness centrality (0.040) - this node is a cross-community bridge._
- **Are the 5 inferred relationships involving `ensurePopover()` (e.g. with `dtpClear()` and `dtpClose()`) actually correct?**
  _`ensurePopover()` has 5 INFERRED edges - model-reasoned connections that need verification._
- **What connects `cdp.cs`, `Work Log Versioning Scheme (MAJOR.MINOR.PATCH)`, `Failure Modes to Guard Against` to the rest of the system?**
  _19 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Work Log Project Docs` be split into smaller, more focused modules?**
  _Cohesion score 0.10507246376811594 - nodes in this community are weakly interconnected._
- **Should `Component Library & Theming` be split into smaller, more focused modules?**
  _Cohesion score 0.14285714285714285 - nodes in this community are weakly interconnected._