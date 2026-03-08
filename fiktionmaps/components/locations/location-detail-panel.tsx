import type { Location } from "@/lib/modules/locations"

interface LocationDetailPanelProps {
  location: Location
}

export function LocationDetailPanel({ location }: LocationDetailPanelProps) {
  return (
    <div className="mt-5 rounded-xl border border-border bg-card/60 p-5">
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{location.name}</h3>
          <p className="mt-1 text-xs text-muted-foreground">{location.address}</p>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{location.description}</p>
        {location.sceneQuote && (
          <blockquote className="border-l-2 border-primary/40 pl-3 text-sm italic text-foreground/80">
            {`"${location.sceneQuote}"`}
          </blockquote>
        )}
        {location.visitTip && (
          <div className="rounded-lg bg-primary/5 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-primary">Tip:</span> {location.visitTip}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
