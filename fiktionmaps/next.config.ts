import type { NextConfig } from "next"
import createNextIntlPlugin from "next-intl/plugin"

// Use `next build --webpack` / `next dev --webpack` (package.json). Default Turbopack can emit Edge middleware where `next/server` pulls in ua-parser-js and hits `__dirname is not defined` on Vercel.

function supabaseImageHost(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()
  if (!raw) return null
  try {
    return new URL(raw).hostname
  } catch {
    return null
  }
}

const supabaseHost = supabaseImageHost()

const nextConfig: NextConfig = {
  // Server Actions default body limit is 1MB; image uploads via FormData need more headroom.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  images: {
    // Prefer small widths for chips/avatars (next/image srcset).
    imageSizes: [16, 32, 48, 64, 96, 128, 256],
    remotePatterns: [
      { protocol: "https", hostname: "images.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "plus.unsplash.com", pathname: "/**" },
      { protocol: "https", hostname: "image.tmdb.org", pathname: "/t/p/**" },
      { protocol: "https", hostname: "api.mapbox.com", pathname: "/styles/**" },
      { protocol: "https", hostname: "**.supabase.co", pathname: "/**" },
      ...(supabaseHost
        ? [{ protocol: "https" as const, hostname: supabaseHost, pathname: "/**" }]
        : []),
    ],
  },
}

const withNextIntl = createNextIntlPlugin()
export default withNextIntl(nextConfig)
