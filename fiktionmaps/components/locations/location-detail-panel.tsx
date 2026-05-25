import type { Place } from "@/src/places/domain/place.entity"

interface LocationDetailPanelProps {
  place: Place
}

export function LocationDetailPanel({ place }: LocationDetailPanelProps) {
  return (
    <div className="mt-5 rounded-xl border border-border bg-card/60 p-5">
      <div className="flex flex-col gap-3">
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            {place.name}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">{place.location.address}</p>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">{place.description}</p>
        {place.sceneQuote && (
          <blockquote className="border-l-2 border-primary/40 pl-3 text-sm italic text-foreground/80">
            {`"${place.sceneQuote}"`}
          </blockquote>
        )}
        {place.visitTip && (
          <div className="rounded-lg bg-primary/5 px-3 py-2">
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-primary">Tip:</span> {place.visitTip}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
