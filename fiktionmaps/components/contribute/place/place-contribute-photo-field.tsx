"use client"

import { useRef } from "react"
import Image from "next/image"
import { useTranslations } from "next-intl"
import { ImageIcon, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface PlaceContributePhotoFieldProps {
  previewUrl: string | null
  inspecting: boolean
  onPickFile: (file: File) => void
  onClear: () => void
  className?: string
}

export function PlaceContributePhotoField({
  previewUrl,
  inspecting,
  onPickFile,
  onClear,
  className,
}: PlaceContributePhotoFieldProps) {
  const t = useTranslations("Contribute.place")
  const inputRef = useRef<HTMLInputElement>(null)

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

      <div className="mx-auto flex w-full max-w-3xl flex-col items-center">
        {previewUrl ? (
          <div className="relative aspect-[21/9] w-full overflow-hidden rounded-xl border border-border bg-muted/30">
            <Image
              src={previewUrl}
              alt={t("photoPreviewAlt")}
              fill
              className="object-cover pointer-events-none select-none"
              unoptimized
            />
            <button
              type="button"
              disabled={inspecting}
              onClick={() => inputRef.current?.click()}
              className="absolute inset-0 z-[1] rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label={t("photoChange")}
            />
            <span className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-gradient-to-t from-black/55 via-black/15 to-transparent px-2 pb-2 pt-12 text-center">
              <span className="text-xs font-medium text-white drop-shadow-sm">{t("photoChange")}</span>
            </span>
            <button
              type="button"
              disabled={inspecting}
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onClear()
                if (inputRef.current) inputRef.current.value = ""
              }}
              className="absolute right-2 top-2 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/95 text-foreground shadow-md backdrop-blur-sm transition-colors hover:bg-destructive/15 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
              aria-label={t("photoRemoveAria")}
            >
              <X className="h-4 w-4 shrink-0" strokeWidth={2.25} />
            </button>
            {inspecting ? (
              <div className="absolute inset-0 z-[3] flex items-center justify-center bg-background/50 backdrop-blur-[1px]">
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
            className="group relative flex aspect-[21/9] w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30 text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
          >
            {inspecting ? (
              <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
            ) : (
              <span className="flex flex-col items-center gap-2 px-4 text-center">
                <ImageIcon className="h-8 w-8 opacity-70" aria-hidden />
                <span className="text-sm font-medium">{t("photoUploadPrompt")}</span>
                <span className="text-xs text-muted-foreground">{t("photoAspectHint")}</span>
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
