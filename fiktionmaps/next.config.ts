import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

// Use `next build --webpack` / `next dev --webpack` (package.json). Default Turbopack can emit Edge middleware where `next/server` pulls in ua-parser-js and hits `__dirname is not defined` on Vercel.

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      { protocol: "https", hostname: "api.mapbox.com", pathname: "/styles/**" },
      { protocol: "https", hostname: "api.dicebear.com", pathname: "/**" },
      { protocol: "https", hostname: "**.supabase.co", pathname: "/**" },
    ],
  },
}

const withNextIntl = createNextIntlPlugin()
export default withNextIntl(nextConfig)
