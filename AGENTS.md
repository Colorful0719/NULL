# NULL PROJECT RULES

## Project
《NULL：被看見的我們》— Web Browser 2D Educational RPG；HTML / CSS / JavaScript。
Player-facing language：繁體中文（既有角色名稱除外）。

## Current Chapters
- CH1：探索、SHARER / TRACKER、ALBUM 三階段、反思及章節總結。
- CH2：活動探索、ECHO、照片與同意流程、DATA WORLD、DATA PROFILE Boss、反思、ending、CH2_COMPLETE 已有 runtime。
- 以目前程式為準；章節資料的 foundation 標籤不是完整實作清單。不推定後續章節。

## General Development Rules
1. Read AGENTS.md first.
2. Read the relevant context document, then only directly related source files.
3. Do NOT perform repository-wide inspection unless explicitly requested.
4. Do NOT reread full GDD/history for small fixes.
5. Prefer minimal targeted changes; do not refactor unrelated systems.
6. Do not rename IDs/files unless necessary. Existing working systems remain canonical.
7. User manual playtest overrides automated visual PASS.
8. If a problem cannot be reproduced, report NOT VERIFIED; do not invent a fix.

## Context Routing / Token Efficiency
- File lookup: docs/CODEX_PROJECT_MAP.md.
- CH1 battle: docs/CH1_BATTLE_CONTEXT.md. CH2: docs/CH2_CONTEXT.md.
- Test scope: docs/TESTING_GUIDE.md.
- Do not broadly search merely to “understand the project.” Expand only when a direct dependency cannot be resolved from the map, and inspect the minimum additional files.
- Update these short indexes when the architecture changes; current source is authoritative.

## Protected Systems
Unless explicitly requested, do not modify GameState/save-load architecture, unrelated chapter progression, quests, maps, dialogue, learning content, unrelated battle mechanics, ECHO, DATA WORLD or DATA PROFILE.

## Testing Levels
- **L1 TARGETED** — small UI/CSS/text/local fix: changed-file syntax/format validation, targeted feature runtime, console; visual evidence for visual work. No automatic full regression.
- **L2 FEATURE** — feature/system change: feature flow, relevant transitions and save/reload, related regression, console and applicable visual evidence.
- **L3 FULL REGRESSION** — milestone, major shared architecture change, release/publish preparation or explicit request only: full relevant regression.

## Manual Verification
Automated PASS does not prove visual correctness. If user manual playtest reports FAIL, status remains FAIL / NOT VERIFIED until the user verifies the corrected runtime.
