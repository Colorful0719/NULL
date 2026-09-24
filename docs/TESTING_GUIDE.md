# TESTING GUIDE

Choose scope from the task; explicit user requirements override these defaults. Source paths/commands are repository-relative.

## L1 TARGETED TEST
Use for CSS, spacing, single button, text correction or local visual fix.
1. Validate changed-file syntax/format. JS example: `node --check js/views/BattleView.js`; JSON: parse the changed JSON. CSS/HTML: inspect syntax and rendered rules/structure; do not run node --check on CSS.
2. Exercise the targeted real runtime state and relevant existing feature test.
3. Check console errors.
4. Capture screenshots only for visual work.
Do NOT automatically run full CH1 + CH2 regression.

## L2 FEATURE TEST
Use for battle UI rework, ECHO/quest/DATA WORLD feature or Boss phase changes.
1. Complete feature path.
2. Relevant state transitions.
3. Relevant save/reload (fresh page/new runtime for recovery bugs).
4. Related regression.
5. Console errors.
6. Visual evidence where applicable; mouse/keyboard and truthful native-touch status.
Find the relevant tests in CODEX_PROJECT_MAP.md or the subsystem context. Existing Node tests are generally static/unit/harness checks, not proof of browser visuals.

## L3 FULL REGRESSION
Use for chapter completion, milestones, shared architecture modification, release or explicit request. Run the full relevant suite and runtime flows required by the task.
Existing test scripts are `work/test*.mjs`. PowerShell full-suite example (L3 only):
```powershell
$failedTests = @()
Get-ChildItem work/test*.mjs | Sort-Object Name | ForEach-Object {
  & node $_.FullName
  if ($LASTEXITCODE -ne 0) { $failedTests += $_.Name }
}
if ($failedTests.Count) { throw ($failedTests -join ', ') }
```
Targeted examples:
```text
node work/test_ch1_album_status_overlay_hotfix.mjs
node work/test_ch2_task10c_final_snapshot.mjs
node work/test_ch2_task10e2_data_combination.mjs
```
Do not run these unrelated examples together by default. Asset checks already embedded in selected tests should remain enabled.

## Manual Acceptance / Documentation Only
User visual FAIL remains FAIL / NOT VERIFIED until the user verifies the corrected runtime. Record tested states/dimensions and limitations; do not substitute DOM injection for gameplay verification.
Documentation-only: verify documents/referenced paths, inspect diff and compare runtime hashes against task-start baseline. No full browser regression; report behavior unchanged based on no source edits, not on unperformed runtime tests.
