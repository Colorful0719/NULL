# CH2 CONTEXT

Read for CH2 work only; CH1 UI tasks should not inspect these sources without a direct dependency.

## Systems / Primary Files
- `js/core/Game.js`: CH2 opening, exploration, photos/consent consequences, final entry and completion orchestration. Shared data: `data/scenes.json`, `data/dialogues.json`, `data/choices.json`, `data/quests.json`, `data/reflections.json`.
- Map/interaction: `js/managers/MapManager.js`, `js/systems/InteractionSystem.js`, `js/views/MapView.js`, `css/map.css`; party/NPC behavior: `js/managers/PartyFollowerManager.js`, `js/managers/RoamingNpcManager.js`.
- Phone: `js/managers/PhoneManager.js`, `js/views/PhoneView.js`, `css/phone.css`.
- ECHO: `js/managers/EchoManager.js`, `js/views/EchoView.js`, `js/echo/EchoVisibility.js`, `js/echo/EchoConsent.js`, `js/echo/EchoAssets.js`; `css/echo.css`, `css/ch2-echo-composer-hotfix.css`.
- DATA WORLD: `js/final/Ch2FinalSnapshot.js`, `js/final/Ch2InformationFragments.js`, `js/final/Ch2NullEncounter.js`; Game prepares generated map fragments and convergence.
- DATA PROFILE / Boss: `js/managers/NullBossManager.js`, `js/views/NullBossView.js`, `js/final/NullBossField.js`, `js/final/NullBossSemantics.js`, `js/final/NullBossNarrative.js`, `css/null-boss.css`. Separate from CH1 BattleManager; preserve legacy internal NULL IDs.

## Boss Phase Runtime
- NullBossField: 35s fragments → 45s fragments + canonical connections → 60s profile formation with 3 deliberate proximity/E interactions → 15s Data Storm → existing collapse. Phase 3 requires all nodes; time alone cannot complete it.
- Connections use a 1s preview and 2.5s active period; concurrency grows 1 → 2 → 3 (including previews). Empty disclosure retains an UNRESOLVED PHOTO placeholder, not a personal fact.

## Save / Reload Boundaries
- Canonical `js/core/GameState.js` + `js/managers/SaveManager.js`; localStorage key nullPrivacyRpg.save.v1. Runtime writes additional flags/activeFlow fields beyond initial defaults.
- ECHO: echo drafts/posts/notifications and activeFlow.echo.
- Final world: flags.ch2FinalDataWorldEntered, flags.ch2FinalViewedFragmentIds, flags.ch2FinalNorthConvergenceReady; snapshot/fragment semantics are canonical in the final modules and Game.
- Boss: activeFlow.nullBoss records flow/plan and safe boundaries; NullBossManager persists PLAYER boundaries around dodge. Its progress field stores time, resolvedNodes and stormTime; restore clears moving hazards and returns the player to a safe position. Do not invent a parallel save format.
- Post-Boss recovery priority in Game.resumeFromState: flags.ch2Complete → post-Boss activeFlow.dialogue (ch2_profile_collapse / ch2_post_boss_photo_keeper / ch2_final_ending) → activeFlow.reflection (ch2_data_profile_reflection) → flags.ch2ReflectionComplete → active Boss → DATA WORLD fallback.
- `js/managers/ReflectionManager.js` restores saved reflections / flags.reflectionDraft and submitted confirmation. Collapse flags include ch2NullProfileCollapsed and ch2NullBossFoundationComplete. Ending routes through Game.startCh2Ending; completion through Game.showCh2Complete.
- Recovery tests require a real fresh page/new runtime; resuming one Game instance is insufficient. Preserve post-Boss priority over DATA WORLD fallback.

## Protected Stable Systems
Outside explicit scope, preserve ECHO audience/consent, Snapshot inputs, information-fragment semantics, semantic plan, profileStability, dodge duration/field time, narrative Continue behavior, reflection/ending content, completion and save/reload routing. CH1 layout work must not touch CH2 Boss CSS or InputManager broadly.

## Tests (Select by Task)
- ECHO: `work/test_ch2_batch2_echo.mjs`, `work/test_ch2_batch3c_audience_consent.mjs`.
- Photos/consent: `work/test_ch2_task07_group_photo_consent.mjs`.
- Final world: `work/test_ch2_task10b_data_world.mjs`, `work/test_ch2_task10c_final_snapshot.mjs`, `work/test_ch2_task10c1_information_fragments.mjs`, `work/test_ch2_fragment_interaction_ux.mjs`.
- Boss expansion: `work/test_ch2_boss_expansion.mjs` (pacing, nodes, route semantics, safe corridors and checkpoints).
- Boss/semantics/narrative: `work/test_ch2_task10e1_null_boss.mjs`, `work/test_ch2_task10e2_data_combination.mjs`, `work/test_ch2_task10e3_narrative.mjs`, `work/test_ch2_boss_runtime_freeze_hotfix.mjs`.
- Milestone only: `work/test_ch2_master_completion.mjs`. Run a selected file with node; do not run every CH2 test for CH1 work.
