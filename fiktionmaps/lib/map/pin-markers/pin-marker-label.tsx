"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

const chipClassName =
  "max-w-[140px] shrink-0 truncate rounded-md bg-overlay/95 px-2 py-0.5 text-center text-[10px] font-semibold leading-none text-foreground backdrop-blur-sm shadow-lg"

type PinMarkerLabelProps = {
  label: string
  show: boolean
  /** Fade-in when label appears on hover/select; skip for always-visible labels. */
  animate?: boolean
  className?: string
}

export function PinMarkerLabel({ label, show, animate = true, className }: PinMarkerLabelProps) {
  if (!show || !label) return null

  if (!animate) {
    return <div className={cn(chipClassName, className)}>{label}</div>
  }

  return (
    <motion.div
      className={cn(chipClassName, className)}
      initial={{ opacity: 0, y: -2 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {label}
    </motion.div>
  )
}
