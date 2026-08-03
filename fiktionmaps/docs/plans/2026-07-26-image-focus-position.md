# Plan: image focal point (no file crop)

## Decision

- Keep storing the image **uncropped** (as today: `xs/sm/lg` variants).
- Persist `focus_x` / `focus_y` (0–100, default `50/50`).
- Display: `object-cover` + `object-position`.
- Reposition = update coords only, **no re-upload**.
- Relax client aspect-ratio validation (wider band + min resolution).

## Migration

- `asset_images`: add `focus_x`, `focus_y` (nullable or default 50).
- Same table; **same values on all variants** for a given `(entity_type, entity_id, role)`.
- `contribution_pending_images`: same columns (for promote).
- Existing rows: no file changes; `NULL` → `50/50` = same look as today.

## Backend

- Upload / pending upload: accept and persist focus.
- Promote pending → copy focus onto `asset_images`.
- Action `updateAssetImageFocus` (coords only).
- Mappers: expose focus next to URLs (place/fiction).
- Relax aspect schemas; validate focus bounds in the use case.

## UI — new component

- `ImageFocusPicker`: preview in target frame + drag to pan.
- Replaces / absorbs the current admin “cropper” (preview-only today).

## UI — upload flows (write focus)

| Flow | Key files |
|------|-----------|
| Create place (contribute) | `place-contribute-wizard`, `place-contribute-photo-field` |
| Add photo to place | `place-photo-contribute-wizard` |
| Create fiction (cover + banner) | `fiction-contribute-wizard` + step1 schemas |
| Add photo to fiction | `fiction-photo-contribute-wizard` |
| Admin fiction images | `fiction-edit-view`, `location-image-cropper` / drag-drop |
| Staff review pending (preview only; focus comes from submit) | `staff-contribution-detail`, `staff-place-contribution-detail` |

## UI — display flows (read focus → `objectPosition`)

| Surface | Notes |
|---------|--------|
| Fiction detail hero / cover | `fiction-detail` |
| Fiction cards / sidebar / search | `fiction-card`, `fiction-sidebar-card`, `AssetThumbImage`, home/map search |
| Place detail / location detail | `fiction-place-detail-view`, `location-detail` |
| Map pins (2d/3d, round/square) | `place-marker-*`, clusters if they use place thumbs |
| Contribute previews | public preview / done / reference aside |
| Contributions feed thumbs | when they show asset cover/avatar |

## UI — reposition (post-upload)

- Edit place photo / fiction cover-banner: open `ImageFocusPicker` + focus action.
- v1 scope: admin + owner/staff; contribute only at upload time.

## Out of scope

- Cities / persons / profile avatar URL fields.
- Profile banner (already has position in localStorage).
- Storing a separate original / regenerating variants from a crop box.

## Order

1. Migration + types  
2. Persist on upload/pending/promote + mappers  
3. `ImageFocusPicker`  
4. Wire contribute place → fiction → admin  
5. Display consumers (prefer centralizing in `AssetThumbImage` first)  
6. Relax aspect schemas  
7. Action + reposition UI  
