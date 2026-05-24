# Promoting profiles to moderator (or admin)

Application roles live in `public.profiles.role` as **TEXT** with a **CHECK** constraint (`user` \| `admin` \| `moderator`). Ordinary clients **cannot** change their own role: trigger `profiles_preserve_role` keeps `role` when `auth.uid()` is present unless you use privileged access.

## How to promote someone

Pick one workflow your team trusts; all require **no self-service escalation** via the anon/authenticated REST API acting as that user.

1. **Supabase SQL editor (dashboard)**  
   Run against the desired project:

   ```sql
   UPDATE public.profiles
   SET role = 'moderator'
   WHERE id = '<uuid-of-auth-user>';

   UPDATE public.profiles
   SET role = 'admin'
   WHERE id = '<uuid-of-auth-user>';
   ```

   Use `\i`/`supabase db` only where your process allows DDL/DML directly.

2. **Service role (script or Edge Function)**  
   Use the **service_role** key in a backend-only script to update `profiles.role` for specific UUIDs after internal approval. Never expose service_role to the browser.

3. **Future in-app tooling**  
   A dedicated admin-only server action backed by `isUserAdminUseCase` (+ repository) could perform the same `UPDATE`; that is optional and still must respect the architectural rule (use case + repo, no raw Supabase in UI).

## Behaviour after promotion

Users must **reload** or **sign in again** for the Next client (`AuthProvider`) to see `moderator`; server-side checks read the profile fresh on `/contributions` and related actions.

## Staff privileges (DB alignment)

Policies that call `public.is_staff_profile()` treat **`admin`** and **`moderator`** the same for RLS moderation paths. Moderators reach the staff contributions queue at **`/contributions`**; full **`/admin`** dashboard remains **`admin`**-only (`getIsUserAdmin`).
