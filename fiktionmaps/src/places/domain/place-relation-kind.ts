import { z } from "zod"

export const placeRelationKindSchema = z.enum([
  "filmed",
  "featured",
  "mentioned",
  "inspired_by",
  "related_to",
])

export type PlaceRelationKind = z.infer<typeof placeRelationKindSchema>

export const PLACE_RELATION_KIND_DEFAULT: PlaceRelationKind = "filmed"

export const RELATION_KIND_OPTIONS: {
  value: PlaceRelationKind
  labelKey:
    | "relationKind_filmed"
    | "relationKind_featured"
    | "relationKind_mentioned"
    | "relationKind_inspired_by"
    | "relationKind_related_to"
}[] = [
  { value: "filmed", labelKey: "relationKind_filmed" },
  { value: "featured", labelKey: "relationKind_featured" },
  { value: "mentioned", labelKey: "relationKind_mentioned" },
  { value: "inspired_by", labelKey: "relationKind_inspired_by" },
  { value: "related_to", labelKey: "relationKind_related_to" },
]

export function parsePlaceRelationKind(raw: unknown): PlaceRelationKind {
  if (raw == null || raw === "") return PLACE_RELATION_KIND_DEFAULT
  const parsed = placeRelationKindSchema.safeParse(raw)
  return parsed.success ? parsed.data : PLACE_RELATION_KIND_DEFAULT
}
