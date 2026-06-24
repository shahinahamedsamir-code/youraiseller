/**
 * PM2 process config for the production VPS.
 *
 * Cluster mode with 2 instances enables zero-downtime deploys: `pm2 reload`
 * restarts the workers one at a time, so the other keeps serving requests and
 * the site never returns 502 during a deploy. Next.js 14 `next start` runs the
 * server in-process (no child fork), so it works correctly under pm2 cluster.
 */
module.exports = {
  apps: [
    {
      name: "youraiseller",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "/var/www/youraiseller",
      exec_mode: "cluster",
      instances: 2,
      autorestart: true,
      max_memory_restart: "600M",
      // Give a reloading worker time to boot and to drain in-flight requests.
      listen_timeout: 12000,
      kill_timeout: 8000,
      env: {
        NODE_ENV: "production",
        PORT: "3000",
      },
    },
  ],
};
