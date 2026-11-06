import type { NextConfig } from "next";

const STAYS_HOST = "stays.sarajevopropertymanagement.ba";

const nextConfig: NextConfig = {
  // Javni booking dio nikad ne ide u Google (da ne smeta SEO-u sajta za vlasnike).
  async headers() {
    const noindex = [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];
    return [
      { source: "/stays", headers: noindex },
      { source: "/stays/:path*", headers: noindex },
      { source: "/api/stays/:path*", headers: noindex },
    ];
  },
  // stays.sarajevopropertymanagement.ba → /stays (isti projekat, poseban host)
  async rewrites() {
    return [
      { source: "/", has: [{ type: "host", value: STAYS_HOST }], destination: "/stays" },
      { source: "/:slug((?!api|_next|stays)[^/]+)", has: [{ type: "host", value: STAYS_HOST }], destination: "/stays/:slug" },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
