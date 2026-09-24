# CODEX PROJECT MAP

Paths are repository-relative. Read only the relevant section and sources. Verified against source: 2026-09-21.

## Core Runtime
- Feature: native browser ES modules; Game wires managers, views and callbacks.
- Primary files: `index.html`, `js/main.js`, `js/core/Game.js` (initialize/setupStep4/resumeFromState).
- Dependencies: `js/core/DataLoader.js`, `js/core/GameMode.js`, `js/managers/InputManager.js`; shared map/dialogue/quest/reflection managers and corresponding views.
- Tests: `work/test_ch1_ch2_transition.mjs`, `work/test_playtest_feedback_hotfix.mjs`.

## Game State / Save Load
- Feature: canonical state, localStorage persistence and runtime recovery routing.
- Primary files: `js/core/GameState.js`, `js/managers/SaveManager.js`, `js/core/Game.js` (resumeFromState).
- Dependencies: individual managers write `activeFlow`, flags and checkpoints; SaveManager merges supported saved versions into defaults.
- Tests: `work/test_ch1_ch2_transition.mjs`, `work/test_ch2_master_completion.mjs`, `work/test_ch2_task10e3_narrative.mjs` (not substitutes for real reload testing).

## CH1
- Primary files: `js/core/Game.js`, `js/managers/MapManager.js`, `js/managers/DialogueManager.js`, `js/managers/QuestManager.js`, `js/managers/PuzzleManager.js`, `js/managers/MemoryInvestigationManager.js`, `js/managers/ReflectionManager.js`, `js/managers/ChapterSummaryManager.js`.
- Data: `data/scenes.json`, `data/dialogues.json`, `data/act3_dialogues.json`, `data/boss_dialogues.json`, `data/quests.json`, `data/puzzles.json`, `data/memories.json`, `data/reflections.json`.
- Views: `js/views/MapView.js`, `js/views/DialogueView.js`, `js/views/PuzzleView.js`, `js/views/MemoryInvestigationView.js`, `js/views/ReflectionView.js`, `js/views/ChapterSummaryView.js`.
- CSS: `css/map.css`, `css/dialogue.css`, `css/puzzle.css`, `css/memory.css`, `css/summary.css`.
- Assets: `assets/maps/player_home/`, `assets/maps/memory_gallery/`, `assets/maps/album_room/`, `assets/characters/`, `assets/puzzles/`.
- Tests: `work/test_ch1_ch2_transition.mjs`, `work/test_ch1_kai_nameplate_hotfix.mjs`, `work/test_global_dialogue_portraits.mjs`.

## CH1 Battle
- Primary files: `index.html` (#battle-screen), `data/enemies.json`, `data/bosses.json`.
- Battle runtime: `js/managers/BattleManager.js`; `js/systems/BattleFormula.js`, `js/systems/EmotionSystem.js`, `js/systems/StatusSystem.js`, `js/systems/EnemyAI.js`.
- Views: `js/views/BattleView.js`; event wiring in `js/core/Game.js`.
- CSS: `css/battle.css`, `css/battle-redesign.css`, `css/battle-status-hotfix.css`; shared viewport rules in `css/main.css`, `css/responsive.css`, `css/desktop-fullscreen.css`.
- Assets: `assets/bosses/album/`, `assets/enemies/sharer/`, `assets/enemies/tracker/`, `assets/characters/`, `assets/audio/`.
- Tests: `work/test_ch1_album_status_overlay_hotfix.mjs`, `work/test_ch1_ch2_transition.mjs`. Details: CH1_BATTLE_CONTEXT.md.

## CH2
- Primary files: `js/core/Game.js` (CH2 orchestration), `js/managers/MapManager.js`, `js/managers/PhoneManager.js`, `js/managers/PartyFollowerManager.js`, `js/managers/RoamingNpcManager.js`, `js/systems/InteractionSystem.js`; shared chapter data in `data/scenes.json`, `data/dialogues.json`, `data/choices.json`, `data/quests.json`, `data/reflections.json`.
- Views: `js/views/MapView.js`, `js/views/PhoneView.js`, `js/views/DialogueView.js`, `js/views/ReflectionView.js`.
- CSS: `css/map.css`, `css/phone.css`, `css/dialogue.css`, `css/survey.css`, `css/ch2-photo-preview-hotfix.css`.
- Assets: `assets/maps/ch2_community_event/`, `assets/maps/ch2_photo_spot/`, `assets/ui/ch2/`, `assets/characters/`.
- Tests: `work/test_ch2_batch3a_act1.mjs`, `work/test_ch2_task07_group_photo_consent.mjs`, `work/test_ch2_master_completion.mjs`.

## ECHO
- Primary files: `js/managers/EchoManager.js`, `js/echo/EchoVisibility.js`, `js/echo/EchoConsent.js`, `js/echo/EchoAssets.js`; callbacks in `js/core/Game.js`.
- State: `js/core/GameState.js`: echo drafts/posts/notifications/nextOrder, activeFlow.echo; chapter consequence flags.
- Views: `js/views/EchoView.js`.
- CSS: `css/echo.css`, `css/ch2-echo-composer-hotfix.css`.
- Tests: `work/test_ch2_batch2_echo.mjs`, `work/test_ch2_batch3c_audience_consent.mjs`, `work/test_ch2_echo_composer_layout_hotfix.mjs`.

## CH2 DATA WORLD
- Primary files: `js/core/Game.js` (prepareCh2FinalInformationWorld/enterCh2FinalDataWorld), `js/final/Ch2FinalSnapshot.js`, `js/final/Ch2InformationFragments.js`, `js/final/Ch2NullEncounter.js`, `js/systems/InteractionSystem.js`.
- State: GameState flags for final entry, snapshot, viewed fragments and north convergence; see CH2_CONTEXT.md.
- Views: `js/views/MapView.js`, `js/views/DialogueView.js`.
- CSS: `css/map.css`.
- Assets: `assets/maps/ch2_final_data_world/`, `assets/characters/null/`.
- Tests: `work/test_ch2_task10b_data_world.mjs`, `work/test_ch2_task10c_final_snapshot.mjs`, `work/test_ch2_task10c1_information_fragments.mjs`, `work/test_ch2_fragment_interaction_ux.mjs`, `work/test_ch2_task10d_null_encounter.mjs`.

## CH2 DATA PROFILE / Boss
- Primary files: `js/managers/NullBossManager.js`, `js/final/NullBossField.js`, `js/final/NullBossSemantics.js`, `js/final/NullBossNarrative.js`, `js/core/Game.js` (entry/post-Boss/ending/recovery).
- State: activeFlow.nullBoss; post-Boss activeFlow.dialogue/reflection and completion flags; `js/managers/ReflectionManager.js` handles saved submissions.
- Views: `js/views/NullBossView.js`, `js/views/ReflectionView.js`, `js/views/DialogueView.js`.
- CSS: `css/null-boss.css`, `css/summary.css`, `css/dialogue.css`.
- Assets: `assets/ui/ch2/boss/`, `assets/characters/null/`.
- Tests: `work/test_ch2_task10e1_null_boss.mjs`, `work/test_ch2_task10e2_data_combination.mjs`, `work/test_ch2_task10e3_narrative.mjs`, `work/test_ch2_boss_runtime_freeze_hotfix.mjs`.

Shared architecture: Game, GameState, SaveManager, InputManager, map/interaction, dialogue/choices, quests, reflection and audio cross chapter boundaries. CH1 BattleManager and CH2 NullBossManager are distinct runtimes. Assets are under `assets/`; tests and diagnostic harnesses under `work/`. Do not load all of them for a local task.
