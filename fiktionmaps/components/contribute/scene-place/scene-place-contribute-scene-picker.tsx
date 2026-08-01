"use client"

import { useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { Loader2 } from "lucide-react"
import type { Scene } from "@/src/scenes/domain/scene.entity"
import { listFictionScenesForContributeAction } from "@/src/scenes/infrastructure/next/scene.actions"
import { ContributeFieldWrapper } from "@/components/contribute/contribute-field-wrapper"
import { ScenePreviewThumb } from "@/components/scenes/scene-preview-thumb"
import { cn } from "@/lib/utils"

const INPUT_ROW =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"

type ScenePlaceContributeScenePickerProps = {
  fictionId: string
  fictionTitle: string
  sceneId: string
  onSelect: (scene: Scene) => void
  error?: string
}

export function ScenePlaceContributeScenePicker({
  fictionId,
  fictionTitle,
  sceneId,
  onSelect,
  error,
}: ScenePlaceContributeScenePickerProps) {
  const t = useTranslations("Contribute.scenePlace")
  const [sceneSearch, setSceneSearch] = useState("")
  const [scenes, setScenes] = useState<Scene[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    setSceneSearch("")
    setScenes([])
    setLoading(true)
    void listFictionScenesForContributeAction(fictionId)
      .then((rows) => {
        if (!cancelled) setScenes(rows)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [fictionId])

  const filteredScenes = useMemo(() => {
    const q = sceneSearch.trim().toLowerCase()
    if (!q) return scenes
    return scenes.filter((s) => s.title.toLowerCase().includes(q))
  }, [sceneSearch, scenes])

  return (
    <div className="space-y-5">
      {fictionTitle ? (
        <p className="rounded-lg border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
          {t("fictionContext", { title: fictionTitle })}
        </p>
      ) : null}
      <input
        type="search"
        value={sceneSearch}
        onChange={(e) => setSceneSearch(e.target.value)}
        placeholder={t("sceneSearchPlaceholder")}
        className={INPUT_ROW}
        disabled={loading}
      />
      <ContributeFieldWrapper label={t("stepScene")} required error={error}>
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-muted-foreground" aria-hidden />
          </div>
        ) : filteredScenes.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">{t("noScenes")}</p>
        ) : (
          <div className="max-h-[min(50vh,22rem)] space-y-1 overflow-y-auto rounded-xl border border-border p-2">
            {filteredScenes.map((scene) => (
              <button
                key={scene.id}
                type="button"
                onClick={() => onSelect(scene)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors",
                  sceneId === scene.id ? "bg-primary/10" : "hover:bg-muted/60",
                )}
              >
                <ScenePreviewThumb scene={scene} className="h-10 w-14" sizes="56px" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{scene.title}</span>
                  <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                    {scene.places.length > 0
                      ? t("scenePlacesCount", { count: scene.places.length })
                      : t("sceneNoPlaces")}
                  </span>
                </span>
              </button>
            ))}
          </div>
        )}
      </ContributeFieldWrapper>
    </div>
  )
}
