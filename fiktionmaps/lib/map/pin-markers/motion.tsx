import type { ReactNode } from "react"
import { motion } from "framer-motion"
import { PIN_HOVER_MOTION_SCALE_NORMAL } from "@/lib/map/pin-marker-hover-scale"

export const pinDropSpring = {
  type: "spring" as const,
  stiffness: 400,
  damping: 18,
}

/** @deprecated Use getPinHoverMotionScale() */
export const pinHoverScale = PIN_HOVER_MOTION_SCALE_NORMAL
export const pinTapScale = 0.96

/** Drop-in wrapper only; pin chrome grows via layout, label stays fixed size. */
export function PinMarkerRoot({
  preview,
  children,
}: {
  preview?: boolean
  children: ReactNode
}) {
  if (preview) {
    return <div className="pointer-events-none flex flex-col items-center">{children}</div>
  }
  return (
    <motion.div
      className="group flex flex-col items-center"
      initial={{ scale: 0, opacity: 0, y: -24 }}
      animate={{ scale: 1, opacity: 1, y: 0, transition: pinDropSpring }}
      transition={pinDropSpring}
    >
      {children}
    </motion.div>
  )
}
