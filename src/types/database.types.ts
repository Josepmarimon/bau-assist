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
      assignments: {
        Row: {
          id: string
          subject_id: string
          subject_group_id: string
          teacher_id: string | null
          classroom_id: string | null
          student_group_id: string | null
          time_slot_id: string | null
          semester_id: string
          hours_per_week: number
          color: string | null
          notes: string | null
          created_at: string
          updated_at: string
          created_by: string | null
        }
        Insert: {
          id?: string
          subject_id: string
          subject_group_id: string
          teacher_id?: string | null
          classroom_id?: string | null
          student_group_id?: string | null
          time_slot_id?: string | null
          semester_id: string
          hours_per_week: number
          color?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
        Update: {
          id?: string
          subject_id?: string
          subject_group_id?: string
          teacher_id?: string | null
          classroom_id?: string | null
          student_group_id?: string | null
          time_slot_id?: string | null
          semester_id?: string
          hours_per_week?: number
          color?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
          created_by?: string | null
        }
      }
      semesters: {
        Row: {
          id: string
          academic_year_id: string
          name: string
          start_date: string
          end_date: string
          number: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          academic_year_id: string
          name: string
          start_date: string
          end_date: string
          number: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          academic_year_id?: string
          name?: string
          start_date?: string
          end_date?: string
          number?: number
          created_at?: string
          updated_at?: string
        }
      }
      academic_years: {
        Row: {
          id: string
          name: string
          start_date: string
          end_date: string
          is_current: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          start_date: string
          end_date: string
          is_current?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          start_date?: string
          end_date?: string
          is_current?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      subject_groups: {
        Row: {
          id: string
          subject_id: string
          group_code: string
          group_type: 'THEORY' | 'PRACTICE' | 'LABORATORY' | 'SEMINAR'
          max_students: number
          semester_id: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subject_id: string
          group_code: string
          group_type: 'THEORY' | 'PRACTICE' | 'LABORATORY' | 'SEMINAR'
          max_students: number
          semester_id: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subject_id?: string
          group_code?: string
          group_type?: 'THEORY' | 'PRACTICE' | 'LABORATORY' | 'SEMINAR'
          max_students?: number
          semester_id?: string
          created_at?: string
          updated_at?: string
        }
      }
      scheduling_conflicts: {
        Row: {
          id: string
          semester_id: string
          assignment1_id: string | null
          assignment2_id: string | null
          conflict_type: 'TEACHER' | 'CLASSROOM' | 'GROUP' | 'TIME_PREFERENCE'
          severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
          description: string
          resolved: boolean
          resolved_at: string | null
          resolved_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          semester_id: string
          assignment1_id?: string | null
          assignment2_id?: string | null
          conflict_type: 'TEACHER' | 'CLASSROOM' | 'GROUP' | 'TIME_PREFERENCE'
          severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
          description: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          semester_id?: string
          assignment1_id?: string | null
          assignment2_id?: string | null
          conflict_type?: 'TEACHER' | 'CLASSROOM' | 'GROUP' | 'TIME_PREFERENCE'
          severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
          description?: string
          resolved?: boolean
          resolved_at?: string | null
          resolved_by?: string | null
          created_at?: string
        }
      }
      classrooms: {
        Row: {
          id: string
          code: string
          name: string
          building: string | null
          floor: number | null
          capacity: number
          type: 'aula' | 'laboratori' | 'taller' | 'seminari' | 'informatica' | 'projectes' | 'teorica' | 'polivalent'
          equipment: any[]
          is_available: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          building?: string | null
          floor?: number | null
          capacity: number
          type: 'aula' | 'laboratori' | 'taller' | 'seminari' | 'informatica' | 'projectes' | 'teorica' | 'polivalent'
          equipment?: any[]
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          building?: string | null
          floor?: number | null
          capacity?: number
          type?: 'aula' | 'laboratori' | 'taller' | 'seminari' | 'informatica' | 'projectes' | 'teorica' | 'polivalent'
          equipment?: any[]
          is_available?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      subjects: {
        Row: {
          id: string
          code: string
          name: string
          credits: number
          year: number
          type: 'OBLIGATORIA' | 'OPTATIVA' | 'TFG'
          department: string | null
          description: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          code: string
          name: string
          credits: number
          year: number
          type: 'OBLIGATORIA' | 'OPTATIVA' | 'TFG'
          department?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          code?: string
          name?: string
          credits?: number
          year?: number
          type?: 'OBLIGATORIA' | 'OPTATIVA' | 'TFG'
          department?: string | null
          description?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      student_groups: {
        Row: {
          id: string
          name: string
          year: number
          shift: 'MORNING' | 'AFTERNOON'
          max_students: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          year: number
          shift: 'MORNING' | 'AFTERNOON'
          max_students: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          year?: number
          shift?: 'MORNING' | 'AFTERNOON'
          max_students?: number
          created_at?: string
          updated_at?: string
        }
      }
      teachers: {
        Row: {
          id: string
          user_id: string | null
          code: string
          first_name: string
          last_name: string
          email: string
          department: string | null
          contract_type: string | null
          max_hours: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          code: string
          first_name: string
          last_name: string
          email: string
          department?: string | null
          contract_type?: string | null
          max_hours?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          code?: string
          first_name?: string
          last_name?: string
          email?: string
          department?: string | null
          contract_type?: string | null
          max_hours?: number
          created_at?: string
          updated_at?: string
        }
      }
      time_slots: {
        Row: {
          id: string
          day_of_week: number
          start_time: string
          end_time: string
          slot_type: 'mati' | 'tarda'
          created_at: string
        }
        Insert: {
          id?: string
          day_of_week: number
          start_time: string
          end_time: string
          slot_type: 'mati' | 'tarda'
          created_at?: string
        }
        Update: {
          id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          slot_type?: 'mati' | 'tarda'
          created_at?: string
        }
      }
      audit_logs: {
        Row: {
          id: string
          user_id: string | null
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data: any | null
          new_data: any | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id?: string | null
          table_name: string
          record_id: string
          action: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data?: any | null
          new_data?: any | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string | null
          table_name?: string
          record_id?: string
          action?: 'INSERT' | 'UPDATE' | 'DELETE'
          old_data?: any | null
          new_data?: any | null
          created_at?: string
        }
      }
      subject_requirements: {
        Row: {
          id: string
          subject_id: string
          requirement_type: 'SOFTWARE' | 'CLASSROOM_TYPE' | 'EQUIPMENT' | 'CAPACITY'
          requirement_value: any
          priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          subject_id: string
          requirement_type: 'SOFTWARE' | 'CLASSROOM_TYPE' | 'EQUIPMENT' | 'CAPACITY'
          requirement_value: any
          priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          subject_id?: string
          requirement_type?: 'SOFTWARE' | 'CLASSROOM_TYPE' | 'EQUIPMENT' | 'CAPACITY'
          requirement_value?: any
          priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | null
          created_at?: string
          updated_at?: string
        }
      }
      schedule_slots: {
        Row: {
          id: string
          student_group_id: string
          subject_id: string
          day_of_week: number
          start_time: string
          end_time: string
          academic_year: string
          semester: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          student_group_id: string
          subject_id: string
          day_of_week: number
          start_time: string
          end_time: string
          academic_year?: string
          semester: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          student_group_id?: string
          subject_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          academic_year?: string
          semester?: number
          created_at?: string
          updated_at?: string
        }
      }
      schedule_slot_teachers: {
        Row: {
          schedule_slot_id: string
          teacher_id: string
        }
        Insert: {
          schedule_slot_id: string
          teacher_id: string
        }
        Update: {
          schedule_slot_id?: string
          teacher_id?: string
        }
      }
      schedule_slot_classrooms: {
        Row: {
          schedule_slot_id: string
          classroom_id: string
        }
        Insert: {
          schedule_slot_id: string
          classroom_id: string
        }
        Update: {
          schedule_slot_id?: string
          classroom_id?: string
        }
      }
    }
    Views: {
      teacher_workload: {
        Row: {
          id: string | null
          first_name: string | null
          last_name: string | null
          department: string | null
          max_hours: number | null
          total_ects: number | null
          courses_teaching: number | null
        }
      }
      classroom_subject_compatibility: {
        Row: {
          classroom_id: string | null
          classroom_name: string | null
          classroom_type: string | null
          building_id: string | null
          subject_id: string | null
          subject_name: string | null
          is_compatible: boolean | null
        }
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (Database["public"]["Tables"] & Database["public"]["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (Database["public"]["Tables"] &
      Database["public"]["Views"])
  ? (Database["public"]["Tables"] &
      Database["public"]["Views"])[PublicTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof Database["public"]["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof Database["public"]["Tables"]
  ? Database["public"]["Tables"][PublicTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof Database["public"]["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof Database["public"]["Enums"]
  ? Database["public"]["Enums"][PublicEnumNameOrOptions]
  : never