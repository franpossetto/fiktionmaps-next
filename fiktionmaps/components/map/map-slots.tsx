"use client"

/** Portal targets for map chrome — keep free of mapbox / react-map-gl imports. */

export const MAP_3D_TOGGLE_SLOT_ID = "map-3d-toggle-slot"
export const MAP_MINIMAP_SLOT_ID = "map-minimap-slot"

export function Map3DToggleSlot() {
  return <div id={MAP_3D_TOGGLE_SLOT_ID} />
}

export function MapMinimapSlot() {
  return (
    <div
      id={MAP_MINIMAP_SLOT_ID}
      className="pointer-events-none absolute bottom-4 right-4 z-[4800] hidden md:block [&>*]:pointer-events-auto"
    />
  )
}
