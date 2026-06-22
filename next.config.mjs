/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  /** Tree-shake big barrel packages so only used parts ship in the bundle. */
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "framer-motion"],
  },
  /** Reduces corrupt .next cache on Windows during hot reload */
  webpack: (config, { dev }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1500,
        aggregateTimeout: 500,
        ignored: ["**/node_modules/**", "**/.git/**"],
      };
      // Windows: avoid stale chunk IDs (1682.js / layout.css 404)
      config.cache = false;
    }
    return config;
  },
};

export default nextConfig;
