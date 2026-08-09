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
  Sparkles,
  Users,
} from "lucide-react"

export type ContributionTypeCatalogEntry = {
  /** Unique key for rendering; falls back to `type` when omitted. */
  id?: string
  type: ContributionType
  icon: LucideIcon
  /** Full wizard flow (navigates on click). */
  hasWizard: boolean
  href?:
    | "/contribute/fiction"
    | "/contribute/place"
    | "/contribute/photo"
    | "/contribute/hunt"
    | "/contribute/scene"
    | "/contribute/scene-place"
    | "/contribute/credits"
  /** Short badge label shown on the card (e.g. "AI Hunt"). */
  tag?: string
  /** Requires contributor, moderator, or admin role (e.g. AI wizards). */
  requiresContributor?: boolean
  /** Hidden when no AI provider key is configured. */
  aiRequired?: boolean
}

const CONTRIBUTION_TYPES_CATALOG_BASE: ContributionTypeCatalogEntry[] = [
  { type: "create_fiction", icon: Film, hasWizard: true, href: "/contribute/fiction" },
  { type: "create_place", icon: MapPin, hasWizard: true, href: "/contribute/place" },
  {
    id: "hunt_place",
    type: "create_place",
    icon: Sparkles,
    hasWizard: true,
    href: "/contribute/hunt",
    tag: "AI Hunt",
    requiresContributor: true,
    aiRequired: true,
  },
  { type: "add_scene", icon: Clapperboard, hasWizard: true, href: "/contribute/scene" },
  {
    type: "add_place_to_scene",
    icon: MapPin,
    hasWizard: true,
    href: "/contribute/scene-place",
  },
  { type: "add_photo", icon: ImagePlus, hasWizard: true, href: "/contribute/photo" },
  { type: "add_credits", icon: Users, hasWizard: true, href: "/contribute/credits" },
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
