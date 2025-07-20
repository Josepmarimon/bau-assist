import { importSchedule, ScheduleEntry } from './import-schedules-complete-mapping'

// ============================================
// IMPORTACIÓ COMPLETA DE TOTS ELS HORARIS
// ============================================

// DISSENY 2n CURS - TOTS ELS GRUPS
const schedulesDisseny2n: ScheduleEntry[] = [
  // M1 - PRIMER SEMESTRE
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
  // M1 - SEGON SEMESTRE
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
  },
  
  // M2 - PRIMER SEMESTRE
  {
    groupName: '2n Matí M2',
    subjectName: 'Història del Disseny',
    teachers: ['Nataly dal Pozzo'],
    classrooms: ['P1.16'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '2n Matí M2',
    subjectName: 'Expressió Gràfica I',
    teachers: [],
    classrooms: [],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '2n Matí M2',
    subjectName: 'Iniciació als Projectes de Disseny I',
    teachers: [],
    classrooms: [],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '2n Matí M2',
    subjectName: 'Taller Tridimensional i d\'Investigació Artística',
    teachers: ['Jaume Ferrete Vázquez'],
    classrooms: ['G1.3'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '2n Matí M2',
    subjectName: 'Llenguatges Audiovisuals I',
    teachers: ['Laura Subirats'],
    classrooms: ['P1.5'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  // M2 - SEGON SEMESTRE
  {
    groupName: '2n Matí M2',
    subjectName: 'Economia, Empresa i Disseny',
    teachers: ['Santiago Benítez'],
    classrooms: ['P1.16'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '2n Matí M2',
    subjectName: 'Expressió Gràfica II',
    teachers: [],
    classrooms: [],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '2n Matí M2',
    subjectName: 'Iniciació als Projectes de Disseny II',
    teachers: [],
    classrooms: [],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '2n Matí M2',
    subjectName: 'Taller de Creativitat',
    teachers: ['Marta Velasco'],
    classrooms: ['GO.2'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '2n Matí M2',
    subjectName: 'Llenguatges Audiovisuals II',
    teachers: ['Rebecca Gil'],
    classrooms: ['LO.2'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  }
]

// DISSENY 3r CURS
const schedulesDisseny3r: ScheduleEntry[] = [
  // Aquí afegiré els horaris de 3r curs després de processar les imatges
]

// DISSENY 4t CURS
const schedulesDisseny4t: ScheduleEntry[] = [
  // Aquí afegiré els horaris de 4t curs després de processar les imatges
]

// BELLES ARTS - TOTS ELS CURSOS
const schedulesBellesArts: ScheduleEntry[] = [
  // Aquí afegiré els horaris de Belles Arts després de processar les imatges
]

// FUNCIÓ PRINCIPAL D'IMPORTACIÓ
async function importAllSchedulesFinal() {
  console.log('🎓 IMPORTACIÓ FINAL DE TOTS ELS HORARIS')
  console.log('=======================================\n')
  
  // Combinar tots els horaris
  const allSchedules = [
    ...schedulesDisseny2n,
    ...schedulesDisseny3r,
    ...schedulesDisseny4t,
    ...schedulesBellesArts
  ]
  
  console.log(`📊 Total d'horaris a importar: ${allSchedules.length}`)
  console.log('Començant importació...\n')
  
  const { successCount, errorCount } = await importSchedule(allSchedules, false)
  
  console.log('\n=======================================')
  console.log('✅ IMPORTACIÓ COMPLETADA')
  console.log(`📊 Resum final: ${successCount} èxits, ${errorCount} errors`)
  
  // Mostrar estadístiques per curs
  const disseny2nCount = schedulesDisseny2n.length
  const disseny3rCount = schedulesDisseny3r.length
  const disseny4tCount = schedulesDisseny4t.length
  const bellesArtsCount = schedulesBellesArts.length
  
  console.log('\n📈 Estadístiques per curs:')
  console.log(`   - Disseny 2n: ${disseny2nCount} slots`)
  console.log(`   - Disseny 3r: ${disseny3rCount} slots`)
  console.log(`   - Disseny 4t: ${disseny4tCount} slots`)
  console.log(`   - Belles Arts: ${bellesArtsCount} slots`)
}

// Executar
importAllSchedulesFinal().catch(console.error)