# Third-party assets

Third-party audio assets are not covered by any license that may apply to the project's source code.

Each third-party asset remains subject to its original license and terms.

The listed Pixabay and Mixkit third-party audio assets are used by the local/full game build, but their raw files are intentionally excluded from this public repository. They remain subject to their respective original licenses.

遊戲內的專案生成視覺素材不列為第三方素材，詳見 `PROJECT_ASSETS.md`。第三方音訊的遊戲使用許可與 Raw Asset 公開再散布是不同問題；Public Repository 審查見 `ASSET_RELEASE_REVIEW.md`。

## Music

| Name | File | Source | License | Game Use | Attribution | Standalone Redistribution | Status |
|---|---|---|---|---|---|---|---|
| Exploration Theme | `assets/audio/bgm/Exploration Theme.ogg` | Cleyton Kauffman／SoundCloud（原頁待補） | 宣稱 CC0，Repository 證據待補 | LOCAL USE / TO VERIFY | TO VERIFY | EXCLUDED FROM PUBLIC REPOSITORY | TO VERIFY |
| Nighttime Solitude | `assets/audio/bgm/Nighttime Solitude [CC0].mp3` | OpenGameArt | CC0 | PERMITTED | NOT REQUIRED | PERMITTED UNDER CC0 | VERIFIED |

`Nighttime Solitude` 目前未被 BGM Mapping 使用，狀態為 `UNUSED`；本輪只記錄，不刪除。

## Pixabay audio

下列素材：Source `Pixabay`；License `Pixabay Content License`；Game Use `PERMITTED SUBJECT TO LICENSE`；Attribution `NOT REQUIRED / APPRECIATED`；Standalone Redistribution `RESTRICTED`；Status `VERIFIED FOR GAME USE`。

| Name | File | Runtime Usage |
|---|---|---|
| alexzavesa glitch transition | `assets/audio/sfx/alexzavesa-glitch-transition-1-463623.mp3` | Battle Enter |
| zoedit digital glitch whoosh | `assets/audio/sfx/zoedit-digital-glitch-whoosh-533580.mp3` | SHARER／Share Whoosh |
| cinematic glitch transition | `assets/audio/sfx/freesound_community-cinematic-glitch-transition-sfx-27806.mp3` | Phase Transition |
| digital glitch noise | `assets/audio/sfx/virtual_vibes-digital-glitch-noise-hd-379465.mp3` | Scan |
| glitch transitions | `assets/audio/sfx/soulfuljamtracks-glitch-fx-transitions-9-378582.mp3` | Data Connect |
| khemrajdotin glitch transition | `assets/audio/sfx/khemrajdotin-glitch-transition-sfx-182152.mp3` | UNUSED |

## Mixkit audio

下列素材：Source `Mixkit`；License `Mixkit Sound Effects Free License`；Game Use `PERMITTED SUBJECT TO LICENSE`；Attribution `NOT REQUIRED`；Standalone / Original Asset Redistribution `DO NOT ASSUME PERMITTED`；Status `VERIFIED FOR GAME USE`。

| Name | File | Runtime Usage |
|---|---|---|
| Camera digital shutter | `assets/audio/sfx/mixkit-camera-digital-shutter-1432.wav` | Photo Snap |
| Glitch static | `assets/audio/sfx/mixkit-glitch-static-1457.wav` | Player Hit |
| Modern technology select | `assets/audio/sfx/mixkit-modern-technology-select-3124.wav` | Confirm／Communicate |
| Quick win notification | `assets/audio/sfx/mixkit-quick-win-video-game-notification-269.wav` | Victory |
| Sci-fi click | `assets/audio/sfx/mixkit-sci-fi-click-900.wav` | Cancel／Tracker Lock |
| Select click | `assets/audio/sfx/mixkit-select-click-1109.wav` | Cursor |
| Small electric glitch | `assets/audio/sfx/mixkit-small-electric-glitch-2595.wav` | Enemy Hit／Digital Copy |

## Release boundary

- PROJECT LICENSE: NOT SELECTED.
- 即使未來 Source Code 採用 MIT 或其他授權，也不涵蓋本文件所列第三方音訊。
- `VERIFIED FOR GAME USE` 不等於 Raw Audio Public Repository Redistribution 已核准。
- Pixabay／Mixkit 原始音檔的 Public Repository Redistribution：`EXCLUDED`。
- `Exploration Theme.ogg` 在來源證據完成前亦排除；本機檔案保留供開發版本使用。
