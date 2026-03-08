"use client"

import { useState } from "react"
import { Book, MapPin, Clapperboard } from "lucide-react"
import { cn } from "@/lib/utils"
import { FictionsTab } from "./fictions-tab"
import { LocationsTab } from "./locations-tab"
import { ScenesTab } from "./scenes-tab"

type AdminSection = "fictions" | "locations" | "scenes"

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
  onOpenFiction?: (fictionId: string) => void
}

export function AdminDashboard({ onOpenFiction }: AdminDashboardProps) {
  const [activeSection, setActiveSection] = useState<AdminSection>("fictions")

  return (
    <div className="h-full w-full flex flex-col bg-gradient-to-b from-background to-background/50">
      {/* Header - always visible */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm px-6 py-6 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-black text-foreground">
            Content Management
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Edit and manage fictions, locations, and scenes
          </p>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-6xl mx-auto w-full">
          <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border/50 pb-3">
            {sections.map((section) => {
              const Icon = section.icon
              const isActive = activeSection === section.id
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition-all",
                    isActive
                      ? "bg-cyan-500/15 text-cyan-500 border border-cyan-500/30"
                      : "border border-border text-muted-foreground hover:text-foreground hover:border-cyan-500/30",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {section.label.replace("Manage ", "")}
                </button>
              )
            })}
          </div>

          {activeSection === "fictions" && <FictionsTab onOpenFiction={onOpenFiction} />}
          {activeSection === "locations" && <LocationsTab />}
          {activeSection === "scenes" && <ScenesTab />}
        </div>
      </div>
    </div>
  )
}
