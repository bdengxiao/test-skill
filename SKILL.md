---
name: test-skill
description: One-command model check. Generate three SVG animals, score structure, save history, and open a full browser window. No parameter questions. Use for test skill, test scale, or SVG model performance checks.
---

# Test Skill

Bare `$test-skill`, `test skill` or `test scale` means run now without questions. Default fixed suite: **pelican, cat, octopus**, Track A, at most 30 SVG elements each, one original attempt. An explicit animal overrides the suite. Editing or explaining the skill is not a trial.

1. Read only [contract](lib/contract.js). Generate all three compact original SVGs and the manifest in one file-writing tool call in the task's `work/`. Avoid extra narration, exploratory tool calls, or separate round trips per animal. Do not read examples or previous answers. Use species-appropriate anatomy and all three animated contacts. Preserve failures; no automatic repairs or installed-package edits.
2. Write a manifest in `work/`: `{"model":null,"settings":null,"tasks":[{"animal":"pelican","file":"pelican.svg"},{"animal":"cat","file":"cat.svg"},{"animal":"octopus","file":"octopus.svg"}]}`. Paths are relative to the manifest. Fill model/settings only from trustworthy session metadata or explicit user labels; never guess or ask questions. Unknown tokens/cost/visual quality stay null.
3. Run `node "<absolute-skill-root>/scripts/studio.js" --manifest "<absolute-manifest>"`. It preserves outputs, validates 16 phases, calculates structural pass-rate out of 100, saves local history and **opens an independent browser window maximized**. The page provides animal switching, scores, history and fullscreen. Do not open a Codex sidebar instead, rewrite utilities, or run project tests per trial. Locate Node from PATH or host bundled runtime if needed.
4. Final: one clickable returned URL labeled “打开 Test Skill”, plus a short outcome. If browser launch failed, say so and give the link. Do not claim a window opened without `opened:true`.

For `$test-skill 查看` / previous results, run the same script **without --manifest**. No generation. History: `~/.codex/test-skill-data`; override with `TEST_SKILL_DATA`. For concrete dependency errors see README.

Structural score is deterministic pass-rate, not visual quality or proof of identity/degradation. Comparison requires recorded model/settings, matching protocol and animals, and at least three valid prior runs. User labels are not provider-attested. Recommend fresh conversations and repeated runs. Default does not enforce or measure token budget. Reference demos must use manifest `"kind":"demo"` and never count as model trials.
