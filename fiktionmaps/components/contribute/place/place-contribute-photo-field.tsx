"use client"

import { useRef } from "react"
import { useTranslations } from "next-intl"
import { ImageIcon, Loader2, X } from "lucide-react"
import {
  DEFAULT_IMAGE_FOCUS,
  type ImageFocus,
} from "@/lib/asset-images/image-focus"
import { ImageFocusPicker } from "@/components/ui/image-focus-picker"
import { cn } from "@/lib/utils"

export type ContributePhotoFieldLayout = "place-hero" | "fiction-cover" | "fiction-banner"

const LAYOUT_ASPECT_CLASS: Record<ContributePhotoFieldLayout, string> = {
  "place-hero": "aspect-[21/9]",
  "fiction-cover": "aspect-[2/3] max-w-[336px]",
  "fiction-banner": "aspect-[21/9] max-w-3xl",
}

const LAYOUT_ASPECT_RATIO: Record<ContributePhotoFieldLayout, string> = {
  "place-hero": "21 / 9",
  "fiction-cover": "2 / 3",
  "fiction-banner": "21 / 9",
}

export interface PlaceContributePhotoFieldProps {
  previewUrl: string | null
  inspecting: boolean
  onPickFile: (file: File) => void
  onClear: () => void
  className?: string
  layout?: ContributePhotoFieldLayout
  /** Override upload hint (e.g. fiction cover aspect copy). */
  aspectHint?: string
  /** Fills parent width (e.g. side-by-side current vs new image). */
  inline?: boolean
  focus?: ImageFocus | null
  onFocusChange?: (focus: ImageFocus) => void
}

export function PlaceContributePhotoField({
  previewUrl,
  inspecting,
  onPickFile,
  onClear,
  className,
  layout = "place-hero",
  aspectHint,
  inline = false,
  focus,
  onFocusChange,
}: PlaceContributePhotoFieldProps) {
  const t = useTranslations("Contribute.place")
  const inputRef = useRef<HTMLInputElement>(null)
  const aspectClass = cn(
    LAYOUT_ASPECT_CLASS[layout],
    inline && (layout === "fiction-cover" || layout === "fiction-banner") && "max-w-none",
  )
  const hint = aspectHint ?? t("photoAspectHint")
  const currentFocus = focus ?? DEFAULT_IMAGE_FOCUS

  return (
    <div className={cn("w-full space-y-3", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ""
          if (file) onPickFile(file)
        }}
      />

      <div
        className={cn(
          "flex w-full flex-col",
          inline ? "items-stretch" : "mx-auto max-w-3xl items-center",
        )}
      >
        {previewUrl ? (
          <div className={cn("relative w-full", aspectClass.includes("max-w") && !inline && layout === "fiction-cover" && "max-w-[336px]", layout === "fiction-banner" && !inline && "max-w-3xl")}>
            <ImageFocusPicker
              src={previewUrl}
              alt={t("photoPreviewAlt")}
              aspectRatio={LAYOUT_ASPECT_RATIO[layout]}
              focus={currentFocus}
              disabled={inspecting || !onFocusChange}
              onFocusChange={(next) => onFocusChange?.(next)}
              className={cn(inline && "max-w-none")}
            />
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={inspecting}
                onClick={() => inputRef.current?.click()}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {t("photoChange")}
              </button>
              <button
                type="button"
                disabled={inspecting}
                onClick={() => {
                  onClear()
                  if (inputRef.current) inputRef.current.value = ""
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-destructive/15 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                aria-label={t("photoRemoveAria")}
              >
                <X className="h-4 w-4 shrink-0" strokeWidth={2.25} />
              </button>
            </div>
            {inspecting ? (
              <div className="absolute inset-0 z-[3] flex items-center justify-center rounded-xl bg-background/50 backdrop-blur-[1px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
              </div>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            disabled={inspecting}
            aria-busy={inspecting}
            onClick={() => inputRef.current?.click()}
            className={cn(
              "group relative flex w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30 text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60",
              aspectClass,
            )}
          >
            {inspecting ? (
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            ) : (
              <span className="flex flex-col items-center gap-2 px-4 text-center">
                <ImageIcon className="h-8 w-8 opacity-70" aria-hidden />
                <span className="text-sm font-medium">{t("photoUploadPrompt")}</span>
                <span className="text-xs text-muted-foreground">{hint}</span>
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
