---
title: 它是怎麼運作的？
date: 2026-07-01
thumbnail: /assets/uploads/convertico-candy-png.png
summary: 客戶按下 Publish → 內容 commit 進 GitHub → Cloudflare Pages 自動 rebuild → 網站更新。全程免碰程式碼。
---

整個流程只有四步：

1. 客戶打開 `/admin`，用 GitHub 登入（透過 Cloudflare Worker 做 OAuth）
2. 在圖形化後台編輯內容
3. 按 **Publish**，Decap 把 Markdown commit 進 GitHub repo
4. Cloudflare Pages 偵測到 commit，自動部署新版本

這篇首頁用 **GitHub Contents API** 在瀏覽器端即時抓取 `content/news` 資料夾，所以發佈後首頁會自動出現新文章，不需要額外的 build 步驟。
