# 《NULL GDD v2.4》最終 QA 驗收紀錄

結果：PASS（2026-08-19）

本文件記錄《NULL：被看見的我們》第一章地圖探索版的最終驗收項目。

## 自動測試

- STEP 2–12、PATCH 01–12 單元與回歸測試
- JavaScript 語法檢查
- 全部 JSON 格式與 DataLoader schema-like 驗證
- GameState 0.3.0、Save／Load／Reset 與舊存檔 migration
- 情緒倍率與狀態持續時間
- Puzzle Modifier 實際戰鬥數值
- ALBUM 三階段與特殊勝利
- Dialogue／Puzzle／Battle／Reflection checkpoint 還原
- 每張地圖普通小怪最多兩次，第三次不再觸發
- 正式角色與 ALBUM 圖片路徑完整性

## 瀏覽器驗收

- 開始畫面與資料載入
- Enter／Space／方向鍵／WASD／Tab 操作
- 序章對話與三個選項
- 家中 → 資料世界 → 相簿城鎮
- NPC 必須靠近並按 E 才出現大型立繪對話
- PHOTO CHECK 失敗、重試、成功與保存
- 地圖踏入式普通敵人與兩次遭遇上限
- ALBUM 一般／特殊勝利與階段切換
- Reflection 漏答與完成保存
- 重新整理後繼續遊戲
- 390 × 844 窄螢幕無水平溢出
- ES module 版本化載入，避免舊輸入模組快取
- Console 無未處理錯誤或警告
- 玩家可見介面使用繁體中文；正式角色名稱維持原名
- 所有實際請求資源無 404

## 隱私邊界

遊戲不要求登入、真實姓名、電話、Email、GPS 或其他真實個人資料；所有狀態只保存在瀏覽器 localStorage。
