import { STREET_VIEW_FOV_DEFAULT, streetViewFovToZoom } from "@/lib/google-maps/street-view-zoom-fov"

const STREET_VIEW_SEARCH_RADIUS_M = 150
const OUTDOOR_SEARCH_RADII_M = [75, 120, 150, 200] as const

/** Manually framed camera angle. When provided it overrides the auto-heading. */
export interface StreetViewPovOverride {
  heading: number
  pitch: number
  fov: number
}

/**
 * Everything needed to recreate a Street View camera later: the pano's own
 * position plus the applied camera angle. Structurally compatible with the
 * `StreetViewReference` domain type used by place creation.
 */
export interface ResolvedStreetView {
  panoId: string
  latitude: number
  longitude: number
  heading: number
  pitch: number
  fov: number
}

function applyPovOrHeading(
  panorama: google.maps.StreetViewPanorama,
  headingTowardPlace: number,
  pov?: StreetViewPovOverride | null,
): void {
  if (pov) {
    panorama.setPov({ heading: pov.heading, pitch: pov.pitch })
    panorama.setZoom(streetViewFovToZoom(pov.fov))
    return
  }
  panorama.setPov({ heading: headingTowardPlace, pitch: 0 })
  panorama.setZoom(streetViewFovToZoom(STREET_VIEW_FOV_DEFAULT))
}

/** Camera heading from panorama position toward the place coordinates. */
export function bearingTowardPlace(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
): number {
  const φ1 = (fromLat * Math.PI) / 180
  const φ2 = (toLat * Math.PI) / 180
  const Δλ = ((toLng - fromLng) * Math.PI) / 180
  const y = Math.sin(Δλ) * Math.cos(φ2)
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ)
  const deg = (Math.atan2(y, x) * 180) / Math.PI
  return (deg + 360) % 360
}

function applyPanoramaAtData(
  panorama: google.maps.StreetViewPanorama,
  data: google.maps.StreetViewPanoramaData,
  placeLatitude: number,
  placeLongitude: number,
  pov?: StreetViewPovOverride | null,
): ResolvedStreetView | null {
  const pano = data.location?.pano
  const panoLatLng = data.location?.latLng
  if (!pano || !panoLatLng) return null

  const heading = bearingTowardPlace(
    panoLatLng.lat(),
    panoLatLng.lng(),
    placeLatitude,
    placeLongitude,
  )

  applyPanoToPanorama(panorama, pano, heading, pov)

  return {
    panoId: pano,
    latitude: panoLatLng.lat(),
    longitude: panoLatLng.lng(),
    heading: pov ? pov.heading : heading,
    pitch: pov ? pov.pitch : 0,
    fov: pov ? pov.fov : STREET_VIEW_FOV_DEFAULT,
  }
}

/** Fast path: apply a previously-resolved panoId without hitting the StreetView service. */
export function applyKnownPano(
  panorama: google.maps.StreetViewPanorama,
  panoId: string,
  placeLatitude: number,
  placeLongitude: number,
  pov?: StreetViewPovOverride | null,
): void {
  // The pano position isn't known up front, so the heading is computed once the pano
  // loads and reports its actual location via pano_changed. A saved pov overrides it.
  google.maps.event.addListenerOnce(panorama, "pano_changed", () => {
    const panoLatLng = panorama.getPosition()
    const heading = panoLatLng
      ? bearingTowardPlace(panoLatLng.lat(), panoLatLng.lng(), placeLatitude, placeLongitude)
      : 0
    applyPovOrHeading(panorama, heading, pov)
  })

  // setPano (not setPosition): a pano id targets that exact outdoor panorama. Using
  // setPosition would make Google snap to the nearest pano of ANY source, which for
  // venues with indoor coverage (e.g. cafés) loads the interior pano instead.
  panorama.setPano(panoId)
}

function applyPanoToPanorama(
  panorama: google.maps.StreetViewPanorama,
  pano: string,
  heading: number,
  pov?: StreetViewPovOverride | null,
): void {
  // setPano keeps the exact outdoor pano; the pov is (re)applied after it loads
  // because Google resets the pov to the pano default on pano_changed.
  google.maps.event.addListenerOnce(panorama, "pano_changed", () => {
    applyPovOrHeading(panorama, heading, pov)
  })
  panorama.setPano(pano)
}

function getPanorama(
  googleMaps: typeof google,
  service: google.maps.StreetViewService,
  target: google.maps.LatLngLiteral,
  sources: google.maps.StreetViewSource[],
  radius: number,
): Promise<google.maps.StreetViewPanoramaData | null> {
  return new Promise((resolve) => {
    // `sources` (array) is the current API; the legacy `source` field is deprecated
    // and ignored on recent (weekly) builds. Multiple sources are intersected, so
    // [GOOGLE, OUTDOOR] returns only official Google street-level imagery — excluding
    // the UGC PhotoSpheres / business interiors that leak through a plain OUTDOOR
    // search and which often render the inside of venues. `preference: NEAREST`
    // anchors to the closest pano (the storefront).
    service.getPanorama(
      {
        location: target,
        radius,
        sources,
        preference: googleMaps.maps.StreetViewPreference.NEAREST,
      },
      (data, status) => {
        resolve(
          status === googleMaps.maps.StreetViewStatus.OK && data?.location?.latLng ? data : null,
        )
      },
    )
  })
}

/**
 * Outdoor panoramas only — tries increasing search radii, no indoor fallback.
 * Returns the resolved panoId (so callers can persist it), or null if no coverage.
 */
export function positionOutdoorPanoramaAtPlace(
  googleMaps: typeof google,
  panorama: google.maps.StreetViewPanorama,
  placeLatitude: number,
  placeLongitude: number,
  pov?: StreetViewPovOverride | null,
): Promise<ResolvedStreetView | null> {
  const service = new googleMaps.maps.StreetViewService()
  const target = { lat: placeLatitude, lng: placeLongitude }
  const officialOutdoorSources = [
    googleMaps.maps.StreetViewSource.GOOGLE,
    googleMaps.maps.StreetViewSource.OUTDOOR,
  ]

  return (async () => {
    for (const radius of OUTDOOR_SEARCH_RADII_M) {
      const data = await getPanorama(googleMaps, service, target, officialOutdoorSources, radius)
      if (data) {
        return applyPanoramaAtData(panorama, data, placeLatitude, placeLongitude, pov)
      }
    }
    return null
  })()
}

/** Nearest panorama (outdoor first, then any source) — used by place contribute picker. */
export function positionPanoramaAtPlace(
  googleMaps: typeof google,
  panorama: google.maps.StreetViewPanorama,
  placeLatitude: number,
  placeLongitude: number,
): Promise<boolean> {
  const service = new googleMaps.maps.StreetViewService()
  const target = { lat: placeLatitude, lng: placeLongitude }

  return (async () => {
    const data =
      (await getPanorama(
        googleMaps,
        service,
        target,
        [googleMaps.maps.StreetViewSource.GOOGLE, googleMaps.maps.StreetViewSource.OUTDOOR],
        75,
      )) ??
      (await getPanorama(
        googleMaps,
        service,
        target,
        [googleMaps.maps.StreetViewSource.DEFAULT],
        STREET_VIEW_SEARCH_RADIUS_M,
      ))

    if (!data) return false

    applyPanoramaAtData(panorama, data, placeLatitude, placeLongitude)
    return true
  })()
}
