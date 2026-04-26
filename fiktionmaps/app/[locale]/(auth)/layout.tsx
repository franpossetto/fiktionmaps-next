import type { Metadata } from "next"

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-sans flex h-screen w-screen items-center justify-center bg-background">
      {children}
    </div>
  )
}
