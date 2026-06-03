# Roles & permissions

`profiles.role`: `user` | `moderator` | `admin`. Promoted via DB only (`moderator-role-promotion.md`).

**No `contributor` role.** In the UI, “contributor” = user with approved history / FPP.

## Roles

| Role | Who |
|------|-----|
| Guest | Not logged in |
| `user` | Registered (default) |
| `moderator` | Staff — moderation queue |
| `admin` | Staff + `/admin` dashboard |

## Contributions (today)

Any logged-in `user` can submit. Quality via `pending` + staff review.

| | Guest | user | moderator | admin |
|---|:---:|:---:|:---:|:---:|
| Submit | ✗ | ✓ | ✓ | ✓ |
| Goes to **pending** | — | ✓ | ✗ (auto-approved) | ✗ |
| Staff queue `/contributions` | ✗ | ✗ | ✓ | ✓ |
| Approve / reject | ✗ | ✗ | ✓ | ✓ |

Types: fiction, place, photo, scene, enrich, correct, mark inaccessible, tip, check-in.

## Admin

Only **`admin`**: manage fictions, cities, places, scenes, people at `/admin`.

## Future (optional, not built)

If spam or queue volume grows, unlock types by track record — **not** a new role:

| Tier | Examples | Gate |
|------|----------|------|
| Open | photo, tip, check-in | any `user` |
| Established | place, scene, enrich | ≥ 1 approved |
| Trusted | create fiction | ≥ 3 approved or FPP ≥ 10 |

Staff bypass all gates. **For now:** everything stays open.

**Summary:** `user` submits and waits. `moderator` moderates and auto-publishes. `admin` = moderator + `/admin`.
