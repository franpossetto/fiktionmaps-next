"use client"

import { useEffect, useState } from "react"
import { ArrowLeft, Loader2, Trash2 } from "lucide-react"
import { useTranslations } from "next-intl"
import type { Fiction } from "@/src/fictions/domain/fiction.entity"
import type { Place } from "@/src/places/domain/place.entity"
import type { PlaceRelationshipWithPlaces } from "@/src/place-relationships/domain/place-relationship.entity"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormField } from "./form-field"
import {
  addPlaceRelationshipMemberAction,
  createPlaceRelationshipAction,
  deletePlaceRelationshipAction,
  getPlaceRelationshipsAction,
  removePlaceRelationshipMemberAction,
} from "@/src/place-relationships/infrastructure/next/place-relationship.actions"

type PlaceRelationshipsPanelProps = {
  place: Place
  places: Place[]
  fictions: Fiction[]
  onBack: () => void
}

export function PlaceRelationshipsPanel({
  place,
  places,
  fictions,
  onBack,
}: PlaceRelationshipsPanelProps) {
  const t = useTranslations("Admin")
  const [relationships, setRelationships] = useState<PlaceRelationshipWithPlaces[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const [compositeName, setCompositeName] = useState(`${place.name} venue`)
  const [compositeOtherPlaceId, setCompositeOtherPlaceId] = useState("")
  const [addMemberPlaceId, setAddMemberPlaceId] = useState<Record<string, string>>({})

  const fictionTitle = (fictionId: string) =>
    fictions.find((f) => f.id === fictionId)?.title ?? fictionId

  const sameFictionPlaces = places.filter(
    (p) => p.fictionId === place.fictionId && p.id !== place.id,
  )

  const reload = async () => {
    setLoading(true)
    setError(null)
    const result = await getPlaceRelationshipsAction({ placeId: place.id })
    setLoading(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setRelationships(result.relationships)
  }

  useEffect(() => {
    void reload()
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reload when place changes
  }, [place.id])

  const handleCreateComposite = async () => {
    setError(null)
    if (!compositeOtherPlaceId) {
      setError(t("relationshipsPickOtherPlace"))
      return
    }
    setBusy(true)
    const result = await createPlaceRelationshipAction({
      type: "composite",
      name: compositeName.trim() || place.name,
      placeIds: [place.id, compositeOtherPlaceId],
    })
    setBusy(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setCompositeOtherPlaceId("")
    await reload()
  }

  const handleAddMember = async (placeRelationshipId: string) => {
    const placeId = addMemberPlaceId[placeRelationshipId]
    if (!placeId) {
      setError(t("relationshipsPickOtherPlace"))
      return
    }
    setBusy(true)
    setError(null)
    const result = await addPlaceRelationshipMemberAction({
      placeRelationshipId,
      placeId,
    })
    setBusy(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    setAddMemberPlaceId((prev) => ({ ...prev, [placeRelationshipId]: "" }))
    await reload()
  }

  const handleRemoveMember = async (placeRelationshipId: string, placeId: string) => {
    const confirmed = window.confirm(t("relationshipsRemoveMemberConfirm"))
    if (!confirmed) return
    setBusy(true)
    setError(null)
    const result = await removePlaceRelationshipMemberAction({
      placeRelationshipId,
      placeId,
    })
    setBusy(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    await reload()
  }

  const handleDeleteGroup = async (placeRelationshipId: string) => {
    const confirmed = window.confirm(t("relationshipsDeleteGroupConfirm"))
    if (!confirmed) return
    setBusy(true)
    setError(null)
    const result = await deletePlaceRelationshipAction({ placeRelationshipId })
    setBusy(false)
    if (!result.success) {
      setError(result.error)
      return
    }
    await reload()
  }

  const shared = relationships.filter((r) => r.type === "shared")
  const composite = relationships.filter((r) => r.type === "composite")
  const hasComposite = composite.length > 0

  return (
    <div className="space-y-6 max-w-2xl">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("backToLocations")}
      </button>

      <div>
        <h2 className="text-lg font-bold text-foreground">{t("relationshipsTitle")}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          {t("relationshipsDescription", { place: place.name })}
        </p>
      </div>

      {error ? <p className="text-sm text-red-500">{error}</p> : null}

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          {t("relationshipsLoading")}
        </div>
      ) : (
        <div className="space-y-8">
          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("relationshipsShared")}
            </h3>
            {shared.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("relationshipsSharedEmpty")}</p>
            ) : (
              shared.map((group) => (
                <RelationshipGroupCard
                  key={group.id}
                  group={group}
                  fictionTitle={fictionTitle}
                  busy={busy}
                  onRemoveMember={handleRemoveMember}
                  onDeleteGroup={handleDeleteGroup}
                  addMemberSlot={null}
                  t={t}
                />
              ))
            )}
            <p className="text-xs text-muted-foreground">{t("relationshipsSharedHint")}</p>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              {t("relationshipsComposite")}
            </h3>
            {composite.map((group) => {
              const memberIds = new Set(group.members.map((m) => m.placeId))
              const candidates = sameFictionPlaces.filter((p) => !memberIds.has(p.id))
              return (
                <RelationshipGroupCard
                  key={group.id}
                  group={group}
                  fictionTitle={fictionTitle}
                  busy={busy}
                  onRemoveMember={handleRemoveMember}
                  onDeleteGroup={handleDeleteGroup}
                  addMemberSlot={
                    candidates.length > 0 ? (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Select
                          value={addMemberPlaceId[group.id] ?? ""}
                          onValueChange={(v) =>
                            setAddMemberPlaceId((prev) => ({ ...prev, [group.id]: v }))
                          }
                        >
                          <SelectTrigger className="sm:flex-1">
                            <SelectValue placeholder={t("relationshipsPickOtherPlace")} />
                          </SelectTrigger>
                          <SelectContent>
                            {candidates.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          type="button"
                          size="sm"
                          disabled={busy}
                          onClick={() => handleAddMember(group.id)}
                        >
                          {t("relationshipsAddMember")}
                        </Button>
                      </div>
                    ) : null
                  }
                  t={t}
                />
              )
            })}

            {!hasComposite ? (
              <div className="rounded-xl border border-border p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t("relationshipsCompositeCreateHint")}
                </p>
                <FormField label={t("name")}>
                  <Input
                    value={compositeName}
                    onChange={(e) => setCompositeName(e.target.value)}
                  />
                </FormField>
                <FormField label={t("relationshipsOtherPlace")}>
                  <Select
                    value={compositeOtherPlaceId}
                    onValueChange={setCompositeOtherPlaceId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("relationshipsPickOtherPlace")} />
                    </SelectTrigger>
                    <SelectContent>
                      {sameFictionPlaces.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormField>
                <Button
                  type="button"
                  variant="cta"
                  disabled={busy || sameFictionPlaces.length === 0}
                  onClick={handleCreateComposite}
                >
                  {t("relationshipsCreateComposite")}
                </Button>
                {sameFictionPlaces.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("relationshipsNoSameFictionPlaces")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </section>
        </div>
      )}
    </div>
  )
}

function RelationshipGroupCard({
  group,
  fictionTitle,
  busy,
  onRemoveMember,
  onDeleteGroup,
  addMemberSlot,
  t,
}: {
  group: PlaceRelationshipWithPlaces
  fictionTitle: (fictionId: string) => string
  busy: boolean
  onRemoveMember: (groupId: string, placeId: string) => void
  onDeleteGroup: (groupId: string) => void
  addMemberSlot: React.ReactNode
  t: ReturnType<typeof useTranslations<"Admin">>
}) {
  return (
    <div className="rounded-xl border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-medium text-foreground">{group.name}</p>
          <p className="text-xs text-muted-foreground">{group.slug}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={busy}
          onClick={() => onDeleteGroup(group.id)}
          className="text-red-400 hover:text-red-300"
        >
          <Trash2 className="h-4 w-4" />
          {t("relationshipsDeleteGroup")}
        </Button>
      </div>
      <ul className="space-y-2">
        {group.memberPlaces.map((member) => (
          <li
            key={member.placeId}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span>
              <span className="font-medium text-foreground">{member.name}</span>
              <span className="text-muted-foreground">
                {" "}
                · {fictionTitle(member.fictionId)}
                {member.shootEnvironment ? ` · ${member.shootEnvironment}` : ""}
              </span>
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onRemoveMember(group.id, member.placeId)}
            >
              {t("relationshipsRemoveMember")}
            </Button>
          </li>
        ))}
      </ul>
      {addMemberSlot}
    </div>
  )
}
