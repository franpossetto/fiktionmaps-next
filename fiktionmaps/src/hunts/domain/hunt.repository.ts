import type { Hunt, HuntStatus, HuntPayload, HuntStats } from "./hunt.entity"

export interface CreateHuntData {
  huntSourceId: string
  payload: HuntPayload
  createdBy: string
  stats?: Partial<HuntStats>
}

export interface HuntsRepositoryPort {
  getById(id: string): Promise<Hunt | null>
  listBySourceId(sourceId: string): Promise<Hunt[]>
  listByCreatedBy(userId: string): Promise<Hunt[]>
  create(data: CreateHuntData): Promise<Hunt | null>
  updatePayloadAndStatus(
    id: string,
    payload: HuntPayload,
    status: HuntStatus,
    stats: Partial<HuntStats>,
    hunterNote?: string | null,
  ): Promise<boolean>
  updatePayload(id: string, payload: HuntPayload): Promise<boolean>
  updateReviewDraft(
    id: string,
    payload: HuntPayload,
    hunterNote?: string | null,
  ): Promise<boolean>
  delete(id: string): Promise<boolean>
}
