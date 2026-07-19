import type { City } from "./city.entity"
import type { CreateCityData, UpdateCityData } from "./city.schemas"

/** Create payload after application-layer slug resolution. */
export type CreateCityRepoInput = Omit<CreateCityData, "region"> & { slug: string }

export type UpdateCityRepoInput = Omit<UpdateCityData, "slug"> & { slug?: string }

export interface CitiesRepositoryPort {
  getAll(): Promise<City[]>
  getById(id: string): Promise<City | null>
  getBySlug(slug: string): Promise<City | null>
  findByNameAndCountry(name: string, country: string): Promise<City | null>
  findSlugsByPrefix(prefix: string, excludeId?: string): Promise<string[]>
  /** Cities with ≥1 approved + active place (public SEO eligibility). */
  listWithPublicPlaces(): Promise<City[]>
  hasPublicPlaces(cityId: string): Promise<boolean>
  create(data: CreateCityRepoInput): Promise<City | null>
  update(id: string, data: UpdateCityRepoInput): Promise<City | null>
  delete(id: string): Promise<boolean>
}
