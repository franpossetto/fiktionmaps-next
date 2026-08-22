import type { SupabaseClient } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"
import { normalizeImageFocus, type ImageFocus } from "@/lib/asset-images/image-focus"
import type { Database } from "@/supabase/database.types"
import type {
  PlaceRelationship,
  PlaceRelationshipMember,
  PlaceRelationshipMemberPlace,
  PlaceRelationshipType,
  PlaceRelationshipWithPlaces,
} from "@/src/place-relationships/domain/place-relationship.entity"
import type {
  CreatePlaceRelationshipRepoInput,
  PlaceRelationshipsRepositoryPort,
} from "@/src/place-relationships/domain/place-relationship.repository"

type GetSupabase = () => Promise<SupabaseClient<Database>> | SupabaseClient<Database>

type RelationshipRow = Database["public"]["Tables"]["place_relationships"]["Row"]
type MemberRow = Database["public"]["Tables"]["place_relationship_members"]["Row"]

/** Prefer xs over sm for place avatar thumbs. */
async function loadPlaceAvatarThumbs(
  supabase: SupabaseClient<Database>,
  placeIds: string[],
): Promise<Map<string, { url: string; focus: ImageFocus }>> {
  const map = new Map<string, { url: string; focus: ImageFocus }>()
  if (placeIds.length === 0) return map

  const { data, error } = await supabase
    .from("asset_images")
    .select("entity_id, url, variant, focus_x, focus_y")
    .eq("entity_type", "place")
    .eq("role", "avatar")
    .in("variant", ["xs", "sm"])
    .in("entity_id", placeIds)

  if (error) {
    console.error("[place-relationships] loadPlaceAvatarThumbs:", error.message)
    return map
  }

  for (const variant of ["xs", "sm"] as const) {
    for (const row of data ?? []) {
      if (row.variant !== variant || !row.entity_id || !row.url) continue
      if (map.has(row.entity_id)) continue
      map.set(row.entity_id, {
        url: row.url,
        focus: normalizeImageFocus(row.focus_x, row.focus_y),
      })
    }
  }
  return map
}

function mapMember(row: MemberRow): PlaceRelationshipMember {
  return {
    id: row.id,
    placeRelationshipId: row.place_relationship_id,
    type: row.type,
    placeId: row.place_id,
    createdAt: row.created_at,
  }
}

function mapRelationship(
  row: RelationshipRow,
  members: MemberRow[],
): PlaceRelationship {
  return {
    id: row.id,
    type: row.type,
    name: row.name,
    slug: row.slug,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    members: members.map(mapMember),
  }
}

export function createPlaceRelationshipsSupabaseAdapter(
  getSupabase: GetSupabase,
): PlaceRelationshipsRepositoryPort {
  return {
    async getById(id: string): Promise<PlaceRelationship | null> {
      const supabase = await getSupabase()
      const { data: row, error } = await supabase
        .from("place_relationships")
        .select("*")
        .eq("id", id)
        .maybeSingle()

      if (error || !row) return null

      const { data: members, error: membersError } = await supabase
        .from("place_relationship_members")
        .select("*")
        .eq("place_relationship_id", id)

      if (membersError) {
        console.error("[place-relationships] getById members:", membersError.message)
        return null
      }

      return mapRelationship(row, members ?? [])
    },

    async getByPlaceId(placeId: string): Promise<PlaceRelationshipWithPlaces[]> {
      const supabase = await getSupabase()
      const { data: memberships, error } = await supabase
        .from("place_relationship_members")
        .select("place_relationship_id")
        .eq("place_id", placeId)

      if (error) {
        console.error("[place-relationships] getByPlaceId:", error.message)
        return []
      }

      const groupIds = [...new Set((memberships ?? []).map((m) => m.place_relationship_id))]
      if (groupIds.length === 0) return []

      const { data: groups, error: groupsError } = await supabase
        .from("place_relationships")
        .select("*")
        .in("id", groupIds)

      if (groupsError || !groups?.length) {
        if (groupsError) {
          console.error("[place-relationships] getByPlaceId groups:", groupsError.message)
        }
        return []
      }

      const { data: allMembers, error: allMembersError } = await supabase
        .from("place_relationship_members")
        .select("*")
        .in("place_relationship_id", groupIds)

      if (allMembersError) {
        console.error("[place-relationships] getByPlaceId all members:", allMembersError.message)
        return []
      }

      const members = allMembers ?? []
      const placeIds = [...new Set(members.map((m) => m.place_id))]
      const { data: placeRows, error: placesError } = await supabase
        .from("places")
        .select("id, name, slug, fiction_id, shoot_environment")
        .in("id", placeIds)

      if (placesError) {
        console.error("[place-relationships] getByPlaceId places:", placesError.message)
      }

      const fictionIds = [...new Set((placeRows ?? []).map((place) => place.fiction_id))]
      const { data: fictionRows, error: fictionsError } = fictionIds.length
        ? await supabase.from("fictions").select("id, title, slug").in("id", fictionIds)
        : { data: [], error: null }

      if (fictionsError) {
        console.error("[place-relationships] getByPlaceId fictions:", fictionsError.message)
      }

      const avatarByPlaceId = await loadPlaceAvatarThumbs(supabase, placeIds)

      const fictionById = new Map(
        (fictionRows ?? []).map((fiction) => [
          fiction.id,
          { title: fiction.title, slug: fiction.slug },
        ]),
      )
      const placeById = new Map(
        (placeRows ?? []).flatMap((place) => {
          const fiction = fictionById.get(place.fiction_id)
          if (!fiction) return []
          const avatar = avatarByPlaceId.get(place.id) ?? null
          return [
            [
              place.id,
              {
                placeId: place.id,
                name: place.name,
                slug: place.slug,
                fictionId: place.fiction_id,
                fictionTitle: fiction.title,
                fictionSlug: fiction.slug,
                image: avatar?.url ?? null,
                imageFocus: avatar?.focus ?? null,
                shootEnvironment: place.shoot_environment,
              } satisfies PlaceRelationshipMemberPlace,
            ] as const,
          ]
        }),
      )

      return groups.map((group) => {
        const groupMembers = members.filter((m) => m.place_relationship_id === group.id)
        const relationship = mapRelationship(group, groupMembers)
        const memberPlaces: PlaceRelationshipMemberPlace[] = []
        for (const m of groupMembers) {
          const place = placeById.get(m.place_id)
          if (place) memberPlaces.push(place)
        }
        return {
          ...relationship,
          memberPlaces,
        }
      })
    },

    async getCompositeGroupsForPlaceIds(placeIds: string[]): Promise<PlaceRelationship[]> {
      const uniqueIds = [...new Set(placeIds.filter(Boolean))]
      if (uniqueIds.length === 0) return []

      const supabase = await getSupabase()
      const { data: memberships, error } = await supabase
        .from("place_relationship_members")
        .select("place_relationship_id")
        .eq("type", "composite")
        .in("place_id", uniqueIds)

      if (error) {
        console.error("[place-relationships] getCompositeGroupsForPlaceIds:", error.message)
        return []
      }

      const groupIds = [...new Set((memberships ?? []).map((m) => m.place_relationship_id))]
      if (groupIds.length === 0) return []

      const { data: groups, error: groupsError } = await supabase
        .from("place_relationships")
        .select("*")
        .in("id", groupIds)

      if (groupsError || !groups?.length) {
        if (groupsError) {
          console.error("[place-relationships] getCompositeGroupsForPlaceIds groups:", groupsError.message)
        }
        return []
      }

      const { data: allMembers, error: allMembersError } = await supabase
        .from("place_relationship_members")
        .select("*")
        .in("place_relationship_id", groupIds)

      if (allMembersError) {
        console.error("[place-relationships] getCompositeGroupsForPlaceIds members:", allMembersError.message)
        return []
      }

      const members = allMembers ?? []
      return groups.map((group) =>
        mapRelationship(
          group,
          members.filter((m) => m.place_relationship_id === group.id),
        ),
      )
    },

    async getMembership(
      placeId: string,
      type: PlaceRelationshipType,
    ): Promise<{ placeRelationshipId: string } | null> {
      const supabase = await getSupabase()
      const { data, error } = await supabase
        .from("place_relationship_members")
        .select("place_relationship_id")
        .eq("place_id", placeId)
        .eq("type", type)
        .maybeSingle()

      if (error) {
        console.error("[place-relationships] getMembership:", error.message)
        return null
      }
      if (!data) return null
      return { placeRelationshipId: data.place_relationship_id }
    },

    async listSlugs(): Promise<string[]> {
      const supabase = await getSupabase()
      const { data, error } = await supabase.from("place_relationships").select("slug")
      if (error) {
        console.error("[place-relationships] listSlugs:", error.message)
        return []
      }
      return (data ?? []).map((r) => r.slug)
    },

    async create(input: CreatePlaceRelationshipRepoInput): Promise<PlaceRelationship> {
      const supabase = await getSupabase()
      const { data: group, error: groupError } = await supabase
        .from("place_relationships")
        .insert({
          type: input.type,
          name: input.name,
          slug: input.slug,
        })
        .select("*")
        .single()

      if (groupError || !group) {
        throw new Error(groupError?.message ?? "Failed to create place relationship")
      }

      const memberRows = input.placeIds.map((placeId) => ({
        place_relationship_id: group.id,
        type: input.type,
        place_id: placeId,
      }))

      const { data: members, error: membersError } = await supabase
        .from("place_relationship_members")
        .insert(memberRows)
        .select("*")

      if (membersError) {
        await supabase.from("place_relationships").delete().eq("id", group.id)
        throw new Error(membersError.message)
      }

      return mapRelationship(group, members ?? [])
    },

    async addMember(placeRelationshipId: string, placeId: string): Promise<void> {
      const supabase = await getSupabase()
      const { data: group, error: groupError } = await supabase
        .from("place_relationships")
        .select("type")
        .eq("id", placeRelationshipId)
        .maybeSingle()

      if (groupError || !group) {
        throw new Error(groupError?.message ?? "Place relationship not found")
      }

      const { error } = await supabase.from("place_relationship_members").insert({
        place_relationship_id: placeRelationshipId,
        type: group.type,
        place_id: placeId,
      })

      if (error) throw new Error(error.message)
    },

    async removeMember(placeRelationshipId: string, placeId: string): Promise<void> {
      const supabase = await getSupabase()
      const { error } = await supabase
        .from("place_relationship_members")
        .delete()
        .eq("place_relationship_id", placeRelationshipId)
        .eq("place_id", placeId)

      if (error) throw new Error(error.message)
    },

    async delete(placeRelationshipId: string): Promise<void> {
      const supabase = await getSupabase()
      const { error } = await supabase
        .from("place_relationships")
        .delete()
        .eq("id", placeRelationshipId)

      if (error) throw new Error(error.message)
    },
  }
}

export const placeRelationshipsSupabaseAdapter =
  createPlaceRelationshipsSupabaseAdapter(createClient)
