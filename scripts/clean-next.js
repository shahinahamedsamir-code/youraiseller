const fs = require("fs");
const path = require("path");

const nextDir = path.join(__dirname, "..", ".next");
const cacheDir = path.join(__dirname, "..", "node_modules", ".cache");

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

for (const dir of [nextDir, cacheDir]) {
  try {
    rmDirSafe(dir);
  } catch (err) {
    console.warn(`[youraiseller] Could not clean ${dir}:`, err.message);
  }
}
