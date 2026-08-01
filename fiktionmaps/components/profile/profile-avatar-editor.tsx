"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { Camera, Loader2 } from "lucide-react"
import { useTranslations } from "next-intl"
import {
  updateMyProfileAvatarAction,
  updateMyProfileAvatarFocusAction,
} from "@/src/users/infrastructure/next/user.actions"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ImageFocusPicker } from "@/components/ui/image-focus-picker"
import {
  DEFAULT_IMAGE_FOCUS,
  type ImageFocus,
} from "@/lib/asset-images/image-focus"
import { cn } from "@/lib/utils"

type ProfileAvatarEditorProps = {
  children: React.ReactNode
  /** When false, renders children only (public profile). */
  editable?: boolean
  /** Current displayed avatar src (resolved). Used to reopen for reposition. */
  currentSrc?: string | null
  /** Whether currentSrc is a custom uploaded photo (http), not a character id asset. */
  canReposition?: boolean
  initialFocus?: ImageFocus | null
  onUploaded?: (avatarUrl: string, focus: ImageFocus) => void
  onFocusSaved?: (focus: ImageFocus) => void
  className?: string
}

export function ProfileAvatarEditor({
  children,
  editable = false,
  currentSrc = null,
  canReposition = false,
  initialFocus = null,
  onUploaded,
  onFocusSaved,
  className,
}: ProfileAvatarEditorProps) {
  const t = useTranslations("Profile")
  const inputRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [focus, setFocus] = useState<ImageFocus>(initialFocus ?? DEFAULT_IMAGE_FOCUS)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  if (!editable) {
    return <div className={className}>{children}</div>
  }

  const dialogSrc = previewUrl || (canReposition ? currentSrc : null)
  const canSave = Boolean(file || (canReposition && currentSrc && !file))

  function resetDialog() {
    setFile(null)
    setPreviewUrl(null)
    setFocus(initialFocus ?? DEFAULT_IMAGE_FOCUS)
    setError(null)
  }

  function openEditor() {
    setError(null)
    setFocus(initialFocus ?? DEFAULT_IMAGE_FOCUS)
    if (canReposition && currentSrc) {
      setFile(null)
      setPreviewUrl(null)
      setOpen(true)
      return
    }
    inputRef.current?.click()
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const next = event.target.files?.[0]
    event.target.value = ""
    if (!next) return
    setFile(next)
    setFocus(DEFAULT_IMAGE_FOCUS)
    setError(null)
    setOpen(true)
  }

  function onSave() {
    if (!canSave || isPending) return

    startTransition(async () => {
      setError(null)

      if (file) {
        const formData = new FormData()
        formData.set("file", file)
        formData.set("focusX", String(focus.x))
        formData.set("focusY", String(focus.y))
        const result = await updateMyProfileAvatarAction(formData)
        if (!result.success) {
          setError(result.error)
          return
        }
        onUploaded?.(result.avatarUrl, result.focus)
        setOpen(false)
        resetDialog()
        return
      }

      const result = await updateMyProfileAvatarFocusAction({
        focusX: focus.x,
        focusY: focus.y,
      })
      if (!result.success) {
        setError(result.error)
        return
      }
      onFocusSaved?.(result.focus)
      setOpen(false)
      resetDialog()
    })
  }

  return (
    <div className="space-y-2">
      <div className={cn("relative overflow-hidden", className)}>
        {children}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={onFileChange}
        />
        <button
          type="button"
          onClick={openEditor}
          disabled={isPending}
          aria-label={t("changePhoto")}
          className={cn(
            "absolute inset-0 flex items-end justify-end bg-gradient-to-t from-black/45 via-black/10 to-transparent p-2.5 transition",
            "opacity-100 sm:opacity-0 sm:hover:opacity-100 sm:focus-within:opacity-100"
          )}
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm ring-1 ring-border/60">
            <Camera className="h-4 w-4" aria-hidden />
          </span>
        </button>
      </div>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (isPending) return
          setOpen(next)
          if (!next) resetDialog()
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editPhotoTitle")}</DialogTitle>
          </DialogHeader>

          {dialogSrc ? (
            <ImageFocusPicker
              src={dialogSrc}
              aspectRatio="1 / 1"
              focus={focus}
              onFocusChange={setFocus}
              disabled={isPending}
              alt=""
            />
          ) : (
            <p className="text-sm text-muted-foreground">{t("pickPhotoHint")}</p>
          )}

          {error ? (
            <p className="text-xs text-destructive" role="alert">
              {error}
            </p>
          ) : null}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => inputRef.current?.click()}
            >
              {t("replacePhoto")}
            </Button>
            <Button type="button" disabled={!canSave || isPending} onClick={onSave}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                  {t("uploadingPhoto")}
                </>
              ) : (
                t("savePhoto")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
