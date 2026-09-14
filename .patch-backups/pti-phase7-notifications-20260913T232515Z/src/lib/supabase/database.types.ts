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
      finance_role_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          id: string
          is_active: boolean
          note: string | null
          org_unit_id: string
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["finance_role"]
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
          role: Database["public"]["Enums"]["finance_role"]
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
          role?: Database["public"]["Enums"]["finance_role"]
          user_id?: string
        }
        Relationships: []
      }
      fundraising_campaigns: {
        Row: {
          campaign_no: string
          created_at: string
          created_by: string
          currency: string
          description: string | null
          ends_at: string | null
          id: string
          org_unit_id: string
          starts_at: string | null
          status: Database["public"]["Enums"]["fundraising_campaign_status"]
          target_amount: number | null
          title: string
          updated_at: string
        }
        Insert: {
          campaign_no: string
          created_at?: string
          created_by: string
          currency?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          org_unit_id: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["fundraising_campaign_status"]
          target_amount?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          campaign_no?: string
          created_at?: string
          created_by?: string
          currency?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          org_unit_id?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["fundraising_campaign_status"]
          target_amount?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      donations: {
        Row: {
          amount: number
          campaign_id: string | null
          collector_user_id: string | null
          created_at: string
          currency: string
          donation_no: string
          donor_email: string | null
          donor_mobile: string | null
          donor_name: string | null
          id: string
          is_anonymous: boolean
          note: string | null
          org_unit_id: string
          payment_method: Database["public"]["Enums"]["finance_payment_method"]
          payment_reference: string | null
          received_at: string
          recorded_by: string
        }
        Insert: {
          amount: number
          campaign_id?: string | null
          collector_user_id?: string | null
          created_at?: string
          currency: string
          donation_no: string
          donor_email?: string | null
          donor_mobile?: string | null
          donor_name?: string | null
          id?: string
          is_anonymous?: boolean
          note?: string | null
          org_unit_id: string
          payment_method: Database["public"]["Enums"]["finance_payment_method"]
          payment_reference?: string | null
          received_at: string
          recorded_by: string
        }
        Update: {
          amount?: number
          campaign_id?: string | null
          collector_user_id?: string | null
          created_at?: string
          currency?: string
          donation_no?: string
          donor_email?: string | null
          donor_mobile?: string | null
          donor_name?: string | null
          id?: string
          is_anonymous?: boolean
          note?: string | null
          org_unit_id?: string
          payment_method?: Database["public"]["Enums"]["finance_payment_method"]
          payment_reference?: string | null
          received_at?: string
          recorded_by?: string
        }
        Relationships: []
      }
      donation_verification_events: {
        Row: {
          actor_id: string
          created_at: string
          donation_id: string
          id: number
          note: string | null
          state: Database["public"]["Enums"]["donation_verification_state"]
        }
        Insert: {
          actor_id: string
          created_at?: string
          donation_id: string
          id?: number
          note?: string | null
          state: Database["public"]["Enums"]["donation_verification_state"]
        }
        Update: {
          actor_id?: string
          created_at?: string
          donation_id?: string
          id?: number
          note?: string | null
          state?: Database["public"]["Enums"]["donation_verification_state"]
        }
        Relationships: []
      }
      donation_reconciliation_events: {
        Row: {
          actor_id: string
          created_at: string
          donation_id: string
          id: number
          note: string | null
          reconciliation_reference: string | null
          state: Database["public"]["Enums"]["donation_reconciliation_state"]
        }
        Insert: {
          actor_id: string
          created_at?: string
          donation_id: string
          id?: number
          note?: string | null
          reconciliation_reference?: string | null
          state: Database["public"]["Enums"]["donation_reconciliation_state"]
        }
        Update: {
          actor_id?: string
          created_at?: string
          donation_id?: string
          id?: number
          note?: string | null
          reconciliation_reference?: string | null
          state?: Database["public"]["Enums"]["donation_reconciliation_state"]
        }
        Relationships: []
      }
      donation_adjustments: {
        Row: {
          amount_delta: number
          created_at: string
          created_by: string
          donation_id: string
          id: string
          kind: Database["public"]["Enums"]["donation_adjustment_kind"]
          reason: string
          reference: string | null
        }
        Insert: {
          amount_delta: number
          created_at?: string
          created_by: string
          donation_id: string
          id?: string
          kind: Database["public"]["Enums"]["donation_adjustment_kind"]
          reason: string
          reference?: string | null
        }
        Update: {
          amount_delta?: number
          created_at?: string
          created_by?: string
          donation_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["donation_adjustment_kind"]
          reason?: string
          reference?: string | null
        }
        Relationships: []
      }
      donation_receipts: {
        Row: {
          amount_snapshot: number
          currency: string
          donation_id: string
          donor_name_snapshot: string | null
          id: string
          issued_at: string
          issued_by: string
          payment_method: Database["public"]["Enums"]["finance_payment_method"]
          payment_reference_snapshot: string | null
          receipt_no: string
          version: number
        }
        Insert: {
          amount_snapshot: number
          currency: string
          donation_id: string
          donor_name_snapshot?: string | null
          id?: string
          issued_at?: string
          issued_by: string
          payment_method: Database["public"]["Enums"]["finance_payment_method"]
          payment_reference_snapshot?: string | null
          receipt_no: string
          version: number
        }
        Update: {
          amount_snapshot?: number
          currency?: string
          donation_id?: string
          donor_name_snapshot?: string | null
          id?: string
          issued_at?: string
          issued_by?: string
          payment_method?: Database["public"]["Enums"]["finance_payment_method"]
          payment_reference_snapshot?: string | null
          receipt_no?: string
          version?: number
        }
        Relationships: []
      }
      attendance_records: {
        Row: {
          check_in_at: string | null
          check_out_at: string | null
          created_at: string
          id: string
          marked_by: string | null
          note: string | null
          operation_id: string
          org_unit_id: string
          session_id: string | null
          shift_id: string | null
          source: Database["public"]["Enums"]["attendance_source"]
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string
          id?: string
          marked_by?: string | null
          note?: string | null
          operation_id: string
          org_unit_id: string
          session_id?: string | null
          shift_id?: string | null
          source?: Database["public"]["Enums"]["attendance_source"]
          status: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          check_in_at?: string | null
          check_out_at?: string | null
          created_at?: string
          id?: string
          marked_by?: string | null
          note?: string | null
          operation_id?: string
          org_unit_id?: string
          session_id?: string | null
          shift_id?: string | null
          source?: Database["public"]["Enums"]["attendance_source"]
          status?: Database["public"]["Enums"]["attendance_status"]
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: []
      }
      attendance_sessions: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          closes_at: string
          created_at: string
          created_by: string
          id: string
          is_active: boolean
          late_after: string | null
          opens_at: string
          operation_id: string
          org_unit_id: string
          require_assignment: boolean
          shift_id: string | null
          token: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          closes_at: string
          created_at?: string
          created_by: string
          id?: string
          is_active?: boolean
          late_after?: string | null
          opens_at: string
          operation_id: string
          org_unit_id: string
          require_assignment?: boolean
          shift_id?: string | null
          token: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          closes_at?: string
          created_at?: string
          created_by?: string
          id?: string
          is_active?: boolean
          late_after?: string | null
          opens_at?: string
          operation_id?: string
          org_unit_id?: string
          require_assignment?: boolean
          shift_id?: string | null
          token?: string
        }
        Relationships: []
      }
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
          geography_id: string | null
          id: string
          is_active: boolean
          issued_at: string
          member_no: string | null
          mobile: string
          org_unit_id: string | null
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
          geography_id?: string | null
          id?: string
          is_active?: boolean
          issued_at?: string
          member_no?: string | null
          mobile: string
          org_unit_id?: string | null
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
          geography_id?: string | null
          id?: string
          is_active?: boolean
          issued_at?: string
          member_no?: string | null
          mobile?: string
          org_unit_id?: string | null
          photo_url?: string
          profession?: string | null
          taluka?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      organization_unit_closure: {
        Row: {
          ancestor_id: string
          depth: number
          descendant_id: string
        }
        Insert: {
          ancestor_id: string
          depth: number
          descendant_id: string
        }
        Update: {
          ancestor_id?: string
          depth?: number
          descendant_id?: string
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
      duty_assignments: {
        Row: {
          assigned_at: string
          assigned_by: string
          completed_at: string | null
          duty_id: string
          id: string
          responded_at: string | null
          response_note: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["duty_status"]
          updated_at: string
          volunteer_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          completed_at?: string | null
          duty_id: string
          id?: string
          responded_at?: string | null
          response_note?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["duty_status"]
          updated_at?: string
          volunteer_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          completed_at?: string | null
          duty_id?: string
          id?: string
          responded_at?: string | null
          response_note?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["duty_status"]
          updated_at?: string
          volunteer_id?: string
        }
        Relationships: []
      }
      operation_coordinators: {
        Row: {
          assigned_at: string
          assigned_by: string
          id: string
          is_active: boolean
          operation_id: string
          revoked_at: string | null
          revoked_by: string | null
          role: Database["public"]["Enums"]["operation_coordinator_role"]
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by: string
          id?: string
          is_active?: boolean
          operation_id: string
          revoked_at?: string | null
          revoked_by?: string | null
          role: Database["public"]["Enums"]["operation_coordinator_role"]
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string
          id?: string
          is_active?: boolean
          operation_id?: string
          revoked_at?: string | null
          revoked_by?: string | null
          role?: Database["public"]["Enums"]["operation_coordinator_role"]
          user_id?: string
        }
        Relationships: []
      }
      operation_duties: {
        Row: {
          created_at: string
          created_by: string
          ends_at: string | null
          id: string
          instructions: string | null
          is_active: boolean
          location: string | null
          operation_id: string
          org_unit_id: string
          priority: Database["public"]["Enums"]["duty_priority"]
          shift_id: string | null
          starts_at: string | null
          team_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          ends_at?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          location?: string | null
          operation_id: string
          org_unit_id: string
          priority?: Database["public"]["Enums"]["duty_priority"]
          shift_id?: string | null
          starts_at?: string | null
          team_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          ends_at?: string | null
          id?: string
          instructions?: string | null
          is_active?: boolean
          location?: string | null
          operation_id?: string
          org_unit_id?: string
          priority?: Database["public"]["Enums"]["duty_priority"]
          shift_id?: string | null
          starts_at?: string | null
          team_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      operation_shifts: {
        Row: {
          capacity: number | null
          created_at: string
          created_by: string
          ends_at: string
          id: string
          is_active: boolean
          location: string | null
          name: string
          operation_id: string
          org_unit_id: string
          starts_at: string
          updated_at: string
        }
        Insert: {
          capacity?: number | null
          created_at?: string
          created_by: string
          ends_at: string
          id?: string
          is_active?: boolean
          location?: string | null
          name: string
          operation_id: string
          org_unit_id: string
          starts_at: string
          updated_at?: string
        }
        Update: {
          capacity?: number | null
          created_at?: string
          created_by?: string
          ends_at?: string
          id?: string
          is_active?: boolean
          location?: string | null
          name?: string
          operation_id?: string
          org_unit_id?: string
          starts_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      operation_team_members: {
        Row: {
          added_by: string
          id: string
          is_active: boolean
          joined_at: string
          removed_at: string | null
          removed_by: string | null
          team_id: string
          volunteer_id: string
        }
        Insert: {
          added_by: string
          id?: string
          is_active?: boolean
          joined_at?: string
          removed_at?: string | null
          removed_by?: string | null
          team_id: string
          volunteer_id: string
        }
        Update: {
          added_by?: string
          id?: string
          is_active?: boolean
          joined_at?: string
          removed_at?: string | null
          removed_by?: string | null
          team_id?: string
          volunteer_id?: string
        }
        Relationships: []
      }
      operation_teams: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          is_active: boolean
          lead_volunteer_id: string | null
          name: string
          operation_id: string
          org_unit_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          is_active?: boolean
          lead_volunteer_id?: string | null
          name: string
          operation_id: string
          org_unit_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          is_active?: boolean
          lead_volunteer_id?: string | null
          name?: string
          operation_id?: string
          org_unit_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      operations: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          ends_at: string | null
          id: string
          kind: Database["public"]["Enums"]["operation_kind"]
          location: string | null
          org_unit_id: string
          starts_at: string | null
          status: Database["public"]["Enums"]["operation_status"]
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          ends_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["operation_kind"]
          location?: string | null
          org_unit_id: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["operation_status"]
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          ends_at?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["operation_kind"]
          location?: string | null
          org_unit_id?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["operation_status"]
          title?: string
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
      get_leadership_dashboard: {
        Args: {
          p_from?: string | null
          p_org_unit_id: string
          p_to?: string | null
        }
        Returns: Json
      }
      list_leadership_scopes: {
        Args: Record<PropertyKey, never>
        Returns: {
          code: string
          depth: number
          id: string
          level: Database["public"]["Enums"]["organization_level"]
          name: string
          parent_id: string | null
        }[]
      }
      my_leadership_access: {
        Args: Record<PropertyKey, never>
        Returns: {
          can_view: boolean
          default_org_unit_id: string | null
          default_org_unit_level: Database["public"]["Enums"]["organization_level"] | null
          default_org_unit_name: string | null
        }[]
      }
      add_donation_adjustment: {
        Args: {
          p_amount_delta: number
          p_donation_id: string
          p_kind: Database["public"]["Enums"]["donation_adjustment_kind"]
          p_reason: string
          p_reference?: string | null
        }
        Returns: string
      }
      assign_finance_role_by_email: {
        Args: {
          p_email: string
          p_note?: string | null
          p_org_unit_id: string
          p_role: Database["public"]["Enums"]["finance_role"]
        }
        Returns: string
      }
      get_finance_receipt: {
        Args: { p_receipt_no: string }
        Returns: {
          amount: number
          campaign_no: string | null
          campaign_title: string | null
          currency: string
          donation_no: string
          donor_name: string | null
          issued_at: string
          org_unit_name: string
          payment_method: Database["public"]["Enums"]["finance_payment_method"]
          payment_reference: string | null
          receipt_no: string
          received_at: string
          version: number
        }[]
      }
      issue_donation_receipt: {
        Args: { p_donation_id: string }
        Returns: string
      }
      list_donation_adjustments: {
        Args: { p_donation_id: string }
        Returns: {
          amount_delta: number
          created_at: string
          created_by: string
          id: string
          kind: Database["public"]["Enums"]["donation_adjustment_kind"]
          reason: string
          reference: string | null
        }[]
      }
      list_donation_receipts: {
        Args: { p_donation_id: string }
        Returns: {
          amount_snapshot: number
          currency: string
          donor_name_snapshot: string | null
          id: string
          issued_at: string
          issued_by: string
          payment_method: Database["public"]["Enums"]["finance_payment_method"]
          payment_reference_snapshot: string | null
          receipt_no: string
          version: number
        }[]
      }
      list_donation_workflow_events: {
        Args: { p_donation_id: string }
        Returns: {
          actor_id: string
          created_at: string
          event_type: string
          note: string | null
          reference: string | null
          state: string
        }[]
      }
      list_finance_donations: {
        Args: { p_campaign_id?: string | null }
        Returns: {
          adjustment_count: number
          amount: number
          campaign_id: string | null
          campaign_no: string | null
          campaign_title: string | null
          collector_user_id: string | null
          created_at: string
          currency: string
          donation_no: string
          donor_email: string | null
          donor_mobile: string | null
          donor_name: string | null
          effective_amount: number
          id: string
          is_anonymous: boolean
          latest_receipt_no: string | null
          latest_receipt_version: number | null
          note: string | null
          org_unit_id: string
          org_unit_name: string
          payment_method: Database["public"]["Enums"]["finance_payment_method"]
          payment_reference: string | null
          received_at: string
          reconciliation_state: Database["public"]["Enums"]["donation_reconciliation_state"]
          recorded_by: string
          verification_state: Database["public"]["Enums"]["donation_verification_state"]
        }[]
      }
      list_finance_role_assignments_for_my_scope: {
        Args: Record<PropertyKey, never>
        Returns: {
          assigned_at: string
          assignment_id: string
          email: string | null
          is_active: boolean
          note: string | null
          org_unit_id: string
          org_unit_name: string
          revoked_at: string | null
          role: Database["public"]["Enums"]["finance_role"]
          user_id: string
        }[]
      }
      list_fundraising_campaigns_for_my_scope: {
        Args: Record<PropertyKey, never>
        Returns: {
          campaign_no: string
          created_at: string
          currency: string
          description: string | null
          donation_count: number
          ends_at: string | null
          id: string
          org_unit_id: string
          org_unit_name: string
          reconciled_total: number
          recorded_total: number
          starts_at: string | null
          status: Database["public"]["Enums"]["fundraising_campaign_status"]
          target_amount: number | null
          title: string
          updated_at: string
          verified_total: number
        }[]
      }
      my_finance_workbench_access: {
        Args: Record<PropertyKey, never>
        Returns: {
          can_admin: boolean
          can_reconcile: boolean
          can_record: boolean
          can_verify: boolean
          can_view: boolean
        }[]
      }
      record_finance_donation: {
        Args: {
          p_campaign_id: string | null
          p_org_unit_id: string
          p_payload: Json
        }
        Returns: string
      }
      revoke_finance_role: {
        Args: { p_assignment_id: string }
        Returns: undefined
      }
      save_fundraising_campaign: {
        Args: {
          p_campaign_id: string | null
          p_org_unit_id: string
          p_payload: Json
        }
        Returns: string
      }
      set_donation_reconciliation: {
        Args: {
          p_donation_id: string
          p_note?: string | null
          p_reference?: string | null
          p_state: Database["public"]["Enums"]["donation_reconciliation_state"]
        }
        Returns: undefined
      }
      set_donation_verification: {
        Args: {
          p_donation_id: string
          p_note?: string | null
          p_state: Database["public"]["Enums"]["donation_verification_state"]
        }
        Returns: undefined
      }
      check_in_with_attendance_token: {
        Args: { p_token: string }
        Returns: {
          check_in_at: string
          check_out_at: string | null
          operation_title: string
          record_id: string
          shift_name: string | null
          status: Database["public"]["Enums"]["attendance_status"]
        }[]
      }
      check_out_attendance_record: {
        Args: { p_record_id: string }
        Returns: string
      }
      check_out_my_attendance: {
        Args: { p_record_id: string }
        Returns: string
      }
      close_attendance_session: {
        Args: { p_session_id: string }
        Returns: undefined
      }
      create_attendance_session: {
        Args: {
          p_closes_at: string
          p_late_after: string | null
          p_opens_at: string
          p_operation_id: string
          p_require_assignment?: boolean
          p_shift_id: string | null
        }
        Returns: { session_id: string; token: string }[]
      }
      list_attendance_operations_for_my_scope: {
        Args: Record<PropertyKey, never>
        Returns: {
          absent_count: number
          active_sessions: number
          attendance_records: number
          checked_out_count: number
          engaged_volunteers: number
          ends_at: string | null
          excused_count: number
          late_count: number
          operation_id: string
          operation_status: Database["public"]["Enums"]["operation_status"]
          operation_title: string
          org_unit_id: string
          org_unit_name: string
          present_count: number
          starts_at: string | null
        }[]
      }
      list_attendance_sessions: {
        Args: { p_operation_id: string }
        Returns: {
          closes_at: string
          created_at: string
          is_active: boolean
          late_after: string | null
          opens_at: string
          require_assignment: boolean
          session_id: string
          shift_id: string | null
          shift_name: string | null
          token: string | null
        }[]
      }
      list_my_participation_history: {
        Args: Record<PropertyKey, never>
        Returns: {
          attendance_source: Database["public"]["Enums"]["attendance_source"]
          attendance_status: Database["public"]["Enums"]["attendance_status"]
          check_in_at: string | null
          check_out_at: string | null
          note: string | null
          operation_ends_at: string | null
          operation_id: string
          operation_kind: Database["public"]["Enums"]["operation_kind"]
          operation_starts_at: string | null
          operation_status: Database["public"]["Enums"]["operation_status"]
          operation_title: string
          record_id: string
          shift_id: string | null
          shift_name: string | null
        }[]
      }
      list_operation_attendance_roster: {
        Args: { p_operation_id: string; p_shift_id?: string | null }
        Returns: {
          check_in_at: string | null
          check_out_at: string | null
          full_name: string
          is_engaged: boolean
          mobile: string
          note: string | null
          org_unit_name: string
          record_id: string | null
          source: Database["public"]["Enums"]["attendance_source"] | null
          status: Database["public"]["Enums"]["attendance_status"] | null
          volunteer_id: string
        }[]
      }
      my_attendance_workbench_access: {
        Args: Record<PropertyKey, never>
        Returns: { can_manage: boolean; can_view: boolean }[]
      }
      my_participation_summary: {
        Args: Record<PropertyKey, never>
        Returns: {
          completed_duties: number
          excused_count: number
          late_count: number
          operations_participated: number
          present_count: number
          total_hours: number
        }[]
      }
      set_attendance_record: {
        Args: {
          p_note?: string | null
          p_operation_id: string
          p_shift_id: string | null
          p_status: Database["public"]["Enums"]["attendance_status"]
          p_volunteer_id: string
        }
        Returns: string
      }
      assign_operation_duty: {
        Args: { p_duty_id: string; p_volunteer_id: string }
        Returns: string
      }
      cancel_duty_assignment: {
        Args: { p_assignment_id: string; p_reason: string }
        Returns: undefined
      }
      list_my_duty_assignments: {
        Args: Record<PropertyKey, never>
        Returns: {
          assigned_at: string
          assignment_id: string
          completed_at: string | null
          duty_id: string
          duty_title: string
          ends_at: string | null
          instructions: string | null
          location: string | null
          operation_id: string
          operation_status: Database["public"]["Enums"]["operation_status"]
          operation_title: string
          priority: Database["public"]["Enums"]["duty_priority"]
          responded_at: string | null
          response_note: string | null
          shift_name: string | null
          started_at: string | null
          starts_at: string | null
          status: Database["public"]["Enums"]["duty_status"]
          team_name: string | null
        }[]
      }
      list_operation_coordinator_candidates: {
        Args: { p_operation_id: string }
        Returns: {
          email: string | null
          org_unit_id: string
          org_unit_name: string
          role: Database["public"]["Enums"]["organization_role"]
          user_id: string
        }[]
      }
      list_operations_for_my_scope: {
        Args: Record<PropertyKey, never>
        Returns: {
          assignment_count: number
          completed_count: number
          created_at: string
          description: string | null
          duty_count: number
          ends_at: string | null
          id: string
          kind: Database["public"]["Enums"]["operation_kind"]
          location: string | null
          org_level: Database["public"]["Enums"]["organization_level"]
          org_unit_id: string
          org_unit_name: string
          shift_count: number
          starts_at: string | null
          status: Database["public"]["Enums"]["operation_status"]
          team_count: number
          title: string
          updated_at: string
        }[]
      }
      my_operations_workbench_access: {
        Args: Record<PropertyKey, never>
        Returns: { can_create: boolean; can_manage: boolean; can_view: boolean }[]
      }
      save_operation: {
        Args: { p_operation_id: string | null; p_org_unit_id: string; p_payload: Json }
        Returns: string
      }
      save_operation_duty: {
        Args: {
          p_duty_id: string | null
          p_operation_id: string
          p_org_unit_id: string
          p_payload: Json
          p_shift_id: string | null
          p_team_id: string | null
        }
        Returns: string
      }
      save_operation_shift: {
        Args: {
          p_capacity: number | null
          p_ends_at: string
          p_location: string
          p_name: string
          p_operation_id: string
          p_org_unit_id: string
          p_shift_id: string | null
          p_starts_at: string
        }
        Returns: string
      }
      save_operation_team: {
        Args: {
          p_description: string
          p_lead_volunteer_id: string | null
          p_name: string
          p_operation_id: string
          p_org_unit_id: string
          p_team_id: string | null
        }
        Returns: string
      }
      set_operation_coordinator: {
        Args: {
          p_is_active: boolean
          p_operation_id: string
          p_role: Database["public"]["Enums"]["operation_coordinator_role"]
          p_user_id: string
        }
        Returns: undefined
      }
      set_operation_status: {
        Args: { p_operation_id: string; p_status: Database["public"]["Enums"]["operation_status"] }
        Returns: undefined
      }
      set_operation_team_member: {
        Args: { p_is_active: boolean; p_team_id: string; p_volunteer_id: string }
        Returns: undefined
      }
      update_my_duty_status: {
        Args: {
          p_assignment_id: string
          p_note: string
          p_status: Database["public"]["Enums"]["duty_status"]
        }
        Returns: undefined
      }
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
      donation_adjustment_kind: "correction" | "reversal" | "refund" | "chargeback"
      donation_reconciliation_state: "pending" | "reconciled" | "exception"
      donation_verification_state: "pending" | "verified" | "rejected"
      finance_payment_method: "cash" | "bank_transfer" | "card" | "online_wallet" | "cheque" | "other"
      finance_role: "finance_admin" | "finance_officer" | "collector" | "auditor"
      fundraising_campaign_status: "draft" | "active" | "paused" | "completed" | "cancelled"
      attendance_source: "qr" | "manual"
      attendance_status: "present" | "absent" | "late" | "excused"
      app_role: "admin"
      geography_kind: "province" | "division" | "district" | "tehsil"
      duty_priority: "low" | "normal" | "high" | "urgent"
      duty_status: "assigned" | "accepted" | "in_progress" | "completed" | "unable" | "cancelled"
      operation_coordinator_role: "coordinator" | "supervisor"
      operation_kind:
        | "long_march"
        | "public_gathering"
        | "convention"
        | "membership_campaign"
        | "fundraising_campaign"
        | "protest"
        | "relief_campaign"
        | "other"
      operation_status: "draft" | "planned" | "active" | "completed" | "cancelled"
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
      donation_adjustment_kind: ["correction", "reversal", "refund", "chargeback"],
      donation_reconciliation_state: ["pending", "reconciled", "exception"],
      donation_verification_state: ["pending", "verified", "rejected"],
      finance_payment_method: ["cash", "bank_transfer", "card", "online_wallet", "cheque", "other"],
      finance_role: ["finance_admin", "finance_officer", "collector", "auditor"],
      fundraising_campaign_status: ["draft", "active", "paused", "completed", "cancelled"],
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

