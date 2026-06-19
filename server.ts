import express from "express";
import path from "path";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

// Load environment variables
dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parser
  app.use(express.json());

  // 1. GitHub Auth URL construction endpoint
  app.get("/api/auth/github/url", (req, res) => {
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: "GITHUB_CLIENT_ID is not configured in the backend environment variables." });
    }

    // Get the dynamic origin (app URL)
    let origin = process.env.APP_URL || "";
    if (!origin && req.headers.host) {
      const protocol = req.headers["x-forwarded-proto"] || "http";
      origin = `${protocol}://${req.headers.host}`;
    }

    const redirectUri = `${origin}/auth/callback`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "gist read:user",
      response_type: "code",
    });

    res.json({ url: `https://github.com/login/oauth/authorize?${params.toString()}` });
  });

  // 2. Callback Route (GitHub Redirect)
  app.get(["/auth/callback", "/auth/callback/"], async (req, res) => {
    const { code } = req.query;

    if (!code) {
      return res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: "OAUTH_AUTH_ERROR", error: "No code provided by GitHub." }, "*");
                window.close();
              } else {
                window.location.href = "/configuracoes";
              }
            </script>
            <p>Erro na autenticação: Código de autorização não recebido.</p>
          </body>
        </html>
      `);
    }

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: "OAUTH_AUTH_ERROR", error: "GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not configured on the server." }, "*");
                window.close();
              } else {
                window.location.href = "/configuracoes";
              }
            </script>
            <p>Erro no servidor: Variáveis de ambiente do GitHub não configuradas.</p>
          </body>
        </html>
      `);
    }

    try {
      // Exchange code for Access Token
      const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });

      const tokenData = await tokenResponse.json() as { access_token?: string; error?: string; error_description?: string };

      if (tokenData.error || !tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || "Failed to exchange authorization code.");
      }

      const accessToken = tokenData.access_token;

      // Fetch user details from GitHub Profile
      const userResponse = await fetch("https://api.github.com/user", {
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "User-Agent": "prodin-pricing-app",
        },
      });

      if (!userResponse.ok) {
        throw new Error("Failed to retrieve GitHub user profile.");
      }

      const userData = await userResponse.json();

      // Return helper script to notify parent and auto-close
      res.send(`
        <html>
          <head>
            <title>Autenticado com o GitHub</title>
            <style>
              body {
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                height: 100vh;
                background-color: #f8fafc;
                color: #0f172a;
                margin: 0;
                text-align: center;
              }
              .card {
                background: white;
                padding: 2rem;
                border-radius: 1rem;
                box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                max-width: 400px;
              }
              h2 { color: #4f46e5; margin-top: 0; }
              p { color: #64748b; font-size: 0.95rem; }
            </style>
          </head>
          <body>
            <div class="card">
              <h2>Conexão bem-sucedida!</h2>
              <p>Você se conectou ao GitHub com sucesso como <strong>${userData.login}</strong>.</p>
              <p>Esta janela fechará automaticamente em instantes...</p>
            </div>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: "OAUTH_AUTH_SUCCESS",
                  token: "${accessToken}",
                  user: ${JSON.stringify({
                    id: userData.id,
                    login: userData.login,
                    name: userData.name || userData.login,
                    avatarUrl: userData.avatar_url,
                    bio: userData.bio || "",
                    htmlUrl: userData.html_url,
                  })}
                }, "*");
                window.close();
              } else {
                window.location.href = "/configuracoes";
              }
            </script>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error("OAuth Exchange Error:", err);
      res.send(`
        <html>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: "OAUTH_AUTH_ERROR", error: "${err.message || err}" }, "*");
                window.close();
              } else {
                window.location.href = "/configuracoes";
              }
            </script>
            <p>Erro durante a autenticação com o GitHub: ${err.message || err}</p>
          </body>
        </html>
      `);
    }
  });

  // Proxy route to post high-quality Gists
  app.post("/api/github/export-gist", async (req, res) => {
    const { token, content, description, filename } = req.body;

    if (!token) {
      return res.status(401).json({ error: "Access token is required" });
    }

    try {
      const response = await fetch("https://api.github.com/gists", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/vnd.github+json",
          "User-Agent": "prodin-pricing-app",
        },
        body: JSON.stringify({
          description: description || "Backup de dados - Prodin",
          public: false,
          files: {
            [filename || "prodin-backup.json"]: {
              content,
            },
          },
        }),
      });

      if (!response.ok) {
        const errDetails = await response.text();
        throw new Error(`GitHub Gist API error: ${errDetails}`);
      }

      const responseData = await response.json();
      res.json({ success: true, htmlUrl: responseData.html_url });
    } catch (err: any) {
      console.error("Gist export failing: ", err);
      res.status(500).json({ error: err.message || "Failed to create Gist" });
    }
  });

  // 3. Mount Vite middleware in development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve production static assets
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
