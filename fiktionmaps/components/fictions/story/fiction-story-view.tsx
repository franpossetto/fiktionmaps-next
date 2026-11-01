"use client"

import { useState } from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Dialog, DialogPortal, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FictionStoryCarousel } from "@/components/fictions/story/fiction-story-carousel"
import type { FictionStoryCard } from "@/components/fictions/story/build-fiction-story-cards"

export function FictionStoryView({ cards }: { cards: FictionStoryCard[] }) {
  const t = useTranslations("FictionStory")
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" size="sm" variant="outline">
          {t("storyView")}
        </Button>
      </DialogTrigger>
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[9999] bg-black" />
        <DialogPrimitive.Content className="fixed inset-0 z-[9999] flex h-dvh w-screen flex-col overflow-hidden bg-black outline-none">
          <DialogTitle className="sr-only">{t("storyView")}</DialogTitle>
          {open ? <FictionStoryCarousel cards={cards} layout="page" /> : null}
          <DialogPrimitive.Close className="absolute right-4 top-4 z-[10000] rounded-sm text-white opacity-90 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/40">
            <X className="h-4 w-4" />
            <span className="sr-only">{t("closeStory")}</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  )
}
