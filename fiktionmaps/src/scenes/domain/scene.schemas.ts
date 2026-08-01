import { z } from "zod"

function parseNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null
  if (typeof v === "number") return Number.isFinite(v) ? v : null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** createSceneAction body. A scene is created with zero places; link them via linkScenePlaceAction. */
export const createSceneBodySchema = z
  .object({
    fictionId: z.string().trim().uuid(),
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
    quote: z.unknown().optional(),
    timestampLabel: z.unknown().optional(),
    timestamp: z.unknown().optional(),
    season: z.unknown().optional(),
    episode: z.unknown().optional(),
    episodeTitle: z.unknown().optional(),
    videoUrl: z.unknown().optional(),
    previewUrl: z.unknown().optional(),
    sortOrder: z.unknown().optional(),
    active: z.unknown().optional(),
  })
  .transform((body) => {
    const timestampLabel =
      body.timestampLabel != null
        ? String(body.timestampLabel)
        : body.timestamp != null
          ? String(body.timestamp)
          : null

    return {
      fictionId: body.fictionId,
      title: body.title,
      description: body.description,
      quote: body.quote != null ? String(body.quote) : null,
      timestampLabel,
      season: parseNullableNumber(body.season),
      episode: parseNullableNumber(body.episode),
      episodeTitle: body.episodeTitle != null ? String(body.episodeTitle) : null,
      videoUrl: body.videoUrl != null ? String(body.videoUrl) : null,
      previewUrl: body.previewUrl != null ? String(body.previewUrl) : null,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      active: body.active === false ? false : true,
    }
  })
  .superRefine((payload, ctx) => {
    if (payload.season != null && (payload.season <= 0 || !Number.isFinite(payload.season))) {
      ctx.addIssue({ code: "custom", message: "Invalid season", path: ["season"] })
    }
    if (payload.episode != null && (payload.episode <= 0 || !Number.isFinite(payload.episode))) {
      ctx.addIssue({ code: "custom", message: "Invalid episode", path: ["episode"] })
    }
  })

export type CreateSceneData = z.infer<typeof createSceneBodySchema>
export type UpdateSceneData = Partial<CreateSceneData>

const optionalUuidFromBody = z.preprocess(
  (v) => (v === undefined ? undefined : String(v).trim()),
  z.string().uuid().optional()
)

/** updateSceneAction body. Scene updates never touch place links (use linkScenePlaceAction). */
export const patchSceneBodySchema = z
  .object({
    fictionId: optionalUuidFromBody,
    title: z.unknown().optional(),
    description: z.unknown().optional(),
    quote: z.unknown().optional(),
    timestampLabel: z.unknown().optional(),
    timestamp: z.unknown().optional(),
    season: z.unknown().optional(),
    episode: z.unknown().optional(),
    episodeTitle: z.unknown().optional(),
    videoUrl: z.unknown().optional(),
    previewUrl: z.unknown().optional(),
    sortOrder: z.unknown().optional(),
    active: z.unknown().optional(),
  })
  .transform((body): UpdateSceneData => {
    const payload: UpdateSceneData = {}
    if (body.fictionId !== undefined) payload.fictionId = body.fictionId
    if (body.title !== undefined) payload.title = String(body.title).trim()
    if (body.description !== undefined) payload.description = String(body.description).trim()
    if (body.quote !== undefined) payload.quote = body.quote === null ? null : String(body.quote)
    if (body.timestampLabel !== undefined)
      payload.timestampLabel = body.timestampLabel === null ? null : String(body.timestampLabel)
    if (body.timestamp !== undefined && body.timestampLabel === undefined)
      payload.timestampLabel = body.timestamp === null ? null : String(body.timestamp)
    if (body.season !== undefined)
      payload.season = body.season === null ? null : Number(body.season)
    if (body.episode !== undefined)
      payload.episode = body.episode === null ? null : Number(body.episode)
    if (body.episodeTitle !== undefined)
      payload.episodeTitle = body.episodeTitle === null ? null : String(body.episodeTitle)
    if (body.videoUrl !== undefined)
      payload.videoUrl = body.videoUrl === null ? null : String(body.videoUrl)
    if (body.previewUrl !== undefined)
      payload.previewUrl = body.previewUrl === null ? null : String(body.previewUrl)
    if (body.sortOrder !== undefined) payload.sortOrder = Number(body.sortOrder)
    if (body.active !== undefined) payload.active = Boolean(body.active)
    return payload
  })
  .superRefine((payload, ctx) => {
    if (payload.season != null && (payload.season <= 0 || !Number.isFinite(payload.season))) {
      ctx.addIssue({ code: "custom", message: "Invalid season", path: ["season"] })
    }
    if (payload.episode != null && (payload.episode <= 0 || !Number.isFinite(payload.episode))) {
      ctx.addIssue({ code: "custom", message: "Invalid episode", path: ["episode"] })
    }
  })

/** linkScenePlaceAction body. Links one place to a scene; `sortOrder` is assigned server-side. */
export const linkScenePlaceBodySchema = z
  .object({
    sceneId: z.string().trim().uuid(),
    placeId: z.string().trim().uuid(),
    startSecond: z.unknown().optional(),
    endSecond: z.unknown().optional(),
  })
  .transform((body) => ({
    sceneId: body.sceneId,
    placeId: body.placeId,
    startSecond: parseNullableNumber(body.startSecond),
    endSecond: parseNullableNumber(body.endSecond),
  }))
  .superRefine((payload, ctx) => {
    if (payload.startSecond != null && payload.startSecond < 0) {
      ctx.addIssue({ code: "custom", message: "Invalid startSecond", path: ["startSecond"] })
    }
    if (payload.endSecond != null && payload.endSecond < 0) {
      ctx.addIssue({ code: "custom", message: "Invalid endSecond", path: ["endSecond"] })
    }
    if (
      payload.startSecond != null &&
      payload.endSecond != null &&
      payload.endSecond < payload.startSecond
    ) {
      ctx.addIssue({ code: "custom", message: "endSecond must be >= startSecond", path: ["endSecond"] })
    }
  })

export type LinkScenePlaceData = z.infer<typeof linkScenePlaceBodySchema>
