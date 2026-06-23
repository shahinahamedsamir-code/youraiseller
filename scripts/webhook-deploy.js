const http = require("http");
const crypto = require("crypto");
const { execSync } = require("child_process");

const PORT = 9000;
const SECRET = process.env.WEBHOOK_SECRET || "youraiseller-deploy-secret-2026";
const REPO_DIR = "/var/www/youraiseller";

function verifySignature(payload, signature) {
  if (!signature) return false;
  const hmac = crypto.createHmac("sha256", SECRET);
  const digest = "sha256=" + hmac.update(payload).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(signature));
}

const server = http.createServer((req, res) => {
  if (req.method !== "POST" || req.url !== "/deploy") {
    res.writeHead(404);
    res.end("Not found");
    return;
  }

  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    const signature = req.headers["x-hub-signature-256"];
    if (!verifySignature(body, signature)) {
      console.log("[webhook] Invalid signature — rejected");
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    try {
      const payload = JSON.parse(body);
      if (payload.ref !== "refs/heads/main") {
        res.writeHead(200);
        res.end("Skipped — not main branch");
        return;
      }
    } catch {}

    console.log("[webhook] Deploying...");
    res.writeHead(200);
    res.end("Deploying...");

    try {
      execSync(
        `cd ${REPO_DIR} && git pull origin main && npm install --production && npx next build && pm2 restart youraiseller`,
        { stdio: "inherit", timeout: 120000 }
      );
      console.log("[webhook] Deploy complete!");
    } catch (e) {
      console.error("[webhook] Deploy failed:", e.message);
    }
  });
});

server.listen(PORT, () => {
  console.log(`[webhook] Listening on port ${PORT}`);
});
