"use client"

import { VARIANT_SIZES, type ImageVariant } from "@/lib/asset-images/variant-sizes"
import type { ImageCodecPreviewVariant } from "@/src/asset-images/infrastructure/next/asset-image.actions"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

const VARIANT_HINT: Record<ImageVariant, string> = {
  xs: "chips / pins",
  sm: "lists",
  lg: "detail",
  xl: "large",
}

type ImageCodecCompareProps = {
  previews: ImageCodecPreviewVariant[]
  variants: readonly ImageVariant[]
}

function NativeSizePreview({
  item,
  label,
}: {
  item: ImageCodecPreviewVariant
  label: string
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <div className="inline-block max-w-full overflow-auto rounded-lg border border-border bg-muted/30 p-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={item.dataUrl}
          alt={label}
          width={item.width}
          height={item.height}
          className="block h-auto max-w-full"
          style={{ width: item.width }}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {item.width}×{item.height}px · {formatBytes(item.byteLength)}
      </p>
    </div>
  )
}

export function ImageCodecCompare({ previews, variants }: ImageCodecCompareProps) {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-2 gap-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <span>WebP (ref)</span>
        <span>AVIF q48</span>
      </div>

      {variants.map((variant) => {
        const webp = previews.find((p) => p.codec === "webp" && p.variant === variant)
        const avif = previews.find((p) => p.codec === "avif" && p.variant === variant)
        if (!webp || !avif) return null

        const savingsPct =
          webp.byteLength > 0
            ? Math.round((1 - avif.byteLength / webp.byteLength) * 100)
            : null

        return (
          <section key={variant} className="space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {variant.toUpperCase()}{" "}
                <span className="font-normal text-muted-foreground">
                  · max {VARIANT_SIZES[variant]}px · {VARIANT_HINT[variant]}
                </span>
              </h3>
              {savingsPct != null ? (
                <p className="text-xs text-muted-foreground">
                  AVIF{" "}
                  <span className="font-medium text-foreground">
                    {savingsPct >= 0
                      ? `${savingsPct}% smaller`
                      : `${Math.abs(savingsPct)}% larger`}
                  </span>
                </p>
              ) : null}
            </div>

            {/* Always side-by-side: WebP | AVIF for this size */}
            <div className="grid grid-cols-2 items-end gap-4">
              <NativeSizePreview item={webp} label={`WebP ${variant}`} />
              <NativeSizePreview item={avif} label={`AVIF ${variant}`} />
            </div>
          </section>
        )
      })}
    </div>
  )
}
