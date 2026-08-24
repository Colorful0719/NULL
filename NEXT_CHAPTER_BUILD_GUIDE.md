# 《NULL》後續章節增量建置指南

用途：以目前完成的 CH1 為穩定基準，建置 CH2 之後內容時減少重複說明與 Token。後續工作只需引用本文件，再補充「本章差異規格」。

## 1. 固定原則

- 不重建專案，不複製第二套 Map、Dialogue、Quest、Save 或 Input 系統。
- CH1 視為凍結內容；除非回歸測試證明有共用系統缺陷，否則不修改 CH1 資料與流程。
- 新章使用新 Map ID、Quest ID、Dialogue ID、Flag 路徑與資產路徑，避免覆蓋 CH1。
- 劇情、地圖、戰鬥、素材分成小 PATCH；每次只改一個可驗收目標。
- 所有玩家可見文字使用繁體中文；程式 ID 可使用英文。
- 圖片、音訊只以檔案路徑引用，不寫成 Base64。
- 不 Push GitHub，除非使用者當次明確要求。

## 2. 現有架構：優先沿用

| 系統 | 主要檔案 | 後續章節做法 |
|---|---|---|
| 遊戲流程／模式銜接 | `js/core/Game.js`, `js/core/GameMode.js` | 僅新增章節路由與必要銜接，不大改既有流程 |
| 狀態 | `js/core/GameState.js` | 沿用，新增章節命名空間 |
| 資料載入 | `js/core/DataLoader.js` | 新資料仍由 manifest 驗證與一次性快取載入 |
| 地圖探索 | `js/managers/MapManager.js`, `js/views/MapView.js` | 沿用移動、碰撞、互動、轉場與攝影機 |
| 地圖素材快取 | `js/core/MapAssetCache.js` | 保留相鄰地圖預載，不另建圖片載入器 |
| 互動判定 | `js/systems/InteractionSystem.js` | NPC、物件、出口共用同一套判定 |
| 對話 | `DialogueManager.js`, `DialogueView.js` | 新增資料，不重寫 Portrait System |
| 任務 | `QuestManager.js`, `GuidanceManager.js` | 主線與支線明確分離 |
| 解謎／回憶 | `PuzzleManager.js`, `MemoryInvestigationManager.js` | 只有玩法相同才沿用；新玩法先定義規格 |
| 遊走敵人 | `RoamingEnemyManager.js` | 可沿用地圖實體與接觸事件；不等於必須沿用 CH1 戰鬥 |
| 存讀檔 | `SaveManager.js` | 擴充資料，不建立第二套 Save System |
| 輸入 | `InputManager.js` | Keyboard 與 Touch 必須呼叫相同遊戲行為 |
| 音訊 | `js/audio/` | 使用語意 Audio ID，不在玩法程式硬寫路徑 |

## 3. 章節資料命名

建議統一格式：

```text
Map ID:        ch2_<location>
Quest ID:      ch2_<quest>
Dialogue ID:   ch2_<event>_<stage>
Puzzle ID:     ch2_<puzzle>
Enemy ID:      ch2_<enemy>
Boss ID:       ch2_<boss>
Flag:          flags.ch2.<name>
Side Quest:    sideQuests.ch2_<name>
Assets:        assets/ch2/<category>/...
```

若現有資料結構不接受巢狀 Flag，沿用實際架構，但 ID 必須含 `ch2_` 前綴。

## 4. 每章建置順序

### PATCH 00 — 現況檢查

- 只讀檢查檔案樹、資料格式、可沿用系統與 CH1 回歸測試。
- 列出本章「新增／修改／禁止修改」範圍。
- 不寫程式，等使用者確認。

### PATCH 01 — Chapter Skeleton

- 新增章節定義、章節初始 Flag、第一張地圖 ID。
- 驗收：舊存檔仍可讀，CH1 可正常完成。

### PATCH 02 — Map Data

- 先建立 Ground、Collision、Interaction、NPC、Trigger 等資料層。
- Map Concept 只作版面參考，不由圖片像素自動推測碰撞。
- 驗收：出生、道路、邊界、出入口與回程正確。

### PATCH 03 — Map Art

- 接入正式 Map／Tileset；保持等比例與 `image-rendering` 設定。
- 驗收：資產載入、相鄰地圖預載、第二次進入不重複請求。

### PATCH 04 — NPC / Environmental Interaction

- NPC 使用 Map Sprite；按 E／Touch 後才顯示大型 Portrait。
- 布告欄與物件使用 Environment Dialogue，不顯示角色 Portrait。
- 驗收：離開對話回到原位置，不重載網頁。

### PATCH 05 — Main Quest

- 先完成不可跳過的主線 Gate，再接支線。
- 驗收：主線條件清楚，支線未完成也不會卡關。

### PATCH 06 — Optional Side Quests

- 每條支線有 `AVAILABLE / ACTIVE / COMPLETED` 或現有等價狀態。
- 獎勵與 Callback 不得成為主線或 Boss 必要條件，除非新 GDD 明訂。

### PATCH 07 — Puzzle / Special Interaction

- 優先沿用現有穩定 UI；只有玩法本質不同才新增模組。
- Desktop、Touch 均不能有 keyboard-only blocker。

### PATCH 08 — Battle Integration

- 依第 5 節先確認新戰鬥規格，再實作。
- 地圖只送出 Encounter Context，不直接依賴戰鬥內部規則。

### PATCH 09 — Boss / Chapter Ending

- 分開完成戰前、戰鬥、戰後、Reflection、Summary。
- 每一段單獨驗收，不一次串完後才除錯。

### PATCH 10 — Save / Load Migration

- 測試舊 CH1 存檔、新章存檔、地圖位置、方向、任務與戰鬥中斷狀態。

### PATCH 11 — Responsive / Touch QA

- Desktop 以 Tablet Landscape 的可讀比例為視覺基準。
- 不使用整個 App 的 `transform: scale()` 或 `zoom`。

### PATCH 12 — Full Regression

- 完整跑 CH1，再跑新章；檢查 Console、資產、流程、存檔與效能。

## 5. 下一章戰鬥方式改變時

不要直接把 `BattleManager.js` 改成新玩法，否則容易破壞 CH1。先確認下列規格：

```text
戰鬥類型：即時／卡牌／節奏／策略／其他
進入方式：接觸／事件／選單
玩家輸入：Keyboard／Touch／兩者
勝敗條件：
資源：HP／SP／牌組／時間／其他
敵人行為：
暫停／逃跑規則：
戰後回傳資料：勝敗、HP、獎勵、Flags、Quest Update
存檔點：戰前／戰中／戰後
Boss 階段：
是否沿用 CH1 Battle Art、SFX、VFX：
```

### 穩定的共用邊界

不論戰鬥類型如何，探索層只需要這個概念介面：

```js
startEncounter(encounterId, context)
// context: sceneId, playerPosition, facing, sourceEntityId, returnPolicy

finishEncounter(result)
// result: outcome, playerState, rewards, flags, questUpdates
```

建議做法：

1. 保留 CH1 的 `BattleManager / BattleView / BattleFormula / EnemyAI`。
2. 為新玩法建立獨立的新章戰鬥 Manager 與 View。
3. 在 `Game.js` 只用戰鬥類型或章節選擇正確 Manager。
4. 兩套戰鬥都透過相同 Encounter Context 返回原地圖。
5. 先做一場普通戰鬥 Vertical Slice，再做 Boss；不要一次移植全部敵人。

禁止讓 MapManager 直接知道傷害、回合、卡牌或節奏判定。

## 6. 每個 PATCH 的最小回報格式

```text
PATCH:
完成內容：
修改檔案：
新增檔案：
保留系統：
測試：
驗收：PASS / FAIL
已知問題：
下一步：等待確認
```

只回報實際結果，不重述整份 GDD。

## 7. 精簡 Prompt 模板

後續可直接貼以下內容：

```text
請讀取 NEXT_CHAPTER_BUILD_GUIDE.md，視為固定建置規則。

本次章節：CH__
本次只做：PATCH __ — ______

新增規格：
- ...

素材：
- ...

必須保留：
- CH1 全部已完成流程
- GameState / Save / Map / Dialogue / Input 共用架構

禁止：
- 提前做下一個 PATCH
- 重構正常系統
- 修改未列入範圍的劇情與資產
- git push

完成後依指南的最小回報格式輸出並停止。
```

### 新戰鬥規格 Prompt

```text
請讀取 NEXT_CHAPTER_BUILD_GUIDE.md。
本次只做「新戰鬥模式規格比較與 Migration Plan」，先不要寫程式。

新戰鬥資料：
[填寫指南第 5 節表格]

要求：
- CH1 回合制戰鬥保持不變
- 提出最小 Adapter／Manager／View 邊界
- 拆成小 PATCH
- 列出每個 PATCH 的修改檔案、測試與驗收
- 等我確認後才開始 PATCH 01
```

## 8. Token 節省規則

- 不再貼 CH1 完整歷史；用「依 `NEXT_CHAPTER_BUILD_GUIDE.md`」取代。
- 每回合只提供當前 PATCH 的差異，不重貼所有規格。
- 圖片只說明用途、Map ID 與資產路徑，不重述通用碰撞規則。
- Codex 回報只列實際修改、測試、問題與下一步。
- 診斷與實作分開；若只要求分析，禁止先寫程式。
- 已驗收 PATCH 記錄為完成，後續不要重新分析或重做。

## 9. 每章最終驗收清單

- 主線可從章節入口走到章節完成。
- 支線可忽略且不阻擋主線。
- 地圖道路、碰撞、出口、回程與預載正常。
- NPC、布告欄、Puzzle 在 Desktop 與 Touch 均可操作。
- 對話結束保留玩家位置。
- 戰鬥結束依規格返回正確地圖與位置。
- Save／Reload／Load 恢復章節、地圖、方向、任務及戰鬥狀態。
- CH1 完整回歸通過。
- Console 無未處理 Error。
- 沒有未授權素材或真實個資。

