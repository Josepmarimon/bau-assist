import { EquipmentCategory } from '@/types/equipment.types'
import * as Icons from 'lucide-react'

export const EQUIPMENT_CATEGORIES: Record<EquipmentCategory, {
  label: string
  icon: keyof typeof Icons
  color: string
}> = {
  audiovisual: {
    label: 'Audiovisual',
    icon: 'Monitor',
    color: 'blue'
  },
  computing: {
    label: 'Informàtica',
    icon: 'Laptop',
    color: 'purple'
  },
  furniture: {
    label: 'Mobiliari',
    icon: 'Armchair',
    color: 'green'
  },
  climate: {
    label: 'Climatització',
    icon: 'Wind',
    color: 'cyan'
  },
  office: {
    label: 'Oficina',
    icon: 'Briefcase',
    color: 'orange'
  }
}

export const EQUIPMENT_STATUS = {
  operational: {
    label: 'Operatiu',
    icon: 'CheckCircle',
    color: 'green'
  },
  maintenance: {
    label: 'Manteniment',
    icon: 'Wrench',
    color: 'yellow'
  },
  broken: {
    label: 'Avariat',
    icon: 'XCircle',
    color: 'red'
  }
} as const

export const EQUIPMENT_ICONS: Record<string, keyof typeof Icons> = {
  smarttv: 'Monitor',
  projector: 'Projector',
  speakers_pro: 'Speaker',
  speakers_lofi: 'Speaker',
  subwoofer: 'Speaker',
  computer_teacher: 'Monitor',
  cabinet: 'Package',
  air_conditioning: 'Wind',
  scanner: 'Scan',
  printer: 'Printer',
  table: 'Square',
  table_type: 'Square',
  chair: 'Armchair',
  chair_type: 'Armchair'
}