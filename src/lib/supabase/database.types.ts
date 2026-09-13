export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      audit_events: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: Json
          entity_id: string | null
          entity_type: string
          id: number
          org_unit_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity_id?: string | null
          entity_type: string
          id?: number
          org_unit_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: Json
          entity_id?: string | null
          entity_type?: string
          id?: number
          org_unit_id?: string | null
        }
        Relationships: []
      }
      geographies: {
        Row: {
          code: string
          created_at: string
          id: string
          is_active: boolean
          kind: Database["public"]["Enums"]["geography_kind"]
          name: string
          parent_id: string | null
          source_note: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind: Database["public"]["Enums"]["geography_kind"]
          name: string
          parent_id?: string | null
          source_note?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          kind?: Database["public"]["Enums"]["geography_kind"]
          name?: string
          parent_id?: string | null
          source_note?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      member_counters: {
        Row: {
          last_seq: number
          year: number
        }
        Insert: {
          last_seq?: number
          year: number
        }
        Update: {
          last_seq?: number
          year?: number
        }
        Relationships: []
      }
      members: {
        Row: {
          address: string | null
          blood_group: string | null
          caste_branch: string | null
          cnic: string
          created_at: string
          date_of_birth: string | null
          declaration_accepted: boolean
          designation: string | null
          designation_area: string | null
          designation_level: string | null
          district: string
          education: string | null
          emergency_contact_mobile: string | null
          emergency_contact_name: string | null
          emergency_contact_relation: string | null
          father_name: string
          full_name: string
          gender: string | null
          id: string
          is_active: boolean
          issued_at: string
          member_no: string | null
          mobile: string
          photo_url: string
          profession: string | null
          taluka: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          blood_group?: string | null
          caste_branch?: string | null
          cnic: string
          created_at?: string
          date_of_birth?: string | null
          declaration_accepted?: boolean
          designation?: string | null
          designation_area?: string | null
          designation_level?: string | null
          district: string
          education?: string | null
          emergency_contact_mobile?: string | null
          emergency_contact_name?: string | null
          emergency_contact_relation?: string | null
          father_name: string
          full_name: string
          gender?: string | null
          id?: string
          is_active?: boolean
          issued_at?: string
          member_no?: string | null
          mobile: string
          photo_url: string
          profession?: string | null
          taluka?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          blood_group?: string | null
          caste_branch?: string | null
          cnic?: string
          created_at?: string
          date_of_birth?: string | null
          declaration_accepted?: boolean
          designation?: string | null
          designation_area?: string | null
          designation_level?: string | null
          district?: string
          education?: string | null
          emergency_contact_mobile?: string | null
          emergency_contact_name?: string | null
          emergency_contact_relation?: string | null
          father_name?: string
          full_name?: string
          gender?: string | null
          id?: string
          is_active?: boolean
          issued_at?: string
          member_no?: string | null
          mobile?: string
          photo_url?: string
          profession?: string | null
          taluka?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean
          note: string | null
          org_unit_id: string
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["organization_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          org_unit_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          role: Database["public"]["Enums"]["organization_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          id?: string
          is_active?: boolean
          note?: string | null
          org_unit_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["organization_role"]
          user_id?: string
        }
        Relationships: []
      }
      organization_units: {
        Row: {
          code: string
          created_at: string
          geography_id: string | null
          id: string
          is_active: boolean
          level: Database["public"]["Enums"]["organization_level"]
          name: string
          parent_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          geography_id?: string | null
          id?: string
          is_active?: boolean
          level: Database["public"]["Enums"]["organization_level"]
          name: string
          parent_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          geography_id?: string | null
          id?: string
          is_active?: boolean
          level?: Database["public"]["Enums"]["organization_level"]
          name?: string
          parent_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
        }
        Relationships: []
      }
      volunteer_profiles: {
        Row: {
          address: string | null
          availability: Database["public"]["Enums"]["volunteer_availability"]
          availability_notes: string | null
          bio: string | null
          created_at: string
          crowd_management: boolean
          driving_available: boolean
          education: string | null
          emergency_contact_mobile: string | null
          emergency_contact_name: string | null
          full_name: string
          geography_id: string
          id: string
          is_active: boolean
          it_skills: boolean
          languages: string[]
          logistics: boolean
          medical_skills: boolean
          member_id: string | null
          mobile: string
          org_unit_id: string
          preferred_duties: string[]
          profession: string | null
          security_discipline: boolean
          skills: string[]
          social_media_skills: boolean
          updated_at: string
          user_id: string
          vehicle_available: boolean
        }
        Insert: {
          address?: string | null
          availability?: Database["public"]["Enums"]["volunteer_availability"]
          availability_notes?: string | null
          bio?: string | null
          created_at?: string
          crowd_management?: boolean
          driving_available?: boolean
          education?: string | null
          emergency_contact_mobile?: string | null
          emergency_contact_name?: string | null
          full_name: string
          geography_id: string
          id?: string
          is_active?: boolean
          it_skills?: boolean
          languages?: string[]
          logistics?: boolean
          medical_skills?: boolean
          member_id?: string | null
          mobile: string
          org_unit_id: string
          preferred_duties?: string[]
          profession?: string | null
          security_discipline?: boolean
          skills?: string[]
          social_media_skills?: boolean
          updated_at?: string
          user_id: string
          vehicle_available?: boolean
        }
        Update: {
          address?: string | null
          availability?: Database["public"]["Enums"]["volunteer_availability"]
          availability_notes?: string | null
          bio?: string | null
          created_at?: string
          crowd_management?: boolean
          driving_available?: boolean
          education?: string | null
          emergency_contact_mobile?: string | null
          emergency_contact_name?: string | null
          full_name?: string
          geography_id?: string
          id?: string
          is_active?: boolean
          it_skills?: boolean
          languages?: string[]
          logistics?: boolean
          medical_skills?: boolean
          member_id?: string | null
          mobile?: string
          org_unit_id?: string
          preferred_duties?: string[]
          profession?: string | null
          security_discipline?: boolean
          skills?: string[]
          social_media_skills?: boolean
          updated_at?: string
          user_id?: string
          vehicle_available?: boolean
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      list_volunteers_for_my_scope: {
        Args: Record<PropertyKey, never>
        Returns: {
          availability: Database["public"]["Enums"]["volunteer_availability"]
          availability_notes: string | null
          crowd_management: boolean
          driving_available: boolean
          education: string | null
          full_name: string
          geography_id: string
          id: string
          is_active: boolean
          it_skills: boolean
          languages: string[]
          logistics: boolean
          medical_skills: boolean
          member_linked: boolean
          mobile: string
          org_unit_id: string
          preferred_duties: string[]
          profession: string | null
          security_discipline: boolean
          skills: string[]
          social_media_skills: boolean
          updated_at: string
          vehicle_available: boolean
        }[]
      }
      my_volunteer_workbench_access: {
        Args: Record<PropertyKey, never>
        Returns: {
          can_manage: boolean
          can_view: boolean
        }[]
      }
      save_my_volunteer_profile: {
        Args: {
          p_geography_id: string
          p_profile: Json
        }
        Returns: string
      }
      set_volunteer_active: {
        Args: {
          p_is_active: boolean
          p_reason?: string | null
          p_volunteer_id: string
        }
        Returns: undefined
      }
      assign_organization_role: {
        Args: {
          p_note?: string | null
          p_org_unit_id: string
          p_role: Database["public"]["Enums"]["organization_role"]
          p_user_id: string
        }
        Returns: string
      }
      revoke_organization_role: {
        Args: { p_assignment_id: string }
        Returns: undefined
      }
      save_organization_unit: {
        Args: {
          p_is_active: boolean
          p_name: string
          p_org_unit_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin"
      geography_kind: "province" | "division" | "district" | "tehsil"
      organization_level: "central" | "province" | "division" | "district" | "tehsil"
      volunteer_availability: "available" | "limited" | "unavailable"
      organization_role:
        | "super_admin"
        | "central_leadership"
        | "national_operations_admin"
        | "national_finance_admin"
        | "provincial_coordinator"
        | "divisional_coordinator"
        | "district_coordinator"
        | "tehsil_coordinator"
        | "supervisor"
        | "auditor"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin"],
      geography_kind: ["province", "division", "district", "tehsil"],
      organization_level: ["central", "province", "division", "district", "tehsil"],
      volunteer_availability: ["available", "limited", "unavailable"],
      organization_role: [
        "super_admin",
        "central_leadership",
        "national_operations_admin",
        "national_finance_admin",
        "provincial_coordinator",
        "divisional_coordinator",
        "district_coordinator",
        "tehsil_coordinator",
        "supervisor",
        "auditor",
      ],
    },
  },
} as const

