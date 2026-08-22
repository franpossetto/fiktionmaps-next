"use client"

import type { ElementType } from "react"
import { ArrowLeft, ArrowRight, MapPinPlus, PencilRuler, Sparkles } from "lucide-react"
import { Link } from "@/i18n/navigation"
import { AppDetailRailsShell } from "@/components/layout/app-detail-rails-shell"
import { cn } from "@/lib/utils"

type EmailTemplateOption = {
  id: string
  title: string
  description: string
  icon: ElementType
  href?: string
  available: boolean
  badge?: string
}

const TEMPLATES: EmailTemplateOption[] = [
  {
    id: "welcome",
    title: "Welcome",
    description: "Email de bienvenida para un usuario registrado.",
    icon: Sparkles,
    href: "/admin/emails/new/welcome",
    available: true,
  },
  {
    id: "new_content",
    title: "New content",
    description: "Avisá lugares nuevos en ficciones o ciudades relevantes.",
    icon: MapPinPlus,
    href: "/admin/emails/new/new-content",
    available: true,
  },
  {
    id: "custom",
    title: "Custom",
    description: "Armá el contenido con un builder libre.",
    icon: PencilRuler,
    available: false,
    badge: "Próximamente",
  },
]

export function EmailTemplatePicker() {
  return (
    <AppDetailRailsShell>
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="flex h-[60px] shrink-0 items-center gap-3 border-b border-border px-5">
          <Link
            href="/admin/emails"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Volver a Emails"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="truncate text-lg font-semibold text-foreground">New email</h1>
            <p className="truncate text-xs text-muted-foreground">Elegí un template</p>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-6">
          <ul className="grid gap-3 sm:grid-cols-2">
            {TEMPLATES.map((template) => {
              const Icon = template.icon
              const content = (
                <>
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-lg border border-border",
                        template.available ? "bg-muted/50 text-foreground" : "bg-muted/30 text-muted-foreground",
                      )}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    {template.badge ? (
                      <span className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground bg-muted">
                        {template.badge}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-4 space-y-1">
                    <div className="flex items-center gap-2">
                      <h2
                        className={cn(
                          "text-base font-semibold",
                          template.available ? "text-foreground" : "text-muted-foreground",
                        )}
                      >
                        {template.title}
                      </h2>
                      {template.available ? (
                        <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
                      ) : null}
                    </div>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </div>
                </>
              )

              if (!template.available || !template.href) {
                return (
                  <li key={template.id}>
                    <div
                      aria-disabled
                      className="rounded-xl border border-border/70 bg-muted/20 p-4 opacity-70"
                    >
                      {content}
                    </div>
                  </li>
                )
              }

              return (
                <li key={template.id}>
                  <Link
                    href={template.href}
                    className="group block rounded-xl border border-border bg-background p-4 transition-colors hover:bg-muted/40"
                  >
                    {content}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </AppDetailRailsShell>
  )
}
