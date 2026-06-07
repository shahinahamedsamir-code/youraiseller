const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const nextDir = path.join(__dirname, "..", ".next");
const cacheDir = path.join(__dirname, "..", "node_modules", ".cache");
const ifIdle = process.argv.includes("--if-idle");

function isPortInUse(port) {
  const isWin = process.platform === "win32";
  try {
    if (isWin) {
      const out = execSync("netstat -ano", { encoding: "utf8" });
      const portRe = new RegExp(`:${port}\\s`);
      return out.split(/\r?\n/).some((line) => line.includes("LISTENING") && portRe.test(line));
    }
    execSync(`lsof -ti tcp:${port}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function rmDirSafe(dir) {
  if (!fs.existsSync(dir)) return;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      fs.rmSync(dir, { recursive: true, force: true, maxRetries: 3, retryDelay: 200 });
      console.log(`[youraiseller] Cleaned ${path.basename(dir)}`);
      return;
    } catch (err) {
      if (attempt === 2) throw err;
    }
  }
}

if (ifIdle && isPortInUse(3000)) {
  console.log(
    "[youraiseller] Skipping .next clean — dev server already on port 3000. Run `npm run restart` if CSS looks broken."
  );
  process.exit(0);
}

for (const dir of [nextDir, cacheDir]) {
  try {
    rmDirSafe(dir);
  } catch (err) {
    console.warn(`[youraiseller] Could not clean ${dir}:`, err.message);
  }
}
