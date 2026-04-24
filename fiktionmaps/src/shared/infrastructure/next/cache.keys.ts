export const CacheKeys = {
  checkin:  (id: string) => ["checkin", id],
  city:     (id: string) => ["city", id],
  fiction:  (id: string) => ["fiction", id],
  interest: (id: string) => ["interest", id],
  location: (id: string) => ["location", id],
  person:   (id: string) => ["person", id],
  place:    (id: string) => ["place", id],
  scene:    (id: string) => ["scene", id],
  user:     (id: string) => ["user", id],
} as const
