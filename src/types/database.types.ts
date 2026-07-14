export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          new_data: Json | null
          old_data: Json | null
          record_id: string
          table_name: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id: string
          table_name: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string
          table_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      buildings: {
        Row: {
          address: string | null
          code: string
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      classroom_software: {
        Row: {
          classroom_id: string
          created_at: string | null
          expiry_date: string | null
          id: string
          installed_date: string | null
          licenses: number | null
          licenses_count: number
          notes: string | null
          software_id: string
          updated_at: string | null
        }
        Insert: {
          classroom_id: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          installed_date?: string | null
          licenses?: number | null
          licenses_count?: number
          notes?: string | null
          software_id: string
          updated_at?: string | null
        }
        Update: {
          classroom_id?: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          installed_date?: string | null
          licenses?: number | null
          licenses_count?: number
          notes?: string | null
          software_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "classroom_software_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classroom_software_requirements"
            referencedColumns: ["classroom_id"]
          },
          {
            foreignKeyName: "classroom_software_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_software_software_id_fkey"
            columns: ["software_id"]
            isOneToOne: false
            referencedRelation: "classroom_software_requirements"
            referencedColumns: ["software_id"]
          },
          {
            foreignKeyName: "classroom_software_software_id_fkey"
            columns: ["software_id"]
            isOneToOne: false
            referencedRelation: "expiring_licenses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_software_software_id_fkey"
            columns: ["software_id"]
            isOneToOne: false
            referencedRelation: "software"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_software_software_id_fkey"
            columns: ["software_id"]
            isOneToOne: false
            referencedRelation: "software_license_summary"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "classroom_software_software_id_fkey"
            columns: ["software_id"]
            isOneToOne: false
            referencedRelation: "software_with_classrooms"
            referencedColumns: ["id"]
          },
        ]
      }
      classrooms: {
        Row: {
          building: string | null
          building_id: string | null
          capacity: number
          code: string
          computer_count: number | null
          computer_type: string | null
          created_at: string | null
          depth: number | null
          description: string | null
          equipment: Json | null
          floor: number | null
          has_computers: boolean | null
          id: string
          is_available: boolean | null
          is_public: boolean
          name: string
          office365_calendar_url: string | null
          operating_system: string | null
          photos: Json | null
          type: string
          updated_at: string | null
          width: number | null
        }
        Insert: {
          building?: string | null
          building_id?: string | null
          capacity: number
          code: string
          computer_count?: number | null
          computer_type?: string | null
          created_at?: string | null
          depth?: number | null
          description?: string | null
          equipment?: Json | null
          floor?: number | null
          has_computers?: boolean | null
          id?: string
          is_available?: boolean | null
          is_public?: boolean
          name: string
          office365_calendar_url?: string | null
          operating_system?: string | null
          photos?: Json | null
          type: string
          updated_at?: string | null
          width?: number | null
        }
        Update: {
          building?: string | null
          building_id?: string | null
          capacity?: number
          code?: string
          computer_count?: number | null
          computer_type?: string | null
          created_at?: string | null
          depth?: number | null
          description?: string | null
          equipment?: Json | null
          floor?: number | null
          has_computers?: boolean | null
          id?: string
          is_available?: boolean | null
          is_public?: boolean
          name?: string
          office365_calendar_url?: string | null
          operating_system?: string | null
          photos?: Json | null
          type?: string
          updated_at?: string | null
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "classrooms_building_id_fkey"
            columns: ["building_id"]
            isOneToOne: false
            referencedRelation: "buildings"
            referencedColumns: ["id"]
          },
        ]
      }
      course_colors: {
        Row: {
          color: string
          color_type: string | null
          course_code: string
          course_name: string
          created_at: string | null
          id: string
          itinerary_code: string | null
          updated_at: string | null
          year: number
        }
        Insert: {
          color?: string
          color_type?: string | null
          course_code: string
          course_name: string
          created_at?: string | null
          id?: string
          itinerary_code?: string | null
          updated_at?: string | null
          year: number
        }
        Update: {
          color?: string
          color_type?: string | null
          course_code?: string
          course_name?: string
          created_at?: string | null
          id?: string
          itinerary_code?: string | null
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      design_itineraries: {
        Row: {
          code: string
          color: string
          created_at: string | null
          description: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          code: string
          color?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string
          color?: string
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          created_at: string | null
          failed_count: number
          id: string
          recipients_count: number
          sent_by: string
          subject_id: string
          successful_count: number
        }
        Insert: {
          created_at?: string | null
          failed_count?: number
          id?: string
          recipients_count?: number
          sent_by: string
          subject_id: string
          successful_count?: number
        }
        Update: {
          created_at?: string | null
          failed_count?: number
          id?: string
          recipients_count?: number
          sent_by?: string
          subject_id?: string
          successful_count?: number
        }
        Relationships: []
      }
      equipment_inventory: {
        Row: {
          classroom_id: string
          created_at: string | null
          equipment_type_id: string
          id: string
          notes: string | null
          purchase_date: string | null
          quantity: number
          serial_number: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          classroom_id: string
          created_at?: string | null
          equipment_type_id: string
          id?: string
          notes?: string | null
          purchase_date?: string | null
          quantity?: number
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          classroom_id?: string
          created_at?: string | null
          equipment_type_id?: string
          id?: string
          notes?: string | null
          purchase_date?: string | null
          quantity?: number
          serial_number?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_inventory_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classroom_software_requirements"
            referencedColumns: ["classroom_id"]
          },
          {
            foreignKeyName: "equipment_inventory_classroom_id_fkey"
            columns: ["classroom_id"]
            isOneToOne: false
            referencedRelation: "classrooms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_inventory_equipment_type_id_fkey"
            columns: ["equipment_type_id"]
            isOneToOne: false
            referencedRelation: "equipment_types"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_types: {
        Row: {
          category: string
          code: string
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          is_active: boolean | null
          name: string
          updated_at: string | null
        }
        Insert: {
          category: string
          code: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          updated_at?: string | null
        }
        Update: {
          category?: string
          code?: string
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      software: {
        Row: {
          category: string
          created_at: string | null
          expiry_date: string | null
          id: string
          last_renewal_date: string | null
          license_cost: number | null
          license_model: string | null
          license_quantity: number | null
          license_type: string
          license_url: string | null
          name: string
          notes: string | null
          operating_systems: Json | null
          provider_email: string | null
          provider_name: string | null
          provider_phone: string | null
          renewal_reminder_days: number | null
          updated_at: string | null
          version: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          last_renewal_date?: string | null
          license_cost?: number | null
          license_model?: string | null
          license_quantity?: number | null
          license_type: string
          license_url?: string | null
          name: string
          notes?: string | null
          operating_systems?: Json | null
          provider_email?: string | null
          provider_name?: string | null
          provider_phone?: string | null
          renewal_reminder_days?: number | null
          updated_at?: string | null
          version?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          expiry_date?: string | null
          id?: string
          last_renewal_date?: string | null
          license_cost?: number | null
          license_model?: string | null
          license_quantity?: number | null
          license_type?: string
          license_url?: string | null
          name?: string
          notes?: string | null
          operating_systems?: Json | null
          provider_email?: string | null
          provider_name?: string | null
          provider_phone?: string | null
          renewal_reminder_days?: number | null
          updated_at?: string | null
          version?: string | null
        }
        Relationships: []
      }
      user_profiles: {
        Row: {
          created_at: string | null
          id: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      classroom_software_requirements: {
        Row: {
          academic_year: string | null
          building: string | null
          category: string | null
          classroom_code: string | null
          classroom_id: string | null
          classroom_name: string | null
          is_installed: boolean | null
          is_required: boolean | null
          license_type: string | null
          required_by_subjects: string | null
          requiring_subject_count: number | null
          software_id: string | null
          software_name: string | null
          software_version: string | null
        }
        Relationships: []
      }
      expiring_licenses: {
        Row: {
          days_until_expiry: number | null
          expiry_date: string | null
          id: string | null
          last_renewal_date: string | null
          license_cost: number | null
          license_model: string | null
          license_quantity: number | null
          license_type: string | null
          license_url: string | null
          name: string | null
          provider_email: string | null
          provider_name: string | null
          provider_phone: string | null
          renewal_reminder_days: number | null
          status: string | null
          version: string | null
        }
        Insert: {
          days_until_expiry?: never
          expiry_date?: string | null
          id?: string | null
          last_renewal_date?: string | null
          license_cost?: number | null
          license_model?: string | null
          license_quantity?: number | null
          license_type?: string | null
          license_url?: string | null
          name?: string | null
          provider_email?: string | null
          provider_name?: string | null
          provider_phone?: string | null
          renewal_reminder_days?: number | null
          status?: never
          version?: string | null
        }
        Update: {
          days_until_expiry?: never
          expiry_date?: string | null
          id?: string | null
          last_renewal_date?: string | null
          license_cost?: number | null
          license_model?: string | null
          license_quantity?: number | null
          license_type?: string | null
          license_url?: string | null
          name?: string | null
          provider_email?: string | null
          provider_name?: string | null
          provider_phone?: string | null
          renewal_reminder_days?: number | null
          status?: never
          version?: string | null
        }
        Relationships: []
      }
      software_license_summary: {
        Row: {
          classroom_count: number | null
          expiry_date: string | null
          id: string | null
          license_cost: number | null
          license_status: string | null
          license_type: string | null
          licenses_assigned: number | null
          licenses_available: number | null
          name: string | null
          program_count: number | null
          renewal_reminder_days: number | null
          subject_count: number | null
          total_licenses: number | null
          version: string | null
        }
        Relationships: []
      }
      software_with_classrooms: {
        Row: {
          category: string | null
          classroom_count: number | null
          classrooms: Json | null
          created_at: string | null
          expiry_date: string | null
          id: string | null
          last_renewal_date: string | null
          license_cost: number | null
          license_model: string | null
          license_quantity: number | null
          license_type: string | null
          license_url: string | null
          name: string | null
          notes: string | null
          operating_systems: Json | null
          provider_email: string | null
          provider_name: string | null
          provider_phone: string | null
          renewal_reminder_days: number | null
          updated_at: string | null
          version: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      assign_required_software_to_classroom: {
        Args: { p_classroom_id: string; p_override_licenses?: boolean }
        Returns: Json
      }
      check_all_classroom_conflicts: {
        Args: {
          p_exclude_assignment_id?: string
          p_semester_id: string
          p_time_slot_id: string
          p_week_numbers: number[]
        }
        Returns: {
          classroom_id: string
          conflicting_weeks: number[]
          group_code: string
          subject_name: string
        }[]
      }
      check_all_profile_classroom_conflicts: {
        Args: {
          p_exclude_profile_assignment_id?: string
          p_semester_id: string
          p_time_slot_id: string
          p_week_numbers: number[]
        }
        Returns: {
          classroom_id: string
          conflicting_weeks: number[]
          profile_name: string
        }[]
      }
      check_classroom_week_conflicts: {
        Args: {
          p_classroom_id: string
          p_exclude_assignment_id?: string
          p_semester_id?: string
          p_time_slot_id: string
          p_week_numbers: number[]
        }
        Returns: {
          conflicting_weeks: number[]
          group_code: string
          subject_name: string
        }[]
      }
      check_profile_classroom_conflicts: {
        Args: {
          p_classroom_id: string
          p_exclude_profile_assignment_id?: string
          p_semester_id: string
          p_time_slot_id: string
          p_week_numbers: number[]
        }
        Returns: {
          conflicting_weeks: number[]
          profile_name: string
        }[]
      }
      check_software_license_availability: {
        Args: { p_requested_licenses: number; p_software_id: string }
        Returns: {
          available_licenses: number
          can_assign: boolean
          message: string
        }[]
      }
      check_subject_group_teacher_conflicts: {
        Args: {
          p_exclude_assignment_id?: string
          p_semester_id: string
          p_subject_group_id: string
          p_time_slot_id: string
        }
        Returns: {
          conflicting_group: string
          conflicting_subject: string
          teacher_id: string
          teacher_name: string
        }[]
      }
      check_teacher_schedule_conflicts: {
        Args: {
          p_exclude_assignment_id?: string
          p_semester_id: string
          p_teacher_id: string
          p_time_slot_id: string
        }
        Returns: {
          assignment_id: string
          group_code: string
          semester_name: string
          subject_name: string
        }[]
      }
      classroom_week_occupancy: {
        Args: { p_classroom_id: string; p_monday: string }
        Returns: {
          day_of_week: number
          end_time: string
          kind: string
          start_time: string
          the_date: string
        }[]
      }
      create_assignment_bypass_rls: {
        Args: {
          p_hours_per_week: number
          p_semester_id: string
          p_student_group_id: string
          p_subject_group_id: string
          p_subject_id: string
          p_time_slot_id: string
        }
        Returns: string
      }
      get_all_teacher_assignments: {
        Args: never
        Returns: {
          academic_year: string
          credits: number
          department: string
          ects_assigned: number
          email: string
          first_name: string
          group_code: string
          group_id: string
          last_name: string
          subject_code: string
          subject_id: string
          subject_name: string
          teacher_id: string
        }[]
      }
      get_group_teacher_assignments: {
        Args: { p_group_id: string }
        Returns: {
          department: string
          ects_assigned: number
          email: string
          first_name: string
          last_name: string
          teacher_id: string
        }[]
      }
      get_licenses_requiring_attention: {
        Args: never
        Returns: {
          days_until_expiry: number
          expiry_date: string
          id: string
          name: string
          provider_email: string
          provider_name: string
          status: string
          version: string
        }[]
      }
      get_teacher_counts_by_degree: {
        Args: { degree_prefix: string }
        Returns: {
          subject_group_id: string
          teacher_count: number
        }[]
      }
      get_teacher_names: {
        Args: { degree_prefix: string }
        Returns: {
          teacher_name: string
        }[]
      }
      get_teacher_names_by_degree: {
        Args: { degree_prefix: string }
        Returns: {
          subject_group_id: string
          teacher_names: string
        }[]
      }
      get_teacher_names_for_subject: {
        Args: { p_subject_id: string }
        Returns: {
          subject_group_id: string
          teacher_names: string
        }[]
      }
      get_teachers_for_group: {
        Args: { group_id: string }
        Returns: {
          first_name: string
          full_name: string
          is_coordinator: boolean
          last_name: string
          teacher_id: string
        }[]
      }
      is_admin: { Args: { user_id: string }; Returns: boolean }
      is_email_in_tfg_allowlist: { Args: { p_email: string }; Returns: boolean }
      is_space_admin: { Args: never; Returns: boolean }
      is_tfg_admin: { Args: never; Returns: boolean }
      request_public_reservation: {
        Args: {
          p_classroom_id: string
          p_date: string
          p_description: string
          p_email: string
          p_end: string
          p_name: string
          p_start: string
        }
        Returns: string
      }
      space_slot_busy_weeks: {
        Args: {
          p_classroom_id: string
          p_exclude_reservation_id?: string
          p_semester_id: string
          p_time_slot_id: string
        }
        Returns: number[]
      }
      sync_all_teachers: {
        Args: never
        Returns: {
          updated_count: number
        }[]
      }
    }
    Enums: {
      program_type: "grau" | "master" | "postgrau"
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
  public: {
    Enums: {
      program_type: ["grau", "master", "postgrau"],
    },
  },
} as const
