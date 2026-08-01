"use client"

import { useRef } from "react"
import { useTranslations } from "next-intl"
import { Film, Loader2, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { SCENE_VIDEO_ACCEPT } from "@/components/contribute/scene/scene-contribute-video-schema"

export interface SceneContributeVideoFieldProps {
  previewUrl: string | null
  fileName?: string | null
  inspecting?: boolean
  /** 0–100 while compressing with FFmpeg.wasm */
  processingPercent?: number | null
  processingLabel?: string | null
  onPickFile: (file: File) => void
  onClear: () => void
  className?: string
}

export function SceneContributeVideoField({
  previewUrl,
  fileName,
  inspecting = false,
  processingPercent = null,
  processingLabel = null,
  onPickFile,
  onClear,
  className,
}: SceneContributeVideoFieldProps) {
  const t = useTranslations("Contribute.scene")
  const inputRef = useRef<HTMLInputElement>(null)
  const showProgress = inspecting && processingPercent != null

  return (
    <div className={cn("w-full space-y-3", className)}>
      <input
        ref={inputRef}
        type="file"
        accept={SCENE_VIDEO_ACCEPT}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ""
          if (file) onPickFile(file)
        }}
      />

      <div className="flex w-full min-w-0 flex-col items-stretch">
        {previewUrl ? (
          <div className="relative w-full">
            <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border bg-black">
              <video src={previewUrl} controls className="h-full w-full" />
              {inspecting ? (
                <div className="absolute inset-0 z-[3] flex flex-col items-center justify-center gap-3 bg-background/55 px-6 backdrop-blur-[1px]">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
                  {processingLabel ? (
                    <p className="text-center text-xs font-medium text-foreground">{processingLabel}</p>
                  ) : null}
                  {showProgress ? (
                    <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-foreground transition-[width] duration-200"
                        style={{ width: `${Math.min(100, Math.max(0, processingPercent))}%` }}
                      />
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                disabled={inspecting}
                onClick={() => inputRef.current?.click()}
                className="rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                {t("videoChange")}
              </button>
              <button
                type="button"
                disabled={inspecting}
                onClick={() => {
                  onClear()
                  if (inputRef.current) inputRef.current.value = ""
                }}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-foreground transition-colors hover:bg-destructive/15 hover:text-destructive focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                aria-label={t("videoRemoveAria")}
              >
                <X className="h-4 w-4 shrink-0" strokeWidth={2.25} />
              </button>
              {fileName ? (
                <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{fileName}</span>
              ) : null}
            </div>
          </div>
        ) : (
          <button
            type="button"
            disabled={inspecting}
            aria-busy={inspecting}
            onClick={() => inputRef.current?.click()}
            className="group relative flex aspect-video w-full items-center justify-center overflow-hidden rounded-xl border border-border bg-muted/30 text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-60"
          >
            {inspecting ? (
              <span className="flex flex-col items-center gap-3 px-4">
                <Loader2 className="h-8 w-8 animate-spin" aria-hidden />
                {processingLabel ? (
                  <span className="text-center text-xs font-medium text-foreground">{processingLabel}</span>
                ) : null}
              </span>
            ) : (
              <span className="flex flex-col items-center gap-2 px-4 text-center">
                <Film className="h-8 w-8 opacity-70" aria-hidden />
                <span className="text-sm font-medium">{t("videoUploadPrompt")}</span>
                <span className="text-xs text-muted-foreground">{t("videoFormatHint")}</span>
              </span>
            )}
          </button>
        )}
      </div>
    </div>
  )
}
