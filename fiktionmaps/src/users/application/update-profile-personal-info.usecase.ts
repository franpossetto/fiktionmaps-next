import type { UsersRepositoryPort } from "@/src/users/domain/user.repository"
import type { Profile } from "@/src/users/domain/user.entity"
import type { UpdatePersonalInfoData } from "@/src/users/domain/user.dtos"

const GENDER_VALUES = new Set([
  "female",
  "male",
  "non_binary",
  "other",
  "prefer_not",
])

function emptyToNull(value: string | null | undefined): string | null {
  if (value == null) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

function normalizeDateOfBirth(value: string | null | undefined): string | null {
  const trimmed = emptyToNull(value)
  if (!trimmed) return null
  // Expect YYYY-MM-DD from <input type="date">
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("Invalid date of birth")
  }
  return trimmed
}

function normalizeGender(value: string | null | undefined): string | null {
  const trimmed = emptyToNull(value)
  if (!trimmed) return null
  if (!GENDER_VALUES.has(trimmed)) {
    throw new Error("Invalid gender")
  }
  return trimmed
}

export async function updateProfilePersonalInfoUseCase(
  userId: string,
  input: UpdatePersonalInfoData,
  repo: UsersRepositoryPort
): Promise<Profile | null> {
  const updates: UpdatePersonalInfoData = {
    full_name: emptyToNull(input.full_name),
    bio: emptyToNull(input.bio),
    gender: normalizeGender(input.gender),
    phone: emptyToNull(input.phone),
    date_of_birth: normalizeDateOfBirth(input.date_of_birth),
  }

  if (updates.bio && updates.bio.length > 500) {
    throw new Error("Bio is too long (max 500 characters)")
  }
  if (updates.full_name && updates.full_name.length > 80) {
    throw new Error("Name is too long (max 80 characters)")
  }
  if (updates.phone && updates.phone.length > 40) {
    throw new Error("Phone is too long (max 40 characters)")
  }

  return repo.updateProfile(userId, updates)
}
