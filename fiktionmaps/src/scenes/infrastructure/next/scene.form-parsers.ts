import { z } from "zod"
import { optionalUuidQuerySchema, uuidSchema } from "@/lib/validation/primitives"

/** Parses HTTP query string params for the scenes list action/route. */
export const listScenesQuerySchema = z.object({
  fictionId: optionalUuidQuerySchema,
  placeId: optionalUuidQuerySchema,
  active: z
    .union([z.literal("true"), z.literal("false"), z.string(), z.null(), z.undefined()])
    .optional()
    .transform((v) => {
      if (v === "true") return true
      if (v === "false") return false
      return undefined
    }),
})

export const sceneContributeDraftSchema = z.object({
  fictionId: uuidSchema,
  /** Ordered place links for this scene (route order = array order → sort_order). */
  placeIds: z.array(uuidSchema).min(1),
  videoUrl: z.string().trim().url(),
  previewUrl: z.string().trim().url(),
  title: z.string().trim().min(1),
  description: z.string().trim().min(1),
  quote: z.string().trim().nullable().optional(),
  timestampLabel: z.string().trim().nullable().optional(),
  season: z.number().int().min(1).nullable().optional(),
  episode: z.number().int().min(1).nullable().optional(),
  episodeTitle: z.string().trim().nullable().optional(),
})

export type SceneContributeDraft = z.infer<typeof sceneContributeDraftSchema>

function parsePlaceIdsFromFormData(formData: FormData): string[] {
  const fromJson = formData.get("placeIds")
  if (typeof fromJson === "string" && fromJson.trim()) {
    try {
      const parsed = JSON.parse(fromJson) as unknown
      if (Array.isArray(parsed)) {
        return parsed.filter((v): v is string => typeof v === "string" && v.trim().length > 0)
      }
    } catch {
      // fall through to getAll / legacy placeId
    }
  }

  const fromAll = formData.getAll("placeIds").filter((v): v is string => typeof v === "string" && v.trim().length > 0)
  if (fromAll.length > 0) return fromAll

  const legacy = formData.get("placeId")
  if (typeof legacy === "string" && legacy.trim()) return [legacy.trim()]
  return []
}

export function parseSceneContributeFormData(formData: FormData): {
  success: true
  data: SceneContributeDraft
} | {
  success: false
  error: string
} {
  const raw = {
    fictionId: String(formData.get("fictionId") ?? ""),
    placeIds: parsePlaceIdsFromFormData(formData),
    videoUrl: String(formData.get("videoUrl") ?? ""),
    previewUrl: String(formData.get("previewUrl") ?? ""),
    title: String(formData.get("title") ?? ""),
    description: String(formData.get("description") ?? ""),
    quote: formData.get("quote") ? String(formData.get("quote")) : null,
    timestampLabel: formData.get("timestampLabel") ? String(formData.get("timestampLabel")) : null,
    season: formData.get("season") ? Number.parseInt(String(formData.get("season")), 10) : null,
    episode: formData.get("episode") ? Number.parseInt(String(formData.get("episode")), 10) : null,
    episodeTitle: formData.get("episodeTitle") ? String(formData.get("episodeTitle")) : null,
  }
  const parsed = sceneContributeDraftSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]?.message ?? "Invalid form data"
    return { success: false, error: first }
  }

  return { success: true, data: parsed.data }
}
