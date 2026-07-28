import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Browsers normally only re-check a service worker for updates
        // occasionally; forcing no-cache here means every visit fetches
        // the real current sw.js, so a deploy is picked up on next load
        // instead of sitting stale until the browser feels like re-checking.
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
