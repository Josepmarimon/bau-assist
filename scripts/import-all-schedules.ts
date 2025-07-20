import { importSchedule, ScheduleEntry, TEACHER_MAPPINGS, CLASSROOM_MAPPINGS } from './import-schedules-complete-mapping'

// Actualitzar mapeigs addicionals trobats durant l'anàlisi
const ADDITIONAL_TEACHER_MAPPINGS: Record<string, string> = {
  // 2n curs
  'Mª Isabel del Río': 'María Isabel del Río',
  'M. Isabel del Río': 'María Isabel del Río',
  'Laurà Subirats': 'Laurà Subirats',
  'Anna Moreno': 'Anna Moreno',
  'Mercedes Pimiento': 'Mercedes Pimiento',
  
  // Professors que poden aparèixer més endavant
  'Pierino Dal Pozzo': 'Pierino Dal Pozzo',
  'Cristòfol Rodríguez': 'Cristòfol Rodríguez',
  'Roc Albalat': 'Roc Albalat Gimeno',
  'Santiago Benítez': 'Santiago Benítez López',
  'Elida Pérez': 'Elida Pérez Marcos',
  'Laura Gual': 'Laura Gual Martínez',
  'Marina Gil': 'Marina Gil Aguilar',
  
  // Professors sense segon cognom
  'Anna Ferré': 'Anna Ferré Boltà',
  'Montse Casacuberta': 'Montse Casacuberta Suñer',
}

// Combinar mapeigs
Object.assign(TEACHER_MAPPINGS, ADDITIONAL_TEACHER_MAPPINGS)

// ============================================
// DISSENY 2n CURS
// ============================================

const schedules2nM1: ScheduleEntry[] = [
  // PRIMER SEMESTRE
  {
    groupName: '2n Matí M1',
    subjectName: 'Expressió Gràfica I',
    teachers: [],
    classrooms: [],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '2n Matí M1',
    subjectName: 'Iniciació als Projectes de Disseny I',
    teachers: [],
    classrooms: [],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '2n Matí M1',
    subjectName: 'Taller Tridimensional i d\'Investigació Artística',
    teachers: ['Mercedes Pimiento'],
    classrooms: ['GO.2'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '2n Matí M1',
    subjectName: 'Llenguatges Audiovisuals I',
    teachers: ['Nico Juárez'],
    classrooms: ['Sala Carolines'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '2n Matí M1',
    subjectName: 'Història del Disseny',
    teachers: ['Mª Isabel del Río'],
    classrooms: ['P1.9'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  // SEGON SEMESTRE
  {
    groupName: '2n Matí M1',
    subjectName: 'Expressió Gràfica II',
    teachers: [],
    classrooms: [],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '2n Matí M1',
    subjectName: 'Iniciació als Projectes de Disseny II',
    teachers: [],
    classrooms: [],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '2n Matí M1',
    subjectName: 'Taller de Creativitat',
    teachers: ['Anna Moreno'],
    classrooms: ['G1.3'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '2n Matí M1',
    subjectName: 'Llenguatges Audiovisuals II',
    teachers: ['Laurà Subirats'],
    classrooms: ['PO.5/O.7'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '2n Matí M1',
    subjectName: 'Economia, Empresa i Disseny',
    teachers: ['Blanca-Pia Fernández'],
    classrooms: ['P1.9'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  }
]

// Continuar amb tots els altres grups de 2n curs...
// M2, M3, M4, M5, M6, M7, M8, M9, T1, T2, T3, T4, T5, T6

const schedules2nM2: ScheduleEntry[] = [
  // Similar estructura per M2...
]

// ============================================
// DISSENY 3r CURS
// ============================================

const schedules3rM1: ScheduleEntry[] = [
  // Estructura per 3r curs...
]

// ============================================
// DISSENY 4t CURS
// ============================================

const schedules4tM1: ScheduleEntry[] = [
  // Estructura per 4t curs...
]

// ============================================
// BELLES ARTS 1r CURS
// ============================================

const schedulesBA1r: ScheduleEntry[] = [
  // Estructura per Belles Arts 1r...
]

// ============================================
// BELLES ARTS 2n CURS
// ============================================

const schedulesBA2n: ScheduleEntry[] = [
  // Estructura per Belles Arts 2n...
]

// ============================================
// BELLES ARTS 3r CURS
// ============================================

const schedulesBA3r: ScheduleEntry[] = [
  // Estructura per Belles Arts 3r...
]

// ============================================
// BELLES ARTS 4t CURS
// ============================================

const schedulesBA4t: ScheduleEntry[] = [
  // Estructura per Belles Arts 4t...
]

// ============================================
// FUNCIÓ PRINCIPAL D'IMPORTACIÓ
// ============================================

async function importAllSchedules() {
  console.log('🎓 IMPORTACIÓ MASSIVA D\'HORARIS')
  console.log('=====================================\n')

  // Agrupar tots els horaris per curs
  const courseGroups = [
    { name: 'DISSENY 2n CURS', schedules: [...schedules2nM1, ...schedules2nM2] },
    { name: 'DISSENY 3r CURS', schedules: [...schedules3rM1] },
    { name: 'DISSENY 4t CURS', schedules: [...schedules4tM1] },
    { name: 'BELLES ARTS 1r CURS', schedules: [...schedulesBA1r] },
    { name: 'BELLES ARTS 2n CURS', schedules: [...schedulesBA2n] },
    { name: 'BELLES ARTS 3r CURS', schedules: [...schedulesBA3r] },
    { name: 'BELLES ARTS 4t CURS', schedules: [...schedulesBA4t] }
  ]

  let totalSuccess = 0
  let totalErrors = 0

  for (const courseGroup of courseGroups) {
    if (courseGroup.schedules.length === 0) continue
    
    console.log(`\n📚 ${courseGroup.name}`)
    console.log('-----------------------------------')
    
    const { successCount, errorCount } = await importSchedule(courseGroup.schedules, false)
    totalSuccess += successCount
    totalErrors += errorCount
  }

  console.log('\n=====================================')
  console.log('✅ IMPORTACIÓ MASSIVA COMPLETADA')
  console.log(`📊 Total global: ${totalSuccess} èxits, ${totalErrors} errors`)
}

// Executar
importAllSchedules().catch(console.error)