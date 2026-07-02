# Decap CMS 示範站 — Cloudflare Pages + GitHub

一個 **純 HTML 靜態站**，內容由 [Decap CMS](https://decapcms.org/) 管理、存在 GitHub、部署在 Cloudflare Pages。客戶可以在 `/admin` 後台自己改內容，全程不碰程式碼。

```
瀏覽者  ─▶  Cloudflare Pages（靜態網站）
客戶    ─▶  /admin（Decap 後台）──▶  Cloudflare Worker（GitHub 登入）──▶  GitHub repo
                                                                            │
                                                        commit 觸發自動部署 ◀┘
```

## 檔案結構

```
decap-cms-sample/
├── index.html              首頁：用 GitHub API 即時列出 content/news 的文章
├── admin/
│   ├── index.html          Decap CMS 載入器（CDN，免 build）
│   └── config.yml          後台設定：backend、欄位、圖片路徑
├── content/news/           文章（Markdown，Decap 讀寫的就是這裡）
├── assets/uploads/         圖片上傳位置
└── oauth-worker/           Cloudflare Worker：處理 GitHub OAuth 登入
    ├── worker.js
    └── wrangler.toml
```

> ⚠️ **部署前提**：把 `decap-cms-sample/` 內的檔案放到一個**獨立 GitHub repo 的根目錄**（`index.html` 就是 repo 根）。`config.yml` 裡的路徑都以此為準。

---

## 完整部署步驟

### 步驟 1 — 建立 GitHub repo

1. 在 GitHub 開一個新的 **public** repo（例：`decap-demo`）。
   （private 也行，但首頁用 GitHub API 列文章需要 public；private 的做法見文末備註。）
2. 把本資料夾內容放到 repo 根目錄，push 上去。

### 步驟 2 — 部署到 Cloudflare Pages

1. Cloudflare 後台 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. 選剛剛的 repo。
3. Build 設定：
   - Framework preset：**None**
   - Build command：**留空**
   - Build output directory：**`/`**（根目錄）
4. 部署完成後會得到網址，例：`https://decap-demo.pages.dev`。

### 步驟 3 — 建立 GitHub OAuth App

1. GitHub → **Settings** → **Developer settings** → **OAuth Apps** → **New OAuth App**。
2. 填寫：
   - **Application name**：隨意，例 `Decap Demo CMS`
   - **Homepage URL**：`https://decap-demo.pages.dev`
   - **Authorization callback URL**：`https://YOUR-WORKER.workers.dev/callback`
     （這個網址步驟 4 才會拿到，可先隨便填，之後回來改。）
3. 建立後記下 **Client ID**，再按 **Generate a new client secret** 記下 **Client Secret**。

### 步驟 4 — 部署 OAuth Worker

在 `oauth-worker/` 資料夾內：

```bash
cd oauth-worker
npm install -g wrangler        # 或用 npx
wrangler login                 # 登入 Cloudflare
wrangler secret put GITHUB_CLIENT_ID       # 貼上步驟 3 的 Client ID
wrangler secret put GITHUB_CLIENT_SECRET   # 貼上步驟 3 的 Client Secret
wrangler deploy
```

部署完成後會得到 Worker 網址，例：`https://decap-oauth.你的帳號.workers.dev`。

- 回到 **步驟 3** 把 OAuth App 的 **Authorization callback URL** 改成
  `https://decap-oauth.你的帳號.workers.dev/callback`。

### 步驟 5 — 填入設定並收尾

修改兩個檔案，然後 commit（Cloudflare Pages 會自動重新部署）：

**`admin/config.yml`**
```yaml
backend:
  name: github
  repo: 你的帳號/decap-demo          # ← 改這裡
  branch: main
  base_url: https://decap-oauth.你的帳號.workers.dev   # ← Worker 網址
  auth_endpoint: /auth
```

**`index.html`**（頁面上方 script 內）
```js
const OWNER  = "你的帳號";
const REPO   = "decap-demo";
```

### 步驟 6 — 測試

1. 開 `https://decap-demo.pages.dev/admin/`
2. 按 **Login with GitHub** → 授權 → 回到後台。
3. 新增一則「最新消息」→ **Publish**。
4. 幾秒後回首頁重新整理，新文章會出現 ✅

---

## 本地預覽（不需 Worker）

想先看介面長怎樣，不接 GitHub：

1. 在 `admin/config.yml` 打開 `local_backend: true`。
2. 另開終端機跑：`npx decap-server`
3. 用任意靜態伺服器開這個資料夾，例：`npx serve` 然後開 `/admin/`。

此模式改動只存在記憶體，不會寫入 GitHub，純粹體驗介面用。

---

## 常見問題

- **首頁顯示「載入失敗 403」**：GitHub 未登入 API 每小時限 60 次，稍等即可；或把 repo 設 public。
- **登入彈窗卡住**：檢查 OAuth App 的 callback URL 是否精確等於 `<worker>/callback`，以及 `config.yml` 的 `base_url` 是否為 Worker 網址（結尾不要加斜線）。
- **Publish 後首頁沒更新**：等 Cloudflare Pages 部署完成（約 10–30 秒）再重整；本示範首頁直接讀 GitHub API，通常即時。
- **想用 private repo**：首頁列文章那段要改成透過後端／已登入的方式取檔（或改用 11ty/Astro 在 build 時產生列表）。這個純靜態示範預設走 public。

---

## 給客戶交付時的建議

- 把 `/admin` 加到 `robots.txt` 或用 `noindex`（本示範已加 meta noindex）。
- 客戶只需要一個 GitHub 帳號並被加為 repo collaborator 即可登入編輯。
- 欄位（標題、日期、圖片、內文…）都在 `config.yml` 的 `fields` 定義，依客戶需求增減。
