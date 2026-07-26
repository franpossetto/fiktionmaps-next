# Places & Locations design

## Overview

This document describes how Places and Locations relate to Fictions and Cities, how they are stored in Supabase, and how they are used in the admin UI and Mapbox map.

- A Fiction can have many Places.
- Each Place belongs to exactly one Fiction.
- Each Place references one primary Location (optional at creation, can be attached later).
- Each Location belongs to exactly one City.
- Locations represent real-world points on the map (not owned by a single Place).
- Places use asset_images for their visual representation (pin and landing page image).

The main query pattern for the map is: filter Places by selected Fictions and the current map viewport (bounds), not by city_id directly.

## Database schema

### cities

Existing table, unchanged here:

- id UUID PK
- name TEXT NOT NULL
- country TEXT NOT NULL
- lat DOUBLE PRECISION NOT NULL
- lng DOUBLE PRECISION NOT NULL
- zoom INTEGER NOT NULL
- created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
- updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

### locations

Locations represent concrete points on the map and belong to a City. A Location can be reused by multiple Places.

- id UUID PK, DEFAULT gen_random_uuid()
- formatted_address TEXT NOT NULL
- post_code TEXT NULL
- latitude DOUBLE PRECISION NOT NULL
- longitude DOUBLE PRECISION NOT NULL
- name TEXT NOT NULL
- external_id TEXT NULL — provider-specific ID (Mapbox, Google, etc.)
- provider TEXT NULL — e.g. "mapbox", "google"
- city_id UUID NOT NULL REFERENCES public.cities(id)
- is_landmark BOOLEAN NOT NULL DEFAULT FALSE — marks iconic / famous locations
- created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
- updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:

- idx_locations_city_id ON (city_id)
- idx_locations_lat_lng ON (latitude, longitude)

### places

Places connect Fictions to Locations. A Place belongs to a Fiction and references a primary Location.

- id UUID PK, DEFAULT gen_random_uuid()
- fiction_id UUID NOT NULL REFERENCES public.fictions(id) ON DELETE CASCADE
- location_id UUID NULL REFERENCES public.locations(id)
- description TEXT NULL
- active BOOLEAN NOT NULL DEFAULT TRUE
- created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
- updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()

Indexes:

- idx_places_fiction_id ON (fiction_id)
- idx_places_location_id ON (location_id)

### Row-level security (RLS)

RLS is enabled and forced on both locations and places. Policies mirror the existing patterns for fictions and cities:

- Anyone (anon, authenticated) can SELECT.
- Authenticated users can INSERT, UPDATE, DELETE.

This allows the public site to read Places and Locations, while admin actions run as authenticated.

### asset_images support for Places

The asset_images table is extended so entity_type includes 'place'. We reuse existing roles and variants:

- entity_type: 'place'
- role:
  - 'avatar' — small, square image for map pins and small thumbnails.
  - 'hero' — main image for the Place landing page.
- variant:
  - 'sm' — used for pins / small usages.
  - 'lg' — used for hero images on Place pages.

The asset_images uniqueness constraint (entity_type, entity_id, role, variant) ensures we only store one row per (Place, role, variant).

## TypeScript domain model

### Location domain type

Locations live under src/locations and match the DB schema:

- id: string
- formattedAddress: string
- postCode: string | null
- latitude: number
- longitude: number
- name: string
- externalId: string | null
- provider: string | null
- cityId: string
- isLandmark: boolean
- createdAt: string
- updatedAt: string

### Place domain type

Places live under src/places:

- id: string
- fictionId: string
- locationId: string | null
- description: string | null
- active: boolean
- createdAt: string
- updatedAt: string
- Optional when joined:
  - location?: Location

## Services and repositories

### Places repository

Supabase-backed repository for the places table:

- getById(id): Place | null
- getByFictionId(fictionId): Place[]
- create(fictionId, data): Place | null
- update(id, data): Place | null
- delete(id): boolean

### Locations repository

Supabase-backed repository for the locations table:

- getById(id): Location | null
- getByFictionId(fictionId): Location[] (via places join)
- getByCityId(cityId): { fictionId: string }[] (via places join) — supports cities service
- create(cityId, data): Location | null
- update(id, data): Location | null
- delete(id): boolean

These repository ports are injected into the existing fictions and cities services so:

- Fictions service can compute getFictionCities(fictionId) using Locations and Cities.
- Cities service can compute getCityFictions(cityId) using Locations and Fictions.

## Map filtering behavior

### High-level behavior

When a user selects one or more Fictions and a City:

1. Center the Mapbox map on the selected City using its lat/lng and zoom.
2. Use the current map viewport bounds (west, south, east, north) to limit the query.
3. Fetch Places (and their Locations) where:
   - places.fiction_id is in the selected fiction IDs.
   - locations.latitude / longitude fall within the current bounds.
4. Render markers for the returned Locations and use Place data for linking to Place pages.

The query is based on the map bounds, not directly on locations.city_id, which keeps the response constrained to what is visible and avoids over-fetching.

### Map query shape

Example API endpoint:

- GET /api/map/places?fictionIds[]=...&bbox=west,south,east,north

Server-side behavior:

- Parse fictionIds[] and bbox.
- Join places to locations:
  - WHERE places.fiction_id IN (:fictionIds)
  - AND locations.latitude BETWEEN :south AND :north
  - AND locations.longitude BETWEEN :west AND :east
- Return Places with their Locations to the client.

### Marker rendering

For each Place with a Location:

- Marker position:
  - latitude = location.latitude
  - longitude = location.longitude
- Marker icon:
  - Use Place asset image with entity_type = 'place', role = 'avatar', variant = 'sm', if available.
  - Fallback to a default pin if there is no Place avatar image yet.
- Clicking a marker:
  - Navigates to the Place landing page, which uses the 'hero' image (variant 'lg') and Place/Location details.

### Single-city fictions

If a Fiction effectively has Locations only around a single City, centering the map on that City and using bounds naturally restricts results. No extra city_id filter is required.

## Admin flows (high level)

- Places admin:
  - Create a Place for a given Fiction.
  - Attach an existing Location to a Place or create a new Location from admin.
  - Set description and active flag.
- Locations admin:
  - Create Locations attached to a City (with lat/lng, formatted address, name, is_landmark, provider/external_id).
  - Edit / delete Locations.
- Image management for Places:
  - Upload / replace Place avatar (for pins) and hero (for landing) using the existing asset_images service with entity_type = "place".

