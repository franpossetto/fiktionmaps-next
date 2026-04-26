import React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Space_Grotesk } from "next/font/google"

import "./globals.css"

const _inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const _spaceGrotesk = Space_Grotesk({ subsets: ["latin"], variable: "--font-space-grotesk" })
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://fiktions.com"

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: "FiktionMaps - Discover Movie & Book Locations",
  description:
    "Explore real-world locations from your favorite movies and books on an interactive map.",
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
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var k="fiktions-theme-settings";try{var s=localStorage.getItem(k);if(s){var p=JSON.parse(s);var mode=p.mode,base=p.base||"dark";var cls=mode==="realtime"?(function(){var h=new Date().getHours();return"theme-realtime-"+(h>=5&&h<12?"day":h>=12&&h<17?"afternoon":h>=17&&h<21?"evening":"night")})():"theme-"+base+"-1";document.documentElement.classList.add(cls);if(cls.startsWith("theme-dark-")||cls==="theme-realtime-evening"||cls==="theme-realtime-night")document.documentElement.classList.add("dark");}else{document.documentElement.classList.add("theme-dark-1");document.documentElement.classList.add("dark");}}catch(e){}})();`,
          }}
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
