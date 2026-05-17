export interface ProfilesReaderPort {
  getRole(userId: string): Promise<string | null>
}
