"use client"

import { cn } from "@/lib/utils"

export interface OnboardingStepAboutProps {
  bio: string
  gender: string
  phone: string
  dateOfBirth: string
  onBioChange: (value: string) => void
  onGenderChange: (value: string) => void
  onPhoneChange: (value: string) => void
  onDateOfBirthChange: (value: string) => void
}

const GENDER_OPTIONS = [
  { value: "", label: "Select…" },
  { value: "female", label: "Female" },
  { value: "male", label: "Male" },
  { value: "non_binary", label: "Non-binary" },
  { value: "other", label: "Other" },
  { value: "prefer_not", label: "Prefer not to say" },
]

export function OnboardingStepAbout({
  bio,
  gender,
  phone,
  dateOfBirth,
  onBioChange,
  onGenderChange,
  onPhoneChange,
  onDateOfBirthChange,
}: OnboardingStepAboutProps) {
  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-10 w-full text-center">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground sm:text-5xl md:text-6xl">
          Tell us about you
        </h1>
        <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
          You can always complete this later.
        </p>
      </div>
      <div className="w-full max-w-md space-y-5">
        <div>
          <label htmlFor="onboarding-bio" className="mb-1.5 block text-sm font-medium text-foreground">
            Bio
          </label>
          <textarea
            id="onboarding-bio"
            value={bio}
            onChange={(e) => onBioChange(e.target.value)}
            placeholder="A bit about you..."
            rows={3}
            className={cn(
              "w-full rounded-xl border border-border bg-card px-4 py-3 text-base outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20"
            )}
          />
        </div>
        <div>
          <label htmlFor="onboarding-gender" className="mb-1.5 block text-sm font-medium text-foreground">
            Gender
          </label>
          <select
            id="onboarding-gender"
            value={gender}
            onChange={(e) => onGenderChange(e.target.value)}
            className={cn(
              "w-full rounded-xl border border-border bg-card px-4 py-3 text-base outline-none transition-[border-color,box-shadow] text-foreground focus:ring-2 focus:ring-foreground/20"
            )}
          >
            {GENDER_OPTIONS.map((opt) => (
              <option key={opt.value || "empty"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="onboarding-phone" className="mb-1.5 block text-sm font-medium text-foreground">
            Phone
          </label>
          <input
            id="onboarding-phone"
            type="tel"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value)}
            placeholder="+34 600 000 000"
            className={cn(
              "w-full rounded-xl border border-border bg-card px-4 py-3 text-base outline-none transition-[border-color,box-shadow] placeholder:text-muted-foreground focus:ring-2 focus:ring-foreground/20"
            )}
          />
        </div>
        <div>
          <label htmlFor="onboarding-dob" className="mb-1.5 block text-sm font-medium text-foreground">
            Date of birth
          </label>
          <input
            id="onboarding-dob"
            type="date"
            value={dateOfBirth}
            onChange={(e) => onDateOfBirthChange(e.target.value)}
            className={cn(
              "w-full rounded-xl border border-border bg-card px-4 py-3 text-base outline-none transition-[border-color,box-shadow] text-foreground focus:ring-2 focus:ring-foreground/20"
            )}
          />
        </div>
      </div>
    </div>
  )
}
