"use client"

import Image from "next/image"
import { motion } from "framer-motion"
import { getPinHoverMotionScale } from "@/lib/map/pin-marker-hover-scale"
import { pinConicRingClass, pinStrokeBorderClass } from "@/lib/map/pin-marker-styles"
import { PinMarkerLabel } from "./pin-marker-label"
import { shouldShowPinLabel } from "./should-show-pin-label"
import type { PlaceMarker2dProps } from "./types"
import { pinDropSpring, pinTapScale } from "./motion"

const pin3dStemClass = "bg-gradient-to-b from-black to-transparent dark:from-white"
const pin3dGroundClass = "bg-black dark:bg-white"
const pin3dPingRingClass = "border border-black/30 dark:border-white/30"

/** Single 3D map pin style (no v1 variant). */
export function PlaceMarker3d({
  imageSrc,
  label,
  labelMode,
  hoverScaleMode,
  isSelected,
  isHovered,
  stackSize,
}: PlaceMarker2dProps) {
  const showStackBadge = stackSize != null && stackSize > 1
  const active = isSelected || isHovered
  const showLabel = shouldShowPinLabel(labelMode, { isSelected, isHovered })
  const labelAnimates = labelMode !== "always"
  const hoverScale = getPinHoverMotionScale(hoverScaleMode)

  return (
    <motion.div
      className="flex flex-col items-center"
      initial={{ scale: 0, opacity: 0, y: -20 }}
      animate={{ scale: 1, opacity: 1, y: 0, transition: pinDropSpring }}
      transition={pinDropSpring}
    >
      <PinMarkerLabel
        label={label}
        show={showLabel}
        animate={labelAnimates}
        className="mb-1"
      />
      <motion.div
        className="flex cursor-pointer flex-col items-center"
        style={{ filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.7))" }}
        whileHover={{ scale: hoverScale }}
        whileTap={{ scale: pinTapScale }}
        transition={pinDropSpring}
      >
        <div
          className="relative flex items-center justify-center"
          style={{
            width: isSelected ? 58 : 50,
            height: isSelected ? 58 : 50,
            transition: "all 200ms ease",
          }}
        >
          <div
            className={`absolute inset-0 rounded-full ${pinConicRingClass} ${active ? "pin3d-spin opacity-100" : "opacity-60"}`}
          />
          <div
            className={`relative overflow-hidden rounded-full ${pinStrokeBorderClass} ${
              isSelected ? "ring-2 ring-black/20 dark:ring-white/30" : ""
            }`}
            style={{
              width: isSelected ? 50 : 42,
              height: isSelected ? 50 : 42,
              transition: "all 200ms ease",
            }}
          >
            <Image src={imageSrc} alt={label} fill className="object-cover" sizes="56px" />
            {showStackBadge && (
              <span className="absolute -right-0.5 -top-0.5 z-[2] flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-background bg-[#e8365d] px-1 text-[10px] font-bold text-white shadow-md">
                {stackSize}
              </span>
            )}
            <div
              className="absolute inset-0 rounded-full"
              style={{
                background: "linear-gradient(160deg, rgba(255,255,255,0.15) 0%, transparent 50%)",
              }}
            />
          </div>
        </div>
        <div
          className={`w-0.5 ${pin3dStemClass}`}
          style={{ height: isSelected ? 28 : 22, transition: "all 200ms ease" }}
        />
        <div className="relative flex items-center justify-center">
          <div
            className={`rounded-full ${pin3dGroundClass} shadow-[0_0_4px_2px_rgba(0,0,0,0.35)] dark:shadow-[0_0_4px_2px_rgba(255,255,255,0.25)] ${
              active
                ? "h-2.5 w-2.5 shadow-[0_0_8px_4px_rgba(0,0,0,0.35)] dark:shadow-[0_0_8px_4px_rgba(255,255,255,0.25)]"
                : "h-1.5 w-1.5"
            }`}
            style={{ transition: "all 200ms ease" }}
          />
          {active && (
            <div
              className={`absolute h-6 w-6 rounded-full pin3d-ping opacity-30 ${pin3dPingRingClass}`}
            />
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}