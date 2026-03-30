export interface CreateHomeData {
  cityId: string
  dateFrom: string
  dateTo?: string | null
}

export interface UpdateHomeData {
  dateFrom?: string
  dateTo?: string | null
}
