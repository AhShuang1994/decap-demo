/**
 * Decap CMS ← GitHub OAuth 中介 (Cloudflare Worker)
 *
 * 這支 Worker 取代 Netlify 的登入功能，讓 Decap CMS 能用 GitHub 帳號登入。
 * 需要兩個環境變數（在 Cloudflare 後台以 Secret 設定）：
 *   GITHUB_CLIENT_ID     — GitHub OAuth App 的 Client ID
 *   GITHUB_CLIENT_SECRET — GitHub OAuth App 的 Client Secret
 *
 * 兩個路由：
 *   /auth      → 把使用者導向 GitHub 授權頁
 *   /callback  → GitHub 回呼，交換 token 後透過 postMessage 回傳給 Decap 彈窗
 */

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/auth") {
      const redirectUri = `${url.origin}/callback`;
      const authUrl = new URL("https://github.com/login/oauth/authorize");
      authUrl.searchParams.set("client_id", env.GITHUB_CLIENT_ID);
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("scope", "repo,user");
      return Response.redirect(authUrl.toString(), 302);
    }

    if (url.pathname === "/callback") {
      const code = url.searchParams.get("code");
      if (!code) return new Response("Missing code", { status: 400 });

      // 用 code 換取 access token
      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      });
      const data = await tokenRes.json();

      if (data.error || !data.access_token) {
        return respondToDecap("error", data.error || "no_token");
      }
      return respondToDecap("success", { token: data.access_token, provider: "github" });
    }

    return new Response("Decap OAuth worker OK", { status: 200 });
  },
};

/**
 * 回傳一個 HTML 頁面，透過 window.postMessage 把結果丟回開啟它的 Decap 彈窗。
 * 這是 Decap CMS 約定好的握手訊息格式。
 */
function respondToDecap(status, payload) {
  const message =
    status === "success"
      ? `authorization:github:success:${JSON.stringify(payload)}`
      : `authorization:github:error:${JSON.stringify(payload)}`;

  const html = `<!doctype html><html><body><script>
    (function () {
      function receive(e) {
        window.opener.postMessage(${JSON.stringify(message)}, e.origin);
        window.removeEventListener("message", receive, false);
      }
      window.addEventListener("message", receive, false);
      window.opener.postMessage("authorizing:github", "*");
    })();
  </script><p>登入完成，可以關閉此視窗。</p></body></html>`;

  return new Response(html, { headers: { "Content-Type": "text/html;charset=UTF-8" } });
}
