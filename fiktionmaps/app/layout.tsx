import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import { getSiteUrl } from "@/lib/site"

import "./globals.css"

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const _spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" })
const SITE_URL = getSiteUrl()
const GOOGLE_SITE_VERIFICATION = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION?.trim()

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "FiktionMaps - Discover Movie & Book Locations",
  description:
    "Explore real-world locations from your favorite movies and books on an interactive map.",
  alternates: {
    canonical: "/en",
    languages: {
      en: "/en",
      es: "/es",
    },
  },
  openGraph: {
    title: "FiktionMaps - Discover Movie & Book Locations",
    description:
      "Explore real-world locations from your favorite movies and books on an interactive map.",
    url: `${SITE_URL}/en`,
    siteName: "FiktionMaps",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "FiktionMaps - Discover Movie & Book Locations",
    description:
      "Explore real-world locations from your favorite movies and books on an interactive map.",
  },
  ...(GOOGLE_SITE_VERIFICATION
    ? {
        verification: {
          google: GOOGLE_SITE_VERIFICATION,
        },
      }
    : {}),
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo-icon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/logo-icon.png",
  },
}

export const viewport: Viewport = {
  themeColor: "#1a1d26",
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "FiktionMaps",
    url: SITE_URL,
    inLanguage: ["en", "es"],
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/en/fictions?query={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var k="fiktions-theme-settings";try{var s=localStorage.getItem(k);if(s){var p=JSON.parse(s);var mode=p.mode,base=p.base||"dark";var cls=mode==="realtime"?(function(){var h=new Date().getHours();return"theme-realtime-"+(h>=5&&h<12?"day":h>=12&&h<17?"afternoon":h>=17&&h<21?"evening":"night")})():"theme-"+base+"-1";document.documentElement.classList.add(cls);if(cls.startsWith("theme-dark-")||cls==="theme-realtime-evening"||cls==="theme-realtime-night")document.documentElement.classList.add("dark");}else{document.documentElement.classList.add("theme-dark-1");document.documentElement.classList.add("dark");}}catch(e){}})();`,
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body
        className={`${_inter.variable} ${_spaceGrotesk.variable} font-sans antialiased overflow-hidden`}
      >
        {children}
      </body>
    </html>
  )
}
