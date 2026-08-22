"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useTranslations } from "next-intl"
import { AnimatePresence, motion } from "framer-motion"
import type { FictionWithMedia } from "@/src/fictions/domain/fiction.entity"
import {
  FICTION_PERSON_ROLES,
  type FictionPersonRole,
  type Person,
} from "@/src/persons/domain/person.entity"
import { submitAddCreditsContributionAction } from "@/src/contributions/infrastructure/next/contribution.actions"
import {
  getFictionPersonsAction,
  searchPersonsAction,
} from "@/src/persons/infrastructure/next/person.actions"
import { FictionContributeLayout } from "@/components/contribute/fiction/fiction-contribute-layout"
import { ContributeStepHeader } from "@/components/contribute/contribute-step-header"
import { ContributionWizardShell } from "@/components/contribute/contribution-wizard-shell"
import { PlacePhotoFictionPicker } from "@/components/contribute/photo/place-photo-fiction-picker"
import { ContributeFieldWrapper } from "@/components/contribute/contribute-field-wrapper"
import { CreditsContributeDoneView } from "@/components/contribute/credits/credits-contribute-done-view"
import { CONTRIBUTION_FPP } from "@/src/contributions/domain/contribution.config"
import { cn } from "@/lib/utils"

const TOTAL_STEPS = 4

const INPUT_ROW =
  "w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"

const stepVariants = {
  initial: { opacity: 0, x: 12 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -12 },
}

type CreditsContributeWizardProps = {
  initialFictions: FictionWithMedia[]
}

export function CreditsContributeWizard({ initialFictions }: CreditsContributeWizardProps) {
  const t = useTranslations("Contribute.credits")
  const [step, setStep] = useState(1)
  const [fictionId, setFictionId] = useState("")
  const [role, setRole] = useState<FictionPersonRole | "">("")
  const [personName, setPersonName] = useState("")
  const [personId, setPersonId] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [catalog, setCatalog] = useState<Person[]>([])
  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogFilter, setCatalogFilter] = useState("")
  const [linkedPersonIds, setLinkedPersonIds] = useState<Set<string>>(new Set())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitting, setSubmitting] = useState(false)
  const [doneVariant, setDoneVariant] = useState<"pending" | "approved" | null>(null)

  const fiction = useMemo(
    () => initialFictions.find((f) => f.id === fictionId) ?? null,
    [fictionId, initialFictions],
  )
  const fictionTitle = fiction?.title ?? ""

  const roleLabel = role ? t(`role_${role}` as "role_director") : ""
  const isCreatingPerson = !personId && personName.trim().length > 0

  useEffect(() => {
    if (!photoFile) {
      setPhotoPreview(null)
      return
    }
    const url = URL.createObjectURL(photoFile)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  useEffect(() => {
    const q = catalogFilter.trim()
    if (!role || q.length < 1) {
      setCatalog([])
      setCatalogLoading(false)
      return
    }
    let cancelled = false
    setCatalogLoading(true)
    const timer = window.setTimeout(() => {
      void searchPersonsAction(q).then((res) => {
        if (cancelled) return
        setCatalogLoading(false)
        if (res.success) setCatalog(res.persons)
        else setCatalog([])
      })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [role, catalogFilter])

  useEffect(() => {
    if (!fictionId || !role) {
      setLinkedPersonIds(new Set())
      return
    }
    let cancelled = false
    void getFictionPersonsAction(fictionId).then((res) => {
      if (cancelled || !res.success) return
      setLinkedPersonIds(
        new Set(res.persons.filter((p) => p.role === role).map((p) => p.person_id)),
      )
    })
    return () => {
      cancelled = true
    }
  }, [fictionId, role])

  const filteredCatalog = useMemo(
    () => catalog.filter((p) => !linkedPersonIds.has(p.id)),
    [catalog, linkedPersonIds],
  )

  const validateStep = useCallback(
    (s: number): boolean => {
      const next: Record<string, string> = {}
      if (s === 1 && !fictionId) next.fictionId = t("fictionRequired")
      if (s === 2 && !role) next.role = t("roleRequired")
      if (s === 3 && !personName.trim()) next.personName = t("personRequired")
      setErrors(next)
      return Object.keys(next).length === 0
    },
    [fictionId, role, personName, t],
  )

  function handleBack() {
    if (step > 1) setStep((s) => s - 1)
  }

  function handleNext() {
    if (!validateStep(step)) return
    if (step < TOTAL_STEPS) setStep((s) => s + 1)
  }

  async function handleSubmit() {
    if (!validateStep(3) || !fictionId || !role || !personName.trim()) return
    setSubmitting(true)
    setErrors({})
    try {
      const fd = new FormData()
      fd.set("fictionId", fictionId)
      fd.set("role", role)
      fd.set("personName", personName.trim())
      if (personId) fd.set("personId", personId)
      if (!personId && photoFile) fd.set("photo", photoFile)
      const res = await submitAddCreditsContributionAction(fd)
      if (!res.success) {
        setErrors({ submit: res.error })
        return
      }
      setDoneVariant(res.autoApproved ? "approved" : "pending")
    } finally {
      setSubmitting(false)
    }
  }

  if (doneVariant) {
    const fictionHref = fiction?.slug ? `/fictions/${fiction.slug}` : "/profile/contribute"
    return (
      <FictionContributeLayout leftAside={null} rightAside={null}>
        <div className="flex min-h-[50vh] w-full items-center justify-center px-4 py-10">
          <CreditsContributeDoneView
            variant={doneVariant}
            fictionTitle={fictionTitle}
            personName={personName.trim()}
            roleLabel={roleLabel}
            fictionHref={fictionHref}
          />
        </div>
      </FictionContributeLayout>
    )
  }

  const fpp = CONTRIBUTION_FPP.add_credits

  return (
    <FictionContributeLayout leftAside={null} rightAside={null} mainColumnScroll={false}>
      <ContributionWizardShell
        stepIndex={step - 1}
        totalSteps={TOTAL_STEPS}
        contentMaxWidthClassName="max-w-3xl"
        footerNav={{
          showBack: step > 1,
          onBack: handleBack,
          isLastStep: step === TOTAL_STEPS,
          onNext: handleNext,
          onSubmit: () => void handleSubmit(),
          submitLabel: step === TOTAL_STEPS ? t("submit") : undefined,
          disabled: submitting || (step === 2 && !fictionId) || (step === 3 && !role),
          loading: submitting,
          showTrailingArrow: step < TOTAL_STEPS,
        }}
      >
        {step === 1 ? (
          <div className="mb-6 text-sm text-muted-foreground">{t("fppHint", { count: fpp })}</div>
        ) : null}

        {step !== TOTAL_STEPS ? (
          <ContributeStepHeader
            title={t(`step${step}Title` as "step1Title")}
            description={t(`step${step}Description` as "step1Description")}
            badge="required"
            stepNumber={step}
            totalSteps={TOTAL_STEPS}
            variant="minimal"
          />
        ) : null}

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            variants={stepVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={step !== TOTAL_STEPS ? "mt-8" : undefined}
          >
            {step === 1 ? (
              <PlacePhotoFictionPicker
                fictions={initialFictions}
                fictionId={fictionId}
                onSelect={(id) => {
                  setFictionId(id)
                  setRole("")
                  setPersonName("")
                  setPersonId(null)
                }}
                error={errors.fictionId}
                emptyListMessage="noFictionsApproved"
              />
            ) : null}

            {step === 2 && fictionId ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">{t("fictionContext", { title: fictionTitle })}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {FICTION_PERSON_ROLES.map((r) => {
                    const selected = role === r
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          setRole(r)
                          setPersonName("")
                          setPersonId(null)
                          setCatalogFilter("")
                          setCatalog([])
                          setPhotoFile(null)
                          setErrors((prev) => {
                            if (!prev.role) return prev
                            const next = { ...prev }
                            delete next.role
                            return next
                          })
                        }}
                        className={cn(
                          "rounded-xl border px-3 py-3 text-sm font-medium transition-colors",
                          selected
                            ? "border-primary bg-primary/10 text-foreground"
                            : "border-border bg-card/20 text-muted-foreground hover:bg-muted/50 hover:text-foreground",
                        )}
                      >
                        {t(`role_${r}` as "role_director")}
                      </button>
                    )
                  })}
                </div>
                {errors.role ? <p className="text-sm text-destructive">{errors.role}</p> : null}
              </div>
            ) : null}

            {step === 3 && role ? (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground">{t("personCatalogHint")}</p>
                <div className="space-y-2">
                  <label className="sr-only" htmlFor="credits-person-filter">
                    {t("personFilterLabel")}
                  </label>
                  <input
                    id="credits-person-filter"
                    type="search"
                    value={catalogFilter}
                    onChange={(e) => setCatalogFilter(e.target.value)}
                    className={INPUT_ROW}
                    placeholder={t("personFilterPlaceholder")}
                    autoComplete="off"
                  />
                  <div className="max-h-52 overflow-y-auto overscroll-contain rounded-xl border border-border bg-card/20">
                    {catalogLoading ? (
                      <p className="px-3 py-3 text-center text-sm text-muted-foreground">
                        {t("personCatalogLoading")}
                      </p>
                    ) : !catalogFilter.trim() ? (
                      <p className="px-3 py-3 text-center text-sm text-muted-foreground">
                        {t("personCatalogTypeToSearch")}
                      </p>
                    ) : filteredCatalog.length === 0 ? (
                      <p className="px-3 py-3 text-center text-sm text-muted-foreground">
                        {t("personCatalogEmpty")}
                      </p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {filteredCatalog.map((p) => {
                          const selected = personId === p.id
                          return (
                            <li key={p.id}>
                              <button
                                type="button"
                                onClick={() => {
                                  setPersonName(p.name)
                                  setPersonId(p.id)
                                  setPhotoFile(null)
                                  setErrors((prev) => {
                                    if (!prev.personName) return prev
                                    const next = { ...prev }
                                    delete next.personName
                                    return next
                                  })
                                }}
                                className={cn(
                                  "flex w-full items-center px-3 py-2.5 text-left text-sm transition-colors hover:bg-muted/60",
                                  selected && "bg-accent/50 text-accent-foreground",
                                )}
                              >
                                {p.name}
                              </button>
                            </li>
                          )
                        })}
                      </ul>
                    )}
                  </div>
                </div>
                <ContributeFieldWrapper label={t("fieldPerson")} required error={errors.personName}>
                  <input
                    type="text"
                    value={personName}
                    onChange={(e) => {
                      setPersonName(e.target.value)
                      setPersonId(null)
                      setErrors((prev) => {
                        if (!prev.personName) return prev
                        const next = { ...prev }
                        delete next.personName
                        return next
                      })
                    }}
                    className={INPUT_ROW}
                    placeholder={t("personPlaceholder")}
                  />
                </ContributeFieldWrapper>

                {isCreatingPerson ? (
                  <ContributeFieldWrapper label={t("fieldPhoto")} error={errors.photo}>
                    <div className="flex items-center gap-4">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-border bg-muted/40">
                        {photoPreview ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                            —
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1 space-y-2">
                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/gif"
                          className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
                          onChange={(e) => {
                            const file = e.target.files?.[0] ?? null
                            setPhotoFile(file)
                          }}
                        />
                        <p className="text-xs text-muted-foreground">{t("photoHint")}</p>
                        {photoFile ? (
                          <button
                            type="button"
                            className="text-xs font-medium text-muted-foreground underline-offset-4 hover:underline"
                            onClick={() => setPhotoFile(null)}
                          >
                            {t("photoClear")}
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </ContributeFieldWrapper>
                ) : null}
              </div>
            ) : null}

            {step === 4 && fictionId && role ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-border bg-card/30 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    {t("previewRibbon")}
                  </p>
                  <p className="mt-3 text-lg font-semibold text-foreground">{fictionTitle}</p>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{t("previewRole")}</dt>
                      <dd className="font-medium text-foreground">{roleLabel}</dd>
                    </div>
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{t("previewPerson")}</dt>
                      <dd className="font-medium text-foreground">{personName.trim()}</dd>
                    </div>
                    {isCreatingPerson && photoPreview ? (
                      <div className="flex items-center justify-between gap-4 pt-1">
                        <dt className="text-muted-foreground">{t("previewPhoto")}</dt>
                        <dd>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={photoPreview}
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                          />
                        </dd>
                      </div>
                    ) : null}
                  </dl>
                  <p className="mt-4 text-sm text-muted-foreground">{t("fppHint", { count: fpp })}</p>
                </div>
                {errors.submit ? <p className="text-sm text-destructive">{errors.submit}</p> : null}
              </div>
            ) : null}
          </motion.div>
        </AnimatePresence>
      </ContributionWizardShell>
    </FictionContributeLayout>
  )
}
