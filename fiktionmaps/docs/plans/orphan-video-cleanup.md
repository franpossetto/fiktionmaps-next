# Orphan-video cleanup job

## Goal
Clean up orphan videos in the `asset-videos` bucket that are associated with rejected `add_scene` contributions.

## Context
When an `add_scene` contribution is rejected, the `rejectContribution` action does not touch the `asset-videos` bucket. The rejected scene keeps `status = rejected` and its video object remains in the bucket.

Scenes may now have **two** storage objects:
- `video_url` — full compressed MP4
- `preview_url` — low-res muted preview MP4

Any cleanup job must delete **both** paths when present (see `tryParseStoragePathFromVideoUrl` / scene delete in `scene.repository.impl.ts`).

This is tracked as technical debt. We need a cleanup job (e.g. a cron job or an admin action) that periodically finds rejected scenes and deletes their associated video objects from the `asset-videos` bucket to save storage space.
