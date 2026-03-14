"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Book, MapPin, Clapperboard, Building2, LayoutGrid, List } from "lucide-react"
import { cn } from "@/lib/utils"
import { FictionsTab } from "./fictions-tab"
import { CitiesTab } from "./cities-tab"
import { LocationsTab } from "./locations-tab"
import { ScenesTab } from "./scenes-tab"
import type { Fiction } from "@/modules/fictions/fiction.domain"
import type { City } from "@/modules/cities/city.domain"
import { useAdminViewModeStorage } from "@/lib/local-storage-service-hooks"

type AdminSection = "fictions" | "cities" | "locations" | "scenes"

interface SectionItem {
  id: AdminSection
  label: string
  description: string
  icon: React.ElementType
  color: string
}

const sections: SectionItem[] = [
  {
    id: "fictions",
    label: "Manage Fictions",
    description: "Create and edit fictional stories, movies, and series",
    icon: Book,
    color: "from-foreground/80 to-foreground/60",
  },
  {
    id: "cities",
    label: "Manage Cities",
    description: "Create and edit cities for map views",
    icon: Building2,
    color: "from-blue-600 to-cyan-600",
  },
  {
    id: "locations",
    label: "Manage Locations",
    description: "Add filming locations and place scenes on an interactive map",
    icon: MapPin,
    color: "from-purple-600 to-pink-600",
  },
  {
    id: "scenes",
    label: "Manage Scenes",
    description: "Organize scenes within fictions and link them to locations",
    icon: Clapperboard,
    color: "from-orange-600 to-red-600",
  },
]

interface AdminDashboardProps {
  initialFictions?: Fiction[]
  initialCities?: City[]
  onOpenFiction?: (fictionId: string) => void
  onOpenCity?: (cityId: string) => void
}

export function AdminDashboard({ initialFictions, initialCities, onOpenFiction, onOpenCity }: AdminDashboardProps) {
  const searchParams = useSearchParams()
  const [activeSection, setActiveSection] = useState<AdminSection>(() => {
    const tab = searchParams.get("tab")
    return (sections.some((s) => s.id === tab) ? tab : "fictions") as AdminSection
  })

  const [viewMode, setViewMode] = useAdminViewModeStorage()

  useEffect(() => {
    const tab = searchParams.get("tab")
    if (tab && sections.some((s) => s.id === tab)) {
      setActiveSection(tab as AdminSection)
    }
  }, [searchParams])

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-b from-background to-background/50">
      {/* Header - always visible */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-6 sticky top-0 z-40">
        <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
          Content Management
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Edit and manage fictions, cities, locations, and scenes
        </p>
      </div>

      {/* Tabs bar */}
      <div className="border-b border-border bg-card/30">
        <div className="flex items-center justify-between gap-4 px-6">
          <nav className="flex gap-0" aria-label="Admin sections">
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  aria-selected={isActive}
                  role="tab"
                  className={cn(
                    "flex items-center gap-2 px-5 py-4 text-sm font-medium transition-colors border-b-2 -mb-px",
                    isActive
                      ? "border-foreground text-foreground"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  {section.label.replace("Manage ", "")}
                </button>
              )
            })}
          </nav>
          <div
            className="flex rounded-lg border border-border bg-card p-0.5"
            role="tablist"
            aria-label="View mode"
          >
            <button
              type="button"
              onClick={() => setViewMode("cards")}
              aria-selected={viewMode === "cards"}
              aria-label="Cards view"
              className={cn(
                "flex items-center justify-center p-2 rounded-md transition-colors",
                viewMode === "cards"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Cards view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              aria-selected={viewMode === "table"}
              aria-label="Table view"
              className={cn(
                "flex items-center justify-center p-2 rounded-md transition-colors",
                viewMode === "table"
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground",
              )}
              title="Table view"
            >
              <List className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 w-full">
          {activeSection === "fictions" && (
            <FictionsTab
              initialFictions={initialFictions}
              onOpenFiction={onOpenFiction}
              viewMode={viewMode}
            />
          )}
          {activeSection === "cities" && (
            <CitiesTab
              initialCities={initialCities}
              onOpenCity={onOpenCity}
              viewMode={viewMode}
            />
          )}
          {activeSection === "locations" && <LocationsTab />}
          {activeSection === "scenes" && <ScenesTab />}
        </div>
      </div>
    </div>
  )
}
