# Claude Code Portable Setup

This file bundles the Claude Code preferences set up on this machine, so they
can be recreated on another device. It is a reference/backup copy — copying
this file alone does NOT apply the settings; follow "How to apply" below.

Generated from: `C:\Users\Uesr01\.claude\` on this machine, as of 2026-07-07.

---

## 1. Global instructions (design defaults)

Source file on this machine: `C:\Users\Uesr01\.claude\CLAUDE.md`

**On the new device:** copy this content into `C:\Users\Uesr01\.claude\CLAUDE.md`
on that machine (create the file if it doesn't exist).

```markdown
# Global Instructions

## Design quality — apply to every project by default

Whenever building or modifying any UI, web page, HTML, artifact, document,
slide deck, or data visualization, treat polished design as the DEFAULT:

- Load the `artifact-design` skill BEFORE writing any UI/web/HTML/artifact code.
- Load the `dataviz` skill BEFORE writing ANY chart, graph, dashboard, or
  data-visualization code.
- Use the document skills (`docx`, `pptx`, `pdf`, `xlsx`) for polished
  deliverables rather than plain text/markdown when the user wants a document.
- Default to a refined visual baseline: clear typographic hierarchy, generous
  and consistent spacing, a deliberate (not default) color system, and full
  light + dark theme support.
- Whenever there's a way to SEE the output (screenshot, run the app, render the
  page), do it and iterate on the visual result rather than guessing.
- When a design direction is ambiguous, ask for a reference (a URL, a
  screenshot, or "make it like X") before committing to a look.

### Skip the design pass when told

This is a DEFAULT, not a hard rule. When the user signals they want plain or
throwaway output — words like "quick", "rough", "plain", "just make it work",
"functional only", "no design pass", "prototype", or "don't worry about
styling" — skip the design work and produce the simplest thing that works.
```

---

## 2. Plain-language permission explanations (memory)

Source file on this machine:
`C:\Users\Uesr01\.claude\projects\c--Users-Uesr01-Desktop-Work-Files-AI\memory\feedback_plain_language_permissions.md`

Memory is project-scoped by folder path, so on a new device (or new project
folder) this won't transfer automatically. Easiest path: just tell Claude the
instruction directly in a new session —

> "Explain permission requests and what you're about to do in plain,
> non-technical language — don't use tool/command names like 'Bash', describe
> the real-world effect instead. The permission dialog itself will still show
> the technical command; only your own explanation should be in plain words."

Claude will save this as a memory in the new project on its own.

---

## 3. Permission allowlist (reduces repeated approval prompts)

Source file on this machine: `C:\Users\Uesr01\.claude\settings.json`
(this is the GLOBAL settings file — applies across all projects on this machine)

**On the new device:** merge the `permissions.allow` list below into
`C:\Users\Uesr01\.claude\settings.json` on that machine. Don't blindly copy
the whole file if the new device already has its own settings — merge the
array entries in, keep everything else on the new device as-is.

```json
{
  "permissions": {
    "allow": [
      "Bash(git init *)",
      "Bash(git remote *)",
      "Bash(git pull *)",
      "Bash(git checkout *)",
      "Bash(git add *)",
      "Bash(npm list *)",
      "Bash(curl -s \"https://famelx.github.io/*)",
      "Bash(curl -sI \"https://famelx.github.io/*)"
    ]
  }
}
```

Notes:
- Left out machine-specific one-off entries (exact paths to temp build
  folders, one-time script invocations) since those won't exist on a new
  device anyway.
- The two `curl` rules are specific to checking your Work Log site
  (`famelx.github.io`) — keep these only if you're still working on that
  project from the new device.
- This list is a snapshot — it does NOT auto-update as your usage changes.
  Re-run the `fewer-permission-prompts` skill periodically (e.g. every few
  weeks) on whichever device you're actively using, to pick up new patterns.

---

## Quick recreation prompt

If you'd rather not copy files, just paste this into a fresh Claude Code
session on the new device:

> "Set up my Claude Code preferences: (1) explain permission requests and
> what you're about to do in plain, non-technical language; (2) apply good
> design by default to any UI, webpage, document, or chart you build, unless
> I say quick/rough/plain; (3) scan my recent session transcripts on this
> device and add safe, read-only, repeated commands to my permission
> allowlist, but never auto-allow anything destructive or that runs arbitrary
> code."

This reconstructs items 1 and 2 immediately, and re-runs item 3's scan fresh
against whatever history exists on that device (transcripts don't transfer
between devices).
