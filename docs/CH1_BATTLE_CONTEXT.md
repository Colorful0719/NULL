# CH1 BATTLE CONTEXT

## Current Battle Architecture
- Runtime: `js/managers/BattleManager.js`; entry/click callbacks in `js/core/Game.js`.
- View: `js/views/BattleView.js`; static elements in `index.html`.
- Enemy/PLAYER panels, Boss stage, message, actions and footer: #battle-screen subtree below.
- CSS order: `css/battle.css` → `css/battle-redesign.css` → `css/battle-status-hotfix.css`; also inspect directly applicable `css/responsive.css` / `css/desktop-fullscreen.css` rules if viewport behavior requires it. Shared baseline: `css/main.css`.
- Current layout overrides: six-row grid, enemy information/art beside PLAYER, dedicated mechanic/message rows; result replaces action row through CSS. Existing BattleView/IDs remain canonical.

## Existing Battle Types
Normal-enemy definitions in `data/enemies.json`: data_noise（資料雜訊）, photo_fragment（照片碎片）, share_bug（分享蟲）, tag_face（人臉標記）, sharer（SHARER）, tracker（TRACKER）. These are definitions, not a claim that every type is encountered in the current main route. ALBUM is the Boss in `data/bosses.json`, including phase-limited entries via startBoss context.phaseLimit. Actual encounter placement is in `data/scenes.json`.

## ALBUM Mechanics
- Resistance-based stages: 回憶 → 曝光 → 資料拼圖; each supplies intent, attack and inflicted status.
- ATTACK uses emotion/status/puzzle modifiers; OBSERVE reveals clues; COMMUNICATE reduces resistance; EMOTION cycles strategy.
- Photo-check completion plus observation/communication counts unlock ASK_FIRST special victory. Ordinary zero-resistance victory and phase-limited completion also exist.
- Runtime checkpoints: flags.activeBattle; restoration returns to PLAYER_TURN. Do not change these for layout work.

## Current UI Structure
Actual `index.html` subtree (decorative/details omitted):
```text
#battle-screen.battle-screen--redesign
├── header.battle-header (#enemy-name, #battle-turn, #battle-phase)
├── .battle-main
│   ├── .battle-enemy-panel
│   │   ├── section.battle-enemy-info (#enemy-hp, #enemy-emotion, #battle-clue)
│   │   └── .battle-stage > .battle-field (#battle-enemy-art, #battle-effects)
│   └── section.player-battle-card (portrait, HP/SP/emotion/statuses)
├── section.boss-mechanic-panel (#boss-phase, .battle-intent > #enemy-intent)
├── section.battle-message-row > #battle-message
├── section.battle-action-area > #battle-commands
├── footer.battle-footer (.battle-utility, #battle-log-panel)
└── section#battle-result (title, text, #battle-exit)
```
Result is a DOM sibling after footer but occupies the action grid row when visible. Locked skill/item buttons and conditional ASK_FIRST remain present; do not create alternate controls/runtime.

## Protected Battle Logic
Do not alter turn order, damage, emotion triangle, status duration/effects, EnemyAI, ALBUM phase thresholds/mechanics, action effects, victory conditions, puzzle modifiers, checkpoints, story/quest progression or save/load for UI tasks.
Logic dependencies: `js/systems/BattleFormula.js`, `js/systems/EmotionSystem.js`, `js/systems/StatusSystem.js`, `js/systems/EnemyAI.js`.

## Current Known UI Status
**CH1 ALBUM Boss Battle UI: UNDER REVISION.**
User manual playtesting determined the overall Boss battle interface needs layout improvement. Current layout code is not user acceptance; do not state the previous overlap issue is fixed. Automated geometry/screenshots alone do not override the user's report.

## Relevant Tests
- `node work/test_ch1_album_status_overlay_hotfix.mjs` — targeted structural/style checks; not visual proof.
- `node work/test_ch1_ch2_transition.mjs` — chapter boundary regression when relevant.
- Changed JS only: e.g. `node --check js/views/BattleView.js` (no JS check required for untouched JS).
- UI rework is L2: actual BattleManager entry, all three ALBUM stages, PLAYER effects, two-line message, action/turn/completion, relevant reload. Check 1280×720, 1366×768, 1024×768, scrollY=0, visible child bounds and mouse/keyboard. Native touch must be reported NOT VERIFIED if unavailable.
