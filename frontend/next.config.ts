import type { NextConfig } from "next";

/*
 * The browser talks only to this Next.js origin (same-origin =
 * cookies work over plain HTTP). The Next server forwards /api/*
 * to the backend, which may live on another machine (e.g. the
 * Tailscale host running the Docker stack).
 */
const API_PROXY_TARGET = (
  process.env.API_PROXY_TARGET || "http://localhost:5001"
).replace(/\/+$/, "");

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_PROXY_TARGET}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
