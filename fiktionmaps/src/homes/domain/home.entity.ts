export interface UserHome {
  id: string
  userId: string
  cityId: string
  dateFrom: string
  dateTo: string | null
  createdAt: string
}

export interface CreateHomeData {
  cityId: string
  dateFrom: string
  dateTo?: string | null
}

export interface UpdateHomeData {
  dateFrom?: string
  dateTo?: string | null
}
