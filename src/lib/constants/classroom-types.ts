export const CLASSROOM_TYPES = {
  TALLER: 'Taller',
  INFORMATICA: 'Informàtica',
  POLIVALENT: 'Polivalent',
  PROJECTES: 'Projectes',
  SEMINARI: 'Seminari'
} as const

export type ClassroomType = typeof CLASSROOM_TYPES[keyof typeof CLASSROOM_TYPES]

export const CLASSROOM_TYPE_LABELS: Record<ClassroomType, string> = {
  [CLASSROOM_TYPES.TALLER]: 'Taller',
  [CLASSROOM_TYPES.INFORMATICA]: 'Informàtica',
  [CLASSROOM_TYPES.POLIVALENT]: 'Polivalent',
  [CLASSROOM_TYPES.PROJECTES]: 'Projectes',
  [CLASSROOM_TYPES.SEMINARI]: 'Seminari'
}