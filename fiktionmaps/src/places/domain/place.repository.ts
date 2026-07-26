import type { FictionCityPairKey } from "@/src/places/domain/map-fiction-city-pair.entity"
import type { MapCluster } from "@/src/places/domain/map-cluster.entity"
import type { Place } from "@/src/places/domain/place.entity"
import type { MapBbox } from "@/lib/validation/map-query"
import type { CreatePlaceRepoInput, UpdatePlaceData } from "./place.schemas"
import type { SitemapPlaceEntry } from "@/src/places/domain/place-sitemap.entity"

export type GetClustersInBboxInput = {
  bbox: MapBbox
  gridDeg: number
  fictionIds?: string[] | null
  maxClusters?: number
}

export type GetByBboxInput = {
  bbox: MapBbox
  fictionIds?: string[] | null
  limit?: number
}

export type PlaceImageRoleUrls = {
  avatar: string | null
  hero: string | null
}

export interface PlacesRepositoryPort {
  /** Fiction IDs with at least one approved, active place (contributor photo picker). */
  listFictionIdsWithApprovedPlaces(): Promise<string[]>
  /** Approved and active place row exists (photo contributions). */
  isApprovedActivePlace(placeId: string): Promise<boolean>
  getPlaceImageUrlsByRole(placeId: string, variant?: "sm" | "lg"): Promise<PlaceImageRoleUrls>
  listAllPlaces(): Promise<Place[]>
  /** Count of approved + active places in the public catalog. */
  countApprovedActive(): Promise<number>
  getCountsByFictionIds(fictionIds: string[]): Promise<Record<string, number>>
  getById(placeId: string, avatarVariant?: "sm" | "lg"): Promise<Place | null>
  /** Batch fetch by place ids (order not guaranteed). */
  getByIds(placeIds: string[], avatarVariant?: "sm" | "lg"): Promise<Place[]>
  getByFictionIdAndSlug(fictionId: string, slug: string, avatarVariant?: "sm" | "lg"): Promise<Place | null>
  listSlugsByFictionId(fictionId: string): Promise<string[]>
  getByFictionId(fictionId: string): Promise<Place[]>
  listApprovedByFictionId(fictionId: string): Promise<Place[]>
  getByCityId(cityId: string): Promise<Place[]>
  getFictionIdsByCityId(cityId: string): Promise<string[]>
  /** Distinct city IDs that have at least one place (via location). */
  listCityIdsWithPlaces(): Promise<string[]>
  /** Distinct (fiction_id, city_id) for active places with a location. */
  listDistinctFictionCityPairs(): Promise<FictionCityPairKey[]>
  getByBboxAndFictionIds(fictionIds: string[], bbox: MapBbox): Promise<Place[]>
  /** Free-world place pins: optional fiction filter, hard limit. */
  getByBbox(input: GetByBboxInput): Promise<Place[]>
  /** Free-world LOD: grid aggregates via SQL RPC. */
  getClustersInBbox(input: GetClustersInBboxInput): Promise<MapCluster[]>
  create(data: CreatePlaceRepoInput): Promise<{ placeId: string; slug: string } | null>
  update(placeId: string, data: UpdatePlaceData): Promise<boolean>
  delete(placeId: string): Promise<boolean>
  listActivePlacesForSitemap(): Promise<SitemapPlaceEntry[]>
}
