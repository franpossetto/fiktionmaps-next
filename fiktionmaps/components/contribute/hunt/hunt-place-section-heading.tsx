/** Section title matching `FictionPlaceDetailView` (yellow accent + 3xl semibold). */
export function HuntPlaceSectionHeading({
  id,
  title,
  className,
}: {
  id?: string
  title: string
  className?: string
}) {
  return (
    <div className={className}>
      <div className="flex min-w-0 items-center gap-3">
        <span className="h-7 w-1 shrink-0 rounded-full bg-yellow-500" aria-hidden />
        <h2 id={id} className="text-3xl font-semibold tracking-tight text-foreground">
          {title}
        </h2>
      </div>
    </div>
  )
}
