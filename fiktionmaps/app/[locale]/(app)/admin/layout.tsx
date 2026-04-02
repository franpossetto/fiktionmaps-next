export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col bg-background">
      <div className="mx-auto flex h-full min-h-0 w-full max-w-7xl min-w-0 flex-col px-5">
        {children}
      </div>
    </div>
  )
}
