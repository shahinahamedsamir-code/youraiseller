/**
 * Kills stale Next dev servers, cleans .next, starts one dev server.
 * Run: npm run restart
 */
const { execSync, spawn } = require("child_process");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const nextDir = path.join(root, ".next");
const PORTS = [3000, 3001];

function killPort(port) {
  const isWin = process.platform === "win32";
  const portRe = new RegExp(`:${port}\\s`);

  try {
    if (isWin) {
      const out = execSync("netstat -ano", { encoding: "utf8", cwd: root });
      const pids = new Set();
      for (const line of out.split(/\r?\n/)) {
        if (!line.includes("LISTENING") || !portRe.test(line)) continue;
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        if (/^\d+$/.test(pid) && pid !== "0") pids.add(pid);
      }
      for (const pid of pids) {
        try {
          execSync(`taskkill /F /PID ${pid}`, { stdio: "ignore", cwd: root });
          console.log(`[youraiseller] Stopped PID ${pid} (port ${port})`);
        } catch {
          /* already gone */
        }
      }
    } else {
      execSync(`lsof -ti tcp:${port} | xargs kill -9 2>/dev/null || true`, {
        stdio: "ignore",
        cwd: root,
        shell: true,
      });
    }
  } catch {
    /* port already free */
  }
}

console.log("[youraiseller] Stopping dev servers on ports 3000/3001...");
for (const p of PORTS) killPort(p);

try {
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, {
      recursive: true,
      force: true,
      maxRetries: 5,
      retryDelay: 300,
    });
    console.log("[youraiseller] Cleaned .next");
  }
} catch (e) {
  console.warn("[youraiseller] .next clean failed:", e.message);
}

console.log("[youraiseller] Starting next dev on http://localhost:3000 ...");
const child = spawn("npx next dev -p 3000", {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

child.on("exit", (code) => process.exit(code ?? 0));
