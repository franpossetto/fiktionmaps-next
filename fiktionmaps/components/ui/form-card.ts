/**
 * Shared frame for settings-style forms: a bordered panel whose footer holds the
 * actions, so stacked cards keep the same edges and their buttons line up.
 */
export const FORM_CARD_CLASS =
  "overflow-hidden rounded-2xl border border-border bg-card shadow-sm"

export const FORM_CARD_BODY_CLASS = "space-y-5 p-5 sm:p-6"

export const FORM_CARD_FOOTER_CLASS =
  "flex flex-wrap justify-end gap-2 border-t border-border bg-muted/20 px-5 py-4 sm:px-6"

/** Two-column field grid; full-width fields opt in with `sm:col-span-2`. */
export const FORM_FIELD_GRID_CLASS = "grid gap-x-6 gap-y-5 sm:grid-cols-2"

/** Neutral action button used in form card footers. */
export const FORM_CARD_ACTION_CLASS =
  "border border-border bg-white text-zinc-900 hover:bg-zinc-100"
