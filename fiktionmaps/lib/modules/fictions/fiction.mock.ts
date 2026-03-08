import fictionsData from "@/data/fictions.json"
import type { Fiction } from "./fiction.model"
import type { IFictionRepository } from "./fiction.repository"

export class MockFictionRepository implements IFictionRepository {
  private fictions: Fiction[] = fictionsData as Fiction[]

  async getAll(): Promise<Fiction[]> {
    return this.fictions
  }

  async getById(id: string): Promise<Fiction | undefined> {
    return this.fictions.find((f) => f.id === id)
  }

  async update(
    id: string,
    data: Partial<Omit<Fiction, "id">>,
  ): Promise<Fiction | undefined> {
    const index = this.fictions.findIndex((f) => f.id === id)
    if (index === -1) return undefined
    this.fictions[index] = { ...this.fictions[index], ...data }
    return this.fictions[index]
  }
}
