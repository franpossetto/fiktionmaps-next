# Fiktionmaps TODOs

## Inbox

## Backlog

- [ ] User avatar upload: store file in Supabase Storage (dedicated bucket/path per user), save public URL (or storage path) in `profiles.avatar_url`; optional cleanup of previous object on change. Keep DiceBear URLs as alternative or migrate only uploads to Storage.

- [ ] Clean up place storage assets when deleting a fiction: add `deleteAssetsByFictionId` to `PlacesRepositoryPort` + Supabase impl; extend `deleteFictionUseCase` to call it before `fictionsRepo.delete` (DB `ON DELETE CASCADE` already removes `places` / `scenes` rows; Supabase Storage files for those places stay orphaned without this).

## In progress

## Done (recent)

- [x] Implement Places/Locations DB schema and migrations
- [x] Implement Places/Locations repositories and admin actions
- [x] Replace hard-coded map data with Places/Locations + bounds-based filtering
- [x] Replace hard-coded admin data with Places/Locations
- [x] Implement map filtering by selected fiction(s) and city

## Related docs

- [ ] Places & Locations design (to be created)
- [ ] Image loading optimization — see `docs/plan-image-loading-optimization.md`
