export type EquipmentCategory = 'audiovisual' | 'computing' | 'furniture' | 'climate' | 'office'
export type EquipmentStatus = 'operational' | 'maintenance' | 'broken'

export interface EquipmentType {
  id: string
  code: string
  name: string
  category: EquipmentCategory
  icon?: string
  description?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EquipmentInventory {
  id: string
  equipment_type_id: string
  classroom_id: string
  quantity: number
  status: EquipmentStatus
  serial_number?: string
  purchase_date?: string
  notes?: string
  created_at: string
  updated_at: string
  equipment_type?: EquipmentType
}

export interface EquipmentWithType extends EquipmentInventory {
  equipment_type: EquipmentType
}

export interface ClassroomEquipment {
  classroom_id: string
  equipment: EquipmentWithType[]
}