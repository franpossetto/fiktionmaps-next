"use client"

import { useEffect, useRef, useState } from "react"
import { ImagePlus, Loader2, Maximize2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  CODEC_LAB_SIZE_HINT,
  CODEC_LAB_SIZES,
  codecLabMaxWidth,
  type CodecLabSize,
} from "@/lib/asset-images/codec-lab"
import {
  VARIANT_AVIF_EFFORT,
  VARIANT_AVIF_QUALITY,
  VARIANT_WEBP_QUALITY,
  type ImageCodec,
} from "@/lib/asset-images/variant-sizes"
import {
  previewImageCodecLabAction,
  type ImageCodecLabOriginal,
  type ImageCodecLabPreview,
} from "@/src/asset-images/infrastructure/next/asset-image.actions"
import { cn } from "@/lib/utils"

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

function weightVsOriginalLabel(encodedBytes: number, originalBytes: number): string {
  if (originalBytes <= 0) return "—"
  const delta = ((encodedBytes - originalBytes) / originalBytes) * 100
  const abs = Math.abs(delta).toFixed(1)
  if (Math.abs(delta) < 0.05) return "mismo peso que el original"
  if (delta < 0) return `${abs}% menos pesada que el original`
  return `${abs}% más pesada que el original`
}

type ImageCodecLabProps = {
  className?: string
}

function SidePanel({
  title,
  weight,
  weightHint,
  meta,
  children,
}: {
  title: string
  weight: string
  weightHint?: string
  meta?: string
  children: React.ReactNode
}) {
  return (
    <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="shrink-0 space-y-1 border-b border-border px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <p className="font-mono text-lg font-semibold text-foreground">{weight}</p>
        {weightHint ? (
          <p className="text-sm leading-snug text-foreground">{weightHint}</p>
        ) : null}
        {meta ? <p className="font-mono text-[11px] text-muted-foreground">{meta}</p> : null}
      </header>
      <div className="min-h-0 flex-1 overflow-auto bg-neutral-950">{children}</div>
    </section>
  )
}

export function ImageCodecLab({ className }: ImageCodecLabProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const requestIdRef = useRef(0)
  const [file, setFile] = useState<File | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [fullscreen, setFullscreen] = useState(false)
  const [codec, setCodec] = useState<ImageCodec>("avif")
  const [size, setSize] = useState<CodecLabSize>("src")
  const [quality, setQuality] = useState(VARIANT_AVIF_QUALITY.lg)
  const [effort, setEffort] = useState(VARIANT_AVIF_EFFORT)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [original, setOriginal] = useState<ImageCodecLabOriginal | null>(null)
  const [preview, setPreview] = useState<ImageCodecLabPreview | null>(null)

  useEffect(() => {
    if (!file) {
      setOriginalUrl(null)
      return
    }
    const url = URL.createObjectURL(file)
    setOriginalUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  useEffect(() => {
    if (!fullscreen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [fullscreen])

  useEffect(() => {
    if (!file) return
    const requestId = ++requestIdRef.current
    const timer = window.setTimeout(async () => {
      setLoading(true)
      setError(null)
      const fd = new FormData()
      fd.set("file", file)
      fd.set("size", size)
      fd.set("codec", codec)
      fd.set("quality", String(quality))
      if (codec === "avif") fd.set("effort", String(effort))

      const result = await previewImageCodecLabAction(fd)
      if (requestId !== requestIdRef.current) return
      setLoading(false)
      if (!result.success) {
        setError(result.error ?? "Lab preview failed")
        return
      }
      setOriginal(result.original)
      setPreview(result.preview)
    }, 350)
    return () => window.clearTimeout(timer)
  }, [file, size, codec, quality, effort])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.files?.[0] ?? null
    e.target.value = ""
    if (!next) return
    setFile(next)
    setOriginal(null)
    setPreview(null)
    setError(null)
    setFullscreen(true)
  }

  const handleCodecChange = (next: ImageCodec) => {
    setCodec(next)
    setQuality(next === "avif" ? VARIANT_AVIF_QUALITY.lg : VARIANT_WEBP_QUALITY.lg)
  }

  const renderImg = (src: string, width: number, height: number, alt: string) => (
    <div className="inline-block p-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        className="block h-auto max-w-none"
        style={{ width }}
      />
    </div>
  )

  const paramsBar = (
    <div className="shrink-0 space-y-4 border-t border-border bg-background px-4 py-4">
      <div className="flex flex-wrap items-end gap-6">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Formato</p>
          <div className="flex gap-1 rounded-lg border border-border p-0.5">
            {(["avif", "webp"] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleCodecChange(c)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium uppercase",
                  codec === c
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Tamaño</p>
          <div className="flex flex-wrap gap-1">
            {CODEC_LAB_SIZES.map((s) => {
              const max = codecLabMaxWidth(s, original?.width)
              return (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={cn(
                    "rounded-md border px-2.5 py-1.5 text-[11px] font-medium",
                    size === s
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                  title={CODEC_LAB_SIZE_HINT[s]}
                >
                  {s.toUpperCase()}
                  {max != null ? ` · ${max}px` : " · full"}
                </button>
              )
            })}
          </div>
        </div>

        <div className="min-w-[12rem] flex-1 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-muted-foreground">Quality</span>
            <span className="font-mono text-foreground">{quality}</span>
          </div>
          <Slider
            min={1}
            max={100}
            step={1}
            value={[quality]}
            onValueChange={(v) => setQuality(v[0] ?? quality)}
          />
        </div>

        {codec === "avif" ? (
          <div className="min-w-[10rem] flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-muted-foreground">Effort</span>
              <span className="font-mono text-foreground">{effort}</span>
            </div>
            <Slider
              min={0}
              max={9}
              step={1}
              value={[effort]}
              onValueChange={(v) => setEffort(v[0] ?? effort)}
            />
          </div>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setCodec("avif")
            setQuality(VARIANT_AVIF_QUALITY.lg)
            setEffort(VARIANT_AVIF_EFFORT)
            setSize("src")
          }}
        >
          Defaults
        </Button>

        {loading ? (
          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Encoding…
          </span>
        ) : null}
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )

  const compareWidth = preview?.width ?? original?.width
  const compareHeight = preview?.height ?? original?.height

  const board =
    original && originalUrl && compareWidth != null && compareHeight != null ? (
      <div className="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-2">
        <SidePanel
          title="Original"
          weight={formatBytes(original.byteLength)}
          meta={`${original.width}×${original.height}px${original.format ? ` · ${original.format}` : ""}${
            preview
              ? ` · mostrado a ${preview.width}×${preview.height}px`
              : ""
          }`}
        >
          {renderImg(originalUrl, compareWidth, compareHeight, "Original")}
        </SidePanel>

        <SidePanel
          title="Transformación"
          weight={preview ? formatBytes(preview.byteLength) : "…"}
          weightHint={
            preview
              ? weightVsOriginalLabel(preview.byteLength, original.byteLength)
              : undefined
          }
          meta={
            preview
              ? `${preview.codec.toUpperCase()} · ${preview.size} · ${preview.width}×${preview.height}px · q${preview.quality}${preview.effort != null ? ` · effort ${preview.effort}` : ""}`
              : undefined
          }
        >
          {preview ? (
            renderImg(preview.dataUrl, preview.width, preview.height, "Transformación")
          ) : (
            <div className="flex h-40 items-center justify-center text-sm text-neutral-400">
              {loading ? "Encoding…" : "—"}
            </div>
          )}
        </SidePanel>
      </div>
    ) : (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        {loading ? "Encoding…" : "Subí una imagen"}
      </div>
    )

  return (
    <div className={cn("space-y-4", className)}>
      <div>
        <h2 className="mb-1 text-lg font-bold text-foreground">Compression lab</h2>
        <p className="text-sm text-muted-foreground">
          Izquierda original (escalada al tamaño de la transformación) · derecha
          transformación. Abajo: formato, tamaño, quality
          {codec === "avif" ? ", effort" : ""}.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        onChange={handleFileChange}
      />

      {!file ? (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-4 py-16 text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:bg-muted/20"
        >
          <ImagePlus className="h-8 w-8" />
          Upload a source image
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            Change file
          </Button>
          <Button type="button" onClick={() => setFullscreen(true)} className="gap-2">
            <Maximize2 className="h-4 w-4" />
            Fullscreen
          </Button>
          <p className="truncate text-xs text-muted-foreground">
            {file.name} · {formatBytes(file.size)}
          </p>
        </div>
      )}

      {file && !fullscreen ? (
        <div className="flex max-h-[70vh] min-h-[420px] flex-col overflow-hidden rounded-xl border border-border">
          {board}
          {paramsBar}
        </div>
      ) : null}

      {fullscreen && file ? (
        <div className="fixed inset-0 z-[5000] flex flex-col bg-background">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
            <p className="truncate text-sm font-semibold text-foreground">
              Original vs transformación · {file.name}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFullscreen(false)}
              className="gap-1.5"
            >
              <X className="h-4 w-4" />
              Close
            </Button>
          </div>
          {board}
          {paramsBar}
        </div>
      ) : null}
    </div>
  )
}
