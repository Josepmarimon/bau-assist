import { Database } from './database.types'

export type SubjectGroupProfile = Database['public']['Tables']['subject_group_profiles']['Row']
export type SubjectGroupProfileInsert = Database['public']['Tables']['subject_group_profiles']['Insert']
export type SubjectGroupProfileUpdate = Database['public']['Tables']['subject_group_profiles']['Update']

export type SubjectGroupProfileMember = Database['public']['Tables']['subject_group_profile_members']['Row']
export type SubjectGroupProfileMemberInsert = Database['public']['Tables']['subject_group_profile_members']['Insert']
export type SubjectGroupProfileMemberUpdate = Database['public']['Tables']['subject_group_profile_members']['Update']

export type SubjectGroupProfileSoftware = Database['public']['Tables']['subject_group_profile_software']['Row']
export type SubjectGroupProfileSoftwareInsert = Database['public']['Tables']['subject_group_profile_software']['Insert']
export type SubjectGroupProfileSoftwareUpdate = Database['public']['Tables']['subject_group_profile_software']['Update']

// TODO: Add these types when subject_group_profile_equipment table is added to database
export type SubjectGroupProfileEquipment = {
  id: string
  profile_id: string
  equipment_type_id: string
  quantity_required: number
  is_required: boolean
  created_at: string
}
export type SubjectGroupProfileEquipmentInsert = {
  id?: string
  profile_id: string
  equipment_type_id: string
  quantity_required: number
  is_required: boolean
  created_at?: string
}
export type SubjectGroupProfileEquipmentUpdate = {
  id?: string
  profile_id?: string
  equipment_type_id?: string
  quantity_required?: number
  is_required?: boolean
  created_at?: string
}

// Extended types with relations
export type SubjectGroupProfileWithRelations = SubjectGroupProfile & {
  subject?: Database['public']['Tables']['subjects']['Row']
  members?: (SubjectGroupProfileMember & {
    subject_group?: Database['public']['Tables']['subject_groups']['Row']
  })[]
  software?: (SubjectGroupProfileSoftware & {
    software?: {
      id: string
      name: string
      version?: string | null
      category?: string | null
      license_type?: string | null
    }
  })[]
  equipment?: (SubjectGroupProfileEquipment & {
    equipment_type?: {
      id: string
      name: string
      description?: string | null
      category?: string | null
    }
  })[]
}

export type SubjectGroupProfileFormData = {
  name: string
  description?: string
  subject_id: string
  member_group_ids: string[]
  software_requirements: {
    software_id: string
    is_required: boolean
  }[]
  equipment_requirements: {
    equipment_type_id: string
    quantity_required: number
    is_required: boolean
  }[]
}