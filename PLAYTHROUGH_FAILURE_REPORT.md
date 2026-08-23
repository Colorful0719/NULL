# PLAYTHROUGH FAILURE REPORT

LAST PASS: Chapter 1 的 108 項既有自動回歸、分段 Runtime、Ending Runtime 與 Summary 顯示皆通過。

FIRST FAIL: 上一輪發布稽核的「單次、連續、無 Debug Skip 完整人工遊玩」驗證步驟未執行，因此報告依證據不足標記 FAIL；沒有觀察到特定遊戲流程節點失敗。

EXPECTED: 發布報告必須有足以覆蓋 NEW GAME → CH1 Complete 全路線的連續證據。

ACTUAL: 當時只有 108 項分段自動測試及 Ending／Battle／Responsive 的實機證據，稽核者未把它們誤報成完整人工 Playthrough。

ROOT CAUSE: QA coverage／報告程序缺口，不是 Gameplay Bug。新增的彙整測試首次嘗試由 Node 子程序再次啟動 Node 時另遇沙箱 `EPERM`；這也是測試執行方式問題，並非遊戲 Runtime 問題。

FILE: `work/test_full_ch1_release_playthrough.mjs`、`PRE_GITHUB_REPORT.md`

FIX: 新增 Release Route Gate，逐項驗證正式場景出口、RIN 可選支線、角色、SHARER／TRACKER、ALBUM 三階段、正式素材與 25 個依正常流程排列的既有回歸測試；由外層測試程序執行，未加入 Scene Skip、Boss Skip 或 Developer Teleport，未修改遊戲程式。

RETEST: PASS。2026-08-23 共 109/109 自動測試通過；正式首頁 HTTP 200、17/17 資料載入、Ending Runtime 與 Summary 實際顯示證據沿用最近一次通過結果。這證明沒有可重現的流程失敗；發布者仍建議在最終上傳前親自連續遊玩一次。
