"use client"

import { useState, useEffect, useMemo, useRef } from "react"
import { useTranslations } from "next-intl"
import { Link, useRouter } from "@/i18n/navigation"
import { ArrowLeft, CheckCircle2, Loader2, RefreshCw } from "lucide-react"
import type { FictionWithMedia } from "@/src/fictions/fiction.domain"
import type { Location } from "@/src/locations"
import type { Scene } from "@/src/scenes"
import { createClient } from "@/lib/supabase/client"
import { ASSET_VIDEOS_BUCKET } from "@/lib/asset-videos/asset-videos-bucket"
import { buildTimecodeLabel, parseTimecodeLabel, type TimecodeParts } from "@/lib/scenes/scene-timecode"
import { Button } from "@/components/ui/button"
import { FormField } from "./form-field"
import { SceneTimecodeInput } from "./scene-timecode-input"

function sanitizeFileName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_")
}

async function uploadSceneVideoToBucket(file: File): Promise<string> {
  const supabase = createClient()
  const path = `scenes/${crypto.randomUUID()}/${sanitizeFileName(file.name)}`
  const { error } = await supabase.storage.from(ASSET_VIDEOS_BUCKET).upload(path, file, {
    contentType: file.type || "video/mp4",
    upsert: false,
  })
  if (error) throw new Error(error.message)
  const { data } = supabase.storage.from(ASSET_VIDEOS_BUCKET).getPublicUrl(path)
  return data.publicUrl
}

interface SceneFormData {
  title: string
  description: string
  fictionId: string
  placeId: string
  timecode: TimecodeParts
  quote: string
  season: string
  episode: string
  episodeTitle: string
  videoFile: File | null
}

function sceneToForm(scene: Scene): SceneFormData {
  return {
    title: scene.title,
    description: scene.description,
    fictionId: scene.fictionId,
    placeId: scene.placeId,
    timecode: parseTimecodeLabel(scene.timestamp),
    quote: scene.quote ?? "",
    season: scene.season != null ? String(scene.season) : "",
    episode: scene.episode != null ? String(scene.episode) : "",
    episodeTitle: scene.episodeTitle ?? "",
    videoFile: null,
  }
}

export interface SceneEditViewProps {
  initialScene: Scene
}

export function SceneEditView({ initialScene }: SceneEditViewProps) {
  const t = useTranslations("Scenes")
  const router = useRouter()
  const [fictions, setFictions] = useState<FictionWithMedia[]>([])
  const [locations, setLocations] = useState<Location[]>([])
  const [formData, setFormData] = useState<SceneFormData>(() => sceneToForm(initialScene))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pendingVideoPreviewUrl, setPendingVideoPreviewUrl] = useState<string | null>(null)
  const videoFileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!formData.videoFile) {
      setPendingVideoPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(formData.videoFile)
    setPendingVideoPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [formData.videoFile])

  useEffect(() => {
    Promise.all([
      fetch("/api/admin/fictions").then((r) => (r.ok ? r.json() : [])),
      fetch("/api/admin/places").then((r) => (r.ok ? r.json() : [])),
    ])
      .then(([f, l]) => {
        setFictions((f ?? []) as FictionWithMedia[])
        setLocations((l ?? []) as Location[])
      })
      .catch(() => {})
  }, [])

  const selectedFiction = useMemo(
    () => fictions.find((f) => f.id === formData.fictionId),
    [fictions, formData.fictionId],
  )
  const selectedLocation = useMemo(
    () => locations.find((l) => l.id === formData.placeId),
    [locations, formData.placeId],
  )
  const isTv = selectedFiction?.type === "tv-series"
  const videoPreviewSrc = pendingVideoPreviewUrl ?? initialScene.videoUrl ?? null
  const timecodeDisplay = useMemo(() => buildTimecodeLabel(formData.timecode), [formData.timecode])

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.title.trim()) newErrors.title = "Scene title is required"
    if (!formData.description.trim()) newErrors.description = "Description is required"
    if (!formData.fictionId) newErrors.fictionId = "Fiction is required"
    if (!formData.placeId) newErrors.placeId = "Place is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setSaving(true)
    setError(null)
    try {
      let videoUrl: string | null = null
      if (formData.videoFile) {
        videoUrl = await uploadSceneVideoToBucket(formData.videoFile)
      }

      const season = formData.season.trim() ? parseInt(formData.season, 10) : null
      const episode = formData.episode.trim() ? parseInt(formData.episode, 10) : null
      if (isTv && season != null && (season <= 0 || !Number.isFinite(season))) {
        setErrors({ season: "Invalid season" })
        setSaving(false)
        return
      }
      if (isTv && episode != null && (episode <= 0 || !Number.isFinite(episode))) {
        setErrors({ episode: "Invalid episode" })
        setSaving(false)
        return
      }

      const timestampLabel = buildTimecodeLabel(formData.timecode)

      const basePayload = {
        fictionId: formData.fictionId,
        placeId: formData.placeId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        quote: formData.quote.trim() || null,
        timestampLabel,
        season: isTv ? season : null,
        episode: isTv ? episode : null,
        episodeTitle: isTv && formData.episodeTitle.trim() ? formData.episodeTitle.trim() : null,
      }

      const res = await fetch(`/api/scenes/${initialScene.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...basePayload,
          ...(videoUrl ? { videoUrl } : {}),
        }),
      })

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(j.error || "Failed to update scene")
      }

      router.push("/admin")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save scene")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-background text-foreground">
      <div className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-background/95 px-4 py-3 backdrop-blur">
        <Link
          href="/admin"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-foreground transition-colors hover:bg-card"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-lg font-bold">{t("editScene")}</h1>
          <p className="text-xs text-muted-foreground">{initialScene.title}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mx-auto w-full max-w-2xl space-y-6 px-4 py-6">
        {error && (
          <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2 text-sm text-red-200">{error}</div>
        )}

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t("stepDetailsHint")}</p>
          <div className="flex flex-col gap-2 mt-2">
            <div className="flex items-center gap-2 rounded-lg border border-foreground/30 bg-foreground/10 p-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
              <span className="text-xs font-medium text-foreground">Fiction: {selectedFiction?.title ?? "…"}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg border border-foreground/30 bg-foreground/10 p-3">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-foreground" />
              <span className="text-xs font-medium text-foreground">Place: {selectedLocation?.name ?? "…"}</span>
            </div>
          </div>
        </div>

        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">{t("videoUpload")}</p>
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-4">
              <div className="relative shrink-0 overflow-hidden rounded-lg border border-border bg-black sm:w-56">
                {videoPreviewSrc ? (
                  <video
                    key={videoPreviewSrc}
                    src={videoPreviewSrc}
                    controls
                    playsInline
                    className="aspect-video w-full max-h-[220px] object-contain sm:max-h-[180px]"
                  />
                ) : (
                  <div className="flex aspect-video w-full max-h-[220px] items-center justify-center bg-muted sm:max-h-[180px]">
                    <span className="px-2 text-center text-xs text-muted-foreground">{t("noVideoYet")}</span>
                  </div>
                )}
              </div>

              <div className="min-w-0 flex-1 space-y-1">
                <h3 className="line-clamp-2 font-semibold leading-tight text-foreground">
                  {formData.title.trim() || initialScene.title}
                </h3>
                <p className="truncate text-sm text-muted-foreground">{selectedFiction?.title ?? "…"}</p>
                <p className="truncate text-sm text-muted-foreground">{selectedLocation?.name ?? "…"}</p>
                {timecodeDisplay ? (
                  <p className="font-mono text-xs text-muted-foreground/90">{timecodeDisplay}</p>
                ) : null}
              </div>

              <div className="flex shrink-0 sm:justify-end">
                <input
                  ref={videoFileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null
                    const max = 100 * 1024 * 1024
                    if (f && f.size > max) {
                      setError(t("videoTooLarge"))
                      e.target.value = ""
                      return
                    }
                    setError(null)
                    setFormData((prev) => ({ ...prev, videoFile: f }))
                    e.target.value = ""
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2 sm:w-auto"
                  onClick={() => videoFileInputRef.current?.click()}
                >
                  <RefreshCw className="h-4 w-4 shrink-0" />
                  {t("replaceVideo")}
                </Button>
              </div>
            </div>
          </div>
        </div>

        <FormField label={t("sceneTitle")} required error={errors.title}>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            className="w-full rounded-lg border border-border bg-card px-4 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
        </FormField>

        <FormField label={t("description")} required error={errors.description}>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-card px-4 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/20"
          />
        </FormField>

        <FormField label={t("timestampOptional")}>
          <SceneTimecodeInput
            value={formData.timecode}
            onChange={(timecode) => setFormData({ ...formData, timecode })}
            labels={{
              hours: t("timecodeHours"),
              minutes: t("timecodeMinutes"),
              seconds: t("timecodeSeconds"),
            }}
          />
        </FormField>

        {isTv && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label={t("season")} error={errors.season}>
              <input
                type="number"
                min={1}
                value={formData.season}
                onChange={(e) => setFormData({ ...formData, season: e.target.value })}
                className="w-full rounded-lg border border-border bg-card px-4 py-2"
              />
            </FormField>
            <FormField label={t("episode")} error={errors.episode}>
              <input
                type="number"
                min={1}
                value={formData.episode}
                onChange={(e) => setFormData({ ...formData, episode: e.target.value })}
                className="w-full rounded-lg border border-border bg-card px-4 py-2"
              />
            </FormField>
            <FormField label={t("episodeTitle")}>
              <input
                type="text"
                value={formData.episodeTitle}
                onChange={(e) => setFormData({ ...formData, episodeTitle: e.target.value })}
                className="w-full rounded-lg border border-border bg-card px-4 py-2"
              />
            </FormField>
          </div>
        )}

        <FormField label={t("quoteOptional")}>
          <textarea
            value={formData.quote}
            onChange={(e) => setFormData({ ...formData, quote: e.target.value })}
            rows={2}
            className="w-full resize-none rounded-lg border border-border bg-card px-4 py-2"
          />
        </FormField>

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            disabled={saving}
            className="flex-1 gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {t("saveScene")}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/admin")}>
            {t("cancel")}
          </Button>
        </div>
      </form>
    </div>
  )
}
