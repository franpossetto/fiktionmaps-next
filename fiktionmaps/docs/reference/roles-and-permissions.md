# Roles & permissions

`profiles.role`: `user` | `contributor` | `moderator` | `admin`. Stored as TEXT with a CHECK constraint; ordinary clients cannot change their own role (trigger `profiles_preserve_role`).

Hierarchy: `user` < `contributor` < `moderator` < `admin`

## Roles

| Role | Who |
|------|-----|
| Guest | Not logged in |
| `user` | Registered (default) |
| `contributor` | Trusted user — access to experimental features (e.g. AI wizards) |
| `moderator` | Staff — moderation queue |
| `admin` | Staff + `/admin` dashboard |

## Permissions matrix

| | Guest | user | contributor | moderator | admin |
|---|:---:|:---:|:---:|:---:|:---:|
| Submit contributions | ✗ | ✓ | ✓ | ✓ | ✓ |
| Goes to **pending** | — | ✓ | ✓ | ✗ | ✗ |
| AI wizard flows (experimental) | ✗ | ✗ | ✓ | ✓ | ✓ |
| Staff queue `/contributions` | ✗ | ✗ | ✗ | ✓ | ✓ |
| Approve / reject contributions | ✗ | ✗ | ✗ | ✓ | ✓ |
| `/admin` dashboard | ✗ | ✗ | ✗ | ✗ | ✓ |

RLS: `public.is_staff_profile()` covers only `moderator` and `admin` — `contributor` is not staff and does not bypass pending review.

## Promoting a user

No self-service escalation via the REST API. Pick one privileged workflow:

1. **Supabase SQL editor (dashboard)**

   ```sql
   UPDATE public.profiles SET role = 'contributor' WHERE id = '<uuid>';
   UPDATE public.profiles SET role = 'moderator'   WHERE id = '<uuid>';
   UPDATE public.profiles SET role = 'admin'        WHERE id = '<uuid>';
   ```

2. **Service role key** (backend script or Edge Function) — never expose to the browser.

3. **Future in-app tooling** — admin-only server action backed by `isUserAdminUseCase` + repo; must follow use case + repo pattern, no raw Supabase in UI.

After promotion the user must **reload or sign in again** for the client (`AuthProvider`) to pick up the new role. Server-side checks always read the profile fresh.

## Code references

| Concern | Symbol | File |
|---|---|---|
| Type | `UserRole` | `src/users/domain/user.dtos.ts` |
| Staff set | `STAFF_ROLES` | `src/users/domain/user.roles.ts` |
| Contributor set | `CONTRIBUTOR_ROLES` | `src/users/domain/user.roles.ts` |
| Staff guard | `getIsUserStaff` | `src/users/infrastructure/next/user.queries.ts` |
| Contributor guard | `getIsUserContributor` | `src/users/infrastructure/next/user.queries.ts` |
| DB constraint | `profiles_role_check` | `supabase/migrations/051_profiles_role_contributor.sql` |
| RLS staff fn | `is_staff_profile()` | `supabase/migrations/034_contributions_rls.sql` |
| Client flags | `isAdmin`, `isStaffModerator`, `isContributor` | `context/auth-context.tsx` |
