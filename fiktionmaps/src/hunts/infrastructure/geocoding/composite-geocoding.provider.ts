import type { HuntGeocodingPort, HuntGeocodingResult } from "@/src/hunts/domain/geocoding.port"

export class CompositeGeocodingProvider implements HuntGeocodingPort {
  readonly name: string

  constructor(
    private readonly primary: HuntGeocodingPort,
    private readonly fallback: HuntGeocodingPort,
  ) {
    this.name = `${primary.name}+${fallback.name}`
  }

  async geocode(query: string): Promise<HuntGeocodingResult | null> {
    const primaryResult = await this.primary.geocode(query)
    if (primaryResult) return primaryResult

    console.info(`[hunt/geocode] "${query}" → falling back to ${this.fallback.name}`)
    return this.fallback.geocode(query)
  }
}
