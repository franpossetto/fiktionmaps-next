export interface City {
  id: string
  name: string
  country: string
  /** Public URL segment; stable unless explicitly edited in admin. */
  slug: string
  lat: number
  lng: number
  zoom: number
  image_url: string | null
  created_at: string
  updated_at: string
}
