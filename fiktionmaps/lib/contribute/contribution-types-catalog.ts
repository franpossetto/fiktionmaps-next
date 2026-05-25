import type { ContributionType } from "@/src/contributions/domain/contribution.entity"
import { CONTRIBUTION_FPP } from "@/src/contributions/domain/contribution.config"
import type { LucideIcon } from "lucide-react"
import {
  CircleOff,
  Clapperboard,
  Film,
  Footprints,
  ImagePlus,
  Layers,
  MapPin,
  MessageSquareQuote,
  PenLine,
} from "lucide-react"

export type ContributionTypeCatalogEntry = {
  type: ContributionType
  icon: LucideIcon
  /** Full wizard flow (navigates on click). */
  hasWizard: boolean
  href?: "/contribute/fiction" | "/contribute/place"
}

const CONTRIBUTION_TYPES_CATALOG_BASE: ContributionTypeCatalogEntry[] = [
  { type: "create_fiction", icon: Film, hasWizard: true, href: "/contribute/fiction" },
  { type: "create_place", icon: MapPin, hasWizard: true, href: "/contribute/place" },
  { type: "add_scene", icon: Clapperboard, hasWizard: false },
  { type: "add_photo", icon: ImagePlus, hasWizard: false },
  { type: "enrich_entity", icon: Layers, hasWizard: false },
  { type: "correct_data", icon: PenLine, hasWizard: false },
  { type: "mark_inaccessible", icon: CircleOff, hasWizard: false },
  { type: "add_tip", icon: MessageSquareQuote, hasWizard: false },
  { type: "checkin", icon: Footprints, hasWizard: false },
]

/** Profile contribute hub: highest FPP first (stable order within ties). */
export const CONTRIBUTION_TYPES_CATALOG = [...CONTRIBUTION_TYPES_CATALOG_BASE].sort(
  (a, b) => CONTRIBUTION_FPP[b.type] - CONTRIBUTION_FPP[a.type],
)
