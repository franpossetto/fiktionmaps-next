export type TourMode = "singleCity" | "multiCity"
export type TourVisibility = "public" | "private"

export interface Place {
  id: string
  name: string
  cityId: string
  fictionIds: string[]
  lat: number
  lng: number
  coverImage: string
  tags: string[]
  address?: string
  description?: string
  visitTip?: string
}

export interface Tour {
  id: string
  slug: string
  title: string
  description: string
  coverImage: string
  mode: TourMode
  cityId?: string
  visibility: TourVisibility
  walkable?: boolean
  estimatedMinutes?: number | null
  creatorTips?: string
  createdAt: string
  createdBy?: string
}

export interface TourStop {
  id: string
  tourId: string
  placeId: string
  orderIndex: number
  note?: string
}

export interface TourDraft {
  mode: TourMode
  cityId: string | null
  title: string
  description: string
  coverImage: string
  visibility: TourVisibility
  walkable?: boolean
  estimatedMinutes?: number | null
  creatorTips?: string
  stops: TourStop[]
}

export interface TourStopWithPlace extends TourStop {
  place: Place
}

export interface ResolvedTour {
  tour: Tour
  stops: TourStopWithPlace[]
}

export interface TourMetrics {
  totalDistanceKm: number
  estimatedWalkMinutes: number
  estimatedRideMinutes: number
  suggestedWalkable: boolean
}

export interface StoredTourRecord {
  tour: Tour
  stops: TourStop[]
}

export interface PlaceFilters {
  cityIds?: string[]
  fictionIds?: string[]
  query?: string
  tags?: string[]
}
