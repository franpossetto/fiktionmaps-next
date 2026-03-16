export default function Loading() {
  return (
    <div className="flex h-screen w-screen items-center justify-center bg-background text-foreground">
      <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm text-muted-foreground">
        Loading...
      </div>
    </div>
  )
}
