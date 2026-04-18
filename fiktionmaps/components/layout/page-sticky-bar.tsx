interface PageStickyBarProps {
  leading?: React.ReactNode
  title?: React.ReactNode
  trailing?: React.ReactNode
  /** Main content slot (e.g. search); typically gets flex-1 */
  children?: React.ReactNode
  className?: string
  /** Optional class for the inner flex container (e.g. max-w-6xl, justify-between) */
  innerClassName?: string
}

export function PageStickyBar({
  leading,
  title,
  trailing,
  children,
  className = "",
  innerClassName,
}: PageStickyBarProps) {
  return (
    <div
      className={`sticky top-0 z-40 border-b border-border/40 bg-background/95 px-8 py-3 backdrop-blur-md ${className}`.trim()}
    >
      <div className={innerClassName ?? "flex items-center gap-4"}>
        {leading}
        {title != null && <div className="min-w-0 flex-1">{title}</div>}
        {children != null ? <div className="min-w-0 flex-1">{children}</div> : null}
        {trailing}
      </div>
    </div>
  )
}
