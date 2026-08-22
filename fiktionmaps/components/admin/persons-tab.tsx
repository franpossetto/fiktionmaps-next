"use client"

import { useEffect, useState } from "react"
import { useRouter } from "@/i18n/navigation"
import { Users, Plus, MoreVertical, Trash2, Search, Loader2, Pencil } from "lucide-react"
import type { Person } from "@/src/persons/domain/person.entity"
import { FICTION_PERSON_ROLES } from "@/src/persons/domain/person.entity"
import { Button } from "@/components/ui/button"
import { FormField } from "./form-field"
import {
  createPersonAction,
  deletePersonAction,
  updatePersonAction,
  uploadPersonImageAction,
} from "@/src/persons/infrastructure/next/person.actions"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

type ViewMode = "cards" | "table"
type WorkflowStep = "list" | "create" | "edit"

interface PersonsTabProps {
  initialPersons?: Person[]
  viewMode?: ViewMode
}

const emptyForm = { name: "", bio: "", nationality: "", birth_year: "" }

const inputClass = cn(
  "w-full rounded-lg border border-border bg-card px-4 py-2 text-foreground placeholder:text-muted-foreground outline-none transition-all",
  "focus:border-foreground focus:ring-1 focus:ring-foreground/20"
)

export function PersonsTab({ initialPersons, viewMode = "cards" }: PersonsTabProps) {
  const router = useRouter()
  const [persons, setPersons] = useState<Person[]>(initialPersons ?? [])
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>("list")
  const [editingPerson, setEditingPerson] = useState<Person | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [formData, setFormData] = useState(emptyForm)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [personToDelete, setPersonToDelete] = useState<Person | null>(null)
  const [deleteConfirmName, setDeleteConfirmName] = useState("")
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    setPersons(initialPersons ?? [])
  }, [initialPersons])

  useEffect(() => {
    if (!photoFile) return
    const url = URL.createObjectURL(photoFile)
    setPhotoPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [photoFile])

  const openCreateForm = () => {
    setEditingPerson(null)
    setFormData(emptyForm)
    setPhotoFile(null)
    setPhotoPreview(null)
    setErrors({})
    setSubmitError(null)
    setWorkflowStep("create")
  }

  const openEditForm = (person: Person) => {
    setEditingPerson(person)
    setFormData({
      name: person.name,
      bio: person.bio ?? "",
      nationality: person.nationality ?? "",
      birth_year: person.birth_year != null ? String(person.birth_year) : "",
    })
    setPhotoFile(null)
    setPhotoPreview(person.photo_url)
    setErrors({})
    setSubmitError(null)
    setWorkflowStep("edit")
  }

  const closeForm = () => {
    setWorkflowStep("list")
    setEditingPerson(null)
    setPhotoFile(null)
    setPhotoPreview(null)
    setErrors({})
    setSubmitError(null)
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = "Name is required"
    if (formData.birth_year) {
      const y = parseInt(formData.birth_year, 10)
      if (Number.isNaN(y) || y < 1800 || y > new Date().getFullYear())
        newErrors.birth_year = "Invalid year"
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const personPayload = () => ({
    name: formData.name.trim(),
    bio: formData.bio.trim() || null,
    nationality: formData.nationality.trim() || null,
    birth_year: formData.birth_year ? parseInt(formData.birth_year, 10) : null,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    setSubmitting(true)
    setSubmitError(null)
    const payload = personPayload()

    if (workflowStep === "edit" && editingPerson) {
      const result = await updatePersonAction(editingPerson.id, payload)
      if (!result.success) {
        setSubmitting(false)
        setSubmitError(result.error)
        return
      }
      let nextPerson = result.person
      if (photoFile) {
        const fd = new FormData()
        fd.set("file", photoFile)
        const upload = await uploadPersonImageAction(editingPerson.id, fd)
        if (!upload.success) {
          setSubmitting(false)
          setSubmitError(upload.error)
          return
        }
        nextPerson = { ...nextPerson, photo_url: upload.photoUrl }
      }
      setSubmitting(false)
      closeForm()
      setPersons((prev) =>
        prev
          .map((p) => (p.id === nextPerson.id ? nextPerson : p))
          .sort((a, b) => a.name.localeCompare(b.name))
      )
      router.refresh()
      return
    }

    const result = await createPersonAction({
      name: payload.name,
      bio: payload.bio ?? undefined,
      nationality: payload.nationality ?? undefined,
      birth_year: payload.birth_year,
    })
    if (!result.success) {
      setSubmitting(false)
      setSubmitError(result.error)
      return
    }
    let nextPerson = result.person
    if (photoFile) {
      const fd = new FormData()
      fd.set("file", photoFile)
      const upload = await uploadPersonImageAction(result.person.id, fd)
      if (!upload.success) {
        setSubmitting(false)
        setSubmitError(upload.error)
        return
      }
      nextPerson = { ...nextPerson, photo_url: upload.photoUrl }
    }
    setSubmitting(false)
    closeForm()
    setPersons((prev) => [...prev, nextPerson].sort((a, b) => a.name.localeCompare(b.name)))
    router.refresh()
  }

  const openDeleteModal = (e: React.MouseEvent, person: Person) => {
    e.stopPropagation()
    setPersonToDelete(person)
    setDeleteConfirmName("")
  }

  const closeDeleteModal = () => {
    setPersonToDelete(null)
    setDeleteConfirmName("")
  }

  const handleConfirmDelete = async () => {
    if (!personToDelete || deleteConfirmName !== personToDelete.name) return
    setDeleting(true)
    const result = await deletePersonAction(personToDelete.id)
    setDeleting(false)
    if (result.success) {
      closeDeleteModal()
      setPersons((prev) => prev.filter((p) => p.id !== personToDelete.id))
      router.refresh()
    }
  }

  const deleteNameMatches = personToDelete !== null && deleteConfirmName === personToDelete.name

  const filtered = persons.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (p.nationality ?? "").toLowerCase().includes(searchTerm.toLowerCase())
  )

  if (workflowStep === "create" || workflowStep === "edit") {
    const isEdit = workflowStep === "edit"
    return (
      <>
        <div className="fixed inset-0 bottom-[70px] md:bottom-0 md:left-[60px] z-[3000] bg-background flex flex-col overflow-y-auto">
          <div className="px-4 sm:px-6 pt-6 pb-4">
            <button
              type="button"
              onClick={closeForm}
              className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
            >
              ← Back to People
            </button>
            <h2 className="text-2xl font-bold text-foreground">
              {isEdit ? "Edit Person" : "Create Person"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isEdit
                ? "Update catalog details for this person. Fiction roles are managed from the fiction edit view."
                : "Add a real-world person to the catalog. You can link them to fictions with a role from the fiction edit view."}
            </p>
          </div>

          <form id="person-form" onSubmit={handleSubmit} className="flex-1 px-4 sm:px-6 pb-28 space-y-6 max-w-2xl">
            {submitError && (
              <p className="text-sm text-red-500 bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
                {submitError}
              </p>
            )}

            <FormField label="Name" required error={errors.name}>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g. Quentin Tarantino"
                className={inputClass}
                autoFocus
              />
            </FormField>

            <FormField label="Photo">
              <div className="flex items-center gap-4">
                <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-border bg-muted/40">
                  {photoPreview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={photoPreview} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                      No photo
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
                    onChange={(e) => setPhotoFile(e.target.files?.[0] ?? null)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Uploads xs / sm / lg / xl variants. Leave empty to keep the current photo.
                  </p>
                </div>
              </div>
            </FormField>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField label="Nationality">
                <input
                  type="text"
                  value={formData.nationality}
                  onChange={(e) => setFormData((p) => ({ ...p, nationality: e.target.value }))}
                  placeholder="e.g. American"
                  className={inputClass}
                />
              </FormField>
              <FormField label="Birth year" error={errors.birth_year}>
                <input
                  type="number"
                  value={formData.birth_year}
                  onChange={(e) => setFormData((p) => ({ ...p, birth_year: e.target.value }))}
                  placeholder="e.g. 1963"
                  min={1800}
                  max={new Date().getFullYear()}
                  className={inputClass}
                />
              </FormField>
            </div>

            <FormField label="Bio">
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData((p) => ({ ...p, bio: e.target.value }))}
                placeholder="Short biography…"
                rows={3}
                className={cn(inputClass, "resize-none")}
              />
            </FormField>

            <div className="rounded-lg border border-border bg-muted/30 p-4 space-y-1">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Available roles</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {FICTION_PERSON_ROLES.map((r) => (
                  <span key={r} className="text-xs px-2 py-1 rounded-full border border-border text-muted-foreground">
                    {r}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground pt-1">
                Roles are assigned per fiction in the fiction edit view.
              </p>
            </div>
          </form>
        </div>

        <div className="fixed bottom-[70px] left-0 right-0 md:bottom-0 md:left-[60px] z-[3001] border-t border-border bg-background px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <Button type="button" variant="outline" onClick={closeForm} className="rounded-xl px-6">
              Cancel
            </Button>
            <Button
              type="submit"
              form="person-form"
              variant="cta"
              disabled={submitting}
              className="gap-2 rounded-xl px-6"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {isEdit ? "Saving…" : "Creating…"}
                </>
              ) : isEdit ? (
                "Save Changes"
              ) : (
                "Create Person"
              )}
            </Button>
          </div>
        </div>
      </>
    )
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Users className="h-5 w-5" />
              People ({filtered.length})
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              Authors, directors, actors, and other people linked to fictions.
            </p>
          </div>
          <Button onClick={openCreateForm} variant="cta" className="gap-2">
            <Plus className="h-4 w-4" />
            Create Person
          </Button>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search people…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground transition-colors"
            />
          </div>
        </div>
      </div>

      {viewMode === "cards" ? (
        <div className="max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((person) => (
              <div
                key={person.id}
                className="group rounded-xl border border-border bg-card/30 hover:border-foreground/30 hover:bg-card/50 transition-all p-4 space-y-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => openEditForm(person)}
                    className="flex-1 min-w-0 text-left"
                  >
                    <div className="flex items-start gap-3">
                      <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full border border-border/60 bg-muted/40">
                        {person.photo_url ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={person.photo_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                            {person.name.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <h3 className="font-semibold text-foreground truncate">{person.name}</h3>
                        {(person.nationality || person.birth_year) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[person.nationality, person.birth_year].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {person.bio && (
                          <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{person.bio}</p>
                        )}
                      </div>
                    </div>
                  </button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        type="button"
                        className="p-2 rounded-lg text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-colors opacity-0 group-hover:opacity-100"
                        aria-label="Actions"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEditForm(person)}>
                        <Pencil className="h-3 w-3" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => openDeleteModal(e as React.MouseEvent, person)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="h-3 w-3" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full text-sm text-muted-foreground py-4">No people found.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-xl border border-border">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-xs font-semibold uppercase text-muted-foreground py-3 px-4">Name</th>
                <th className="text-xs font-semibold uppercase text-muted-foreground py-3 px-4">Nationality</th>
                <th className="text-xs font-semibold uppercase text-muted-foreground py-3 px-4">Birth year</th>
                <th className="text-xs font-semibold uppercase text-muted-foreground py-3 px-4 w-20">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((person) => (
                <tr
                  key={person.id}
                  className="border-b border-border last:border-b-0 hover:bg-muted/20 cursor-pointer"
                  onClick={() => openEditForm(person)}
                >
                  <td className="py-3 px-4 font-medium text-foreground">{person.name}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{person.nationality ?? "—"}</td>
                  <td className="py-3 px-4 text-sm text-muted-foreground">{person.birth_year ?? "—"}</td>
                  <td className="py-3 px-4" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="p-2 rounded-lg text-muted-foreground hover:bg-foreground/10 hover:text-foreground transition-colors"
                          aria-label="Actions"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditForm(person)}>
                          <Pencil className="h-3 w-3" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => openDeleteModal(e as React.MouseEvent, person)}
                          className="text-red-600 focus:text-red-600"
                        >
                          <Trash2 className="h-3 w-3" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-6 px-4 text-sm text-muted-foreground text-center">
                    No people found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <AlertDialog open={personToDelete !== null} onOpenChange={(open) => { if (!open) closeDeleteModal() }}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete person</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the person from all fictions. To confirm, type the exact name.
              {personToDelete && (
                <span className="mt-2 block font-semibold text-foreground">«{personToDelete.name}»</span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <input
              type="text"
              value={deleteConfirmName}
              onChange={(e) => setDeleteConfirmName(e.target.value)}
              placeholder="Exact name of the person"
              className="w-full px-4 py-2 rounded-lg border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-foreground focus:ring-1 focus:ring-foreground/20"
              autoFocus
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={closeDeleteModal}>Cancel</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={!deleteNameMatches || deleting}
              onClick={handleConfirmDelete}
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete"
              )}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
