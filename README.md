# NULL：被看見的我們

《NULL》是一款繁體中文 2D RPG。玩家在 Chapter 1 中探索住宅、街區、學校與記憶畫廊，透過事件式角色對話、環境調查、可選支線、解謎與回合制戰鬥，逐步理解照片被公開、複製與拼接後留下的資訊。

## 故事背景

看似普通的生活照片開始反覆出現在街道、校園與異常空間。PLAYER 與夥伴追查照片的來源，最後面對由回憶、曝光與資料拼圖構成的 ALBUM。

## Gameplay

- 2D 地圖探索、碰撞、NPC 與環境互動
- 事件式大型角色立繪對話
- SHARER／TRACKER 普通敵人與 ALBUM 三階段回合制戰鬥
- 照片線索、記憶調查與公布欄環境敘事
- 可選的 RIN「照片檢查」支線
- 任務日誌、音訊設定、Save／Load
- Reflection、Full Chapter Summary、Journey Review 與下一章預告

## 操作方式

- 移動：方向鍵或 `WASD`
- 互動：靠近並面向目標後按 `E`
- 對話：`Enter` 下一句；`Space` 立即顯示全文
- 操作說明：探索中按 `M`
- 任務清單：探索中按 `J`
- 靜音：探索介面任務按鈕旁的靜音按鈕，或設定畫面

## 任務系統

KAI 與 Chapter 1 推進屬於主線。公布欄調查與 RIN 照片檢查屬於可選支線；未完成支線不會阻擋 ALBUM 或 Chapter 1 結局。任務狀態會寫入既有 Save／Load 資料。

## Chapter 1 狀態

Chapter 1 垂直切片已完成，包含正式地圖、角色立繪、像素角色、普通敵人、ALBUM Phase 1～3、戰後 PARENT 對話與完整章節收束。本儲存庫不包含 Chapter 2 Gameplay。

## 如何在本機啟動

本專案使用原生 HTML、CSS 與 JavaScript ES Modules，不需要安裝套件或建置。在本目錄執行：

```powershell
python -m http.server 8000
```

開啟 `http://127.0.0.1:8000/`（或 `http://localhost:8000/`）。不要直接以 `file://` 開啟，否則瀏覽器可能阻擋 ES Modules 與 JSON 載入。

## Project Structure

```text
assets/   地圖、角色、敵人、Boss、照片與音訊
css/      各模式與響應式版面
data/     對話、任務、地圖事件、敵人、Boss 與結局資料
js/       Core、Manager、System、View、Audio 與設定
index.html
```

## 第三方素材說明

素材盤點與授權狀態請見 [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md)。標記為 `TO VERIFY` 的素材在公開 GitHub 前必須由發布者確認來源、商用與原始檔再散布權利。

## License and Assets

Source code, original game content, and project-generated visual assets are not currently released under an open-source or open-content license unless explicitly stated.

Third-party assets are not covered by any project license and remain subject to their respective original licenses.

See [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md) for details. Project-generated visual assets are recorded separately in [PROJECT_ASSETS.md](PROJECT_ASSETS.md).

## Audio Assets

Some third-party audio files used by 《NULL》 are not included in the public repository because they remain subject to their original licenses. The local/full development build may continue using those files; public clones continue without missing optional audio and may use the documented fallback behavior.

See [THIRD_PARTY_ASSETS.md](THIRD_PARTY_ASSETS.md) and [AUDIO_SETUP.md](AUDIO_SETUP.md) for source, license, expected local paths, and setup information.

## 目前版本狀態

- Runtime 與 109 項自動回歸測試通過
- Production Collision Debug 預設關閉
- 不使用遠端 API、分析或玩家資料傳輸
- 生成照片隱私審查已通過；發布前仍需確認原始音檔公開再散布及選擇專案 LICENSE
- 詳細結果請見 [PRE_GITHUB_REPORT.md](PRE_GITHUB_REPORT.md)
