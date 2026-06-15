export function HuntSourceContextAside() {
  return (
    <aside className="flex h-full min-h-0 w-full min-w-0 flex-col py-1">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
        <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          How it works
        </h2>
        <div className="space-y-2.5 text-xs text-muted-foreground">
          <p>Register a URL from a fan wiki, film tourism blog, or official site that lists filming locations for a fiction.</p>
          <p>The system scrapes the page and runs AI extraction to surface place candidates. You then review each one before it reaches moderation.</p>
        </div>

        <div className="border-t border-border/40 pt-3 space-y-2.5">
          <h2 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
            Tips
          </h2>
          <ul className="space-y-2 text-xs text-muted-foreground">
            <li>Prefer pages with specific street-level addresses over vague regional mentions.</li>
            <li>A research note helps moderators assess the source's reliability.</li>
            <li>Each URL is scraped independently — re-running creates a new hunt.</li>
          </ul>
        </div>
      </div>
    </aside>
  )
}
