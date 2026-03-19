/**
 * Single source of truth for Supabase database types.
 * Used by: lib/supabase (server + client), middleware, modules/users adapters.
 *
 * Regenerate with:  npm run gen:types
 * Requires:         supabase CLI + running local instance (supabase start)
 *
 * Until auto-generation is set up, this file is maintained manually to match
 * the migration SQL in supabase/migrations/. Once you run `supabase gen types
 * typescript --local`, the CLI output replaces this file entirely.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string | null
          full_name: string | null
          avatar_url: string | null
          bio: string | null
          gender: string | null
          phone: string | null
          date_of_birth: string | null
          onboarding_completed: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          gender?: string | null
          phone?: string | null
          date_of_birth?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string | null
          full_name?: string | null
          avatar_url?: string | null
          bio?: string | null
          gender?: string | null
          phone?: string | null
          date_of_birth?: string | null
          onboarding_completed?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      fictions: {
        Row: {
          id: string
          title: string
          type: string
          year: number
          author: string | null
          genre: string
          description: string
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          type: string
          year: number
          author?: string | null
          genre: string
          description: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          type?: string
          year?: number
          author?: string | null
          genre?: string
          description?: string
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      cities: {
        Row: {
          id: string
          name: string
          country: string
          lat: number
          lng: number
          zoom: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          country: string
          lat: number
          lng: number
          zoom: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          country?: string
          lat?: number
          lng?: number
          zoom?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      asset_images: {
        Row: {
          id: string
          entity_type: string
          entity_id: string
          role: string
          variant: string
          url: string
          created_at: string
        }
        Insert: {
          id?: string
          entity_type: string
          entity_id: string
          role: string
          variant: string
          url: string
          created_at?: string
        }
        Update: {
          id?: string
          entity_type?: string
          entity_id?: string
          role?: string
          variant?: string
          url?: string
          created_at?: string
        }
        Relationships: []
      }
      locations: {
        Row: {
          id: string
          formatted_address: string
          post_code: string | null
          latitude: number
          longitude: number
          name: string
          type: string | null
          external_id: string | null
          provider: string | null
          city_id: string
          is_landmark: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          formatted_address: string
          post_code?: string | null
          latitude: number
          longitude: number
          name: string
          type?: string | null
          external_id?: string | null
          provider?: string | null
          city_id: string
          is_landmark?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          formatted_address?: string
          post_code?: string | null
          latitude?: number
          longitude?: number
          name?: string
          type?: string | null
          external_id?: string | null
          provider?: string | null
          city_id?: string
          is_landmark?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locations_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
        ]
      }
      places: {
        Row: {
          id: string
          fiction_id: string
          location_id: string | null
          description: string | null
          active: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          fiction_id: string
          location_id?: string | null
          description?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          fiction_id?: string
          location_id?: string | null
          description?: string | null
          active?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "places_fiction_id_fkey"
            columns: ["fiction_id"]
            isOneToOne: false
            referencedRelation: "fictions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "places_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_username_available: {
        Args: { p_username: string }
        Returns: boolean
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

// ---------------------------------------------------------------------------
// Helper types — shorthand for accessing table Row / Insert / Update shapes.
// These survive regeneration because `supabase gen types` emits them too.
// ---------------------------------------------------------------------------

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

// ---------------------------------------------------------------------------
// Table shorthand exports — use these in modules instead of per-module supabase.model files.
// ---------------------------------------------------------------------------

export type ProfileRow = Tables<"profiles">
export type ProfileInsert = TablesInsert<"profiles">
export type ProfileUpdate = TablesUpdate<"profiles">

export type FictionRow = Tables<"fictions">
export type FictionInsert = TablesInsert<"fictions">
export type FictionUpdate = TablesUpdate<"fictions">

export type CityRow = Tables<"cities">
export type CityInsert = TablesInsert<"cities">
export type CityUpdate = TablesUpdate<"cities">

export type AssetImageRow = Tables<"asset_images">
export type AssetImageInsert = TablesInsert<"asset_images">
export type AssetImageUpdate = TablesUpdate<"asset_images">

export type LocationRow = Tables<"locations">
export type LocationInsert = TablesInsert<"locations">
export type LocationUpdate = TablesUpdate<"locations">

export type PlaceRow = Tables<"places">
export type PlaceInsert = TablesInsert<"places">
export type PlaceUpdate = TablesUpdate<"places">

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never
