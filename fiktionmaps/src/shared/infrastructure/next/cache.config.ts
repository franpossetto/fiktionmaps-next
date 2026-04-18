export const CacheConfig = {
  short:  { revalidate: 60 },
  medium: { revalidate: 60 * 10 },
  long:   { revalidate: 60 * 60 },
  static: { revalidate: false },
} as const
