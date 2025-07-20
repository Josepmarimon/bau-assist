import { importSchedule, ScheduleEntry } from './import-schedules-complete-mapping'

// ============================================
// IMPORTACIÓ MASSIVA DE TOTS ELS CURSOS RESTANTS
// ============================================

// Afegir professors addicionals al mapeig
const additionalMappings = {
  'Mª Isabel del Río': 'María Isabel del Río Sánchez',
  'M. Isabel del Río': 'María Isabel del Río Sánchez',
  'Laurà Subirats': 'Laura Subirats Berenguer',
  'Laura Subirats': 'Laura Subirats Berenguer',
  'Nataly dal Pozzo': 'Nataly Dal Pozzo Montrucchio',
  'Mercedes Pimiento': 'Mercedes Pimiento García',
  'Anna Moreno': 'Anna Moreno Bedmar',
  'Jaume Ferrete Vázquez': 'Jaume Ferrete Vázquez',
  'Marta Velasco': 'Marta Velasco Velasco',
  'Rebecca Gil': 'Rebecca Gil López',
  'Ester Xargay': 'Ester Xargay Torres',
  'Lluc Massaguer': 'Lluc Massaguer Busquets',
  'Santiago Benítez': 'Santiago Benítez López',
  'Elida Pérez': 'Elida Pérez Marcos',
  'Cristòfol Rodríguez': 'Cristòfol Rodríguez Martín',
  'Oriol Rodríguez': 'Oriol Rodríguez Vives',
  'Anna Clemente': 'Anna Clemente Palau',
  'Pierino del Pozzo': 'Pierino Dal Pozzo',
  'Pierino dal Pozzo': 'Pierino Dal Pozzo',
  'Josep M. Marimon': 'Josep Mª Marimon Soler',
  'Josep M.Marimon': 'Josep Mª Marimon Soler'
}

// DISSENY 2n CURS - RESTA DE GRUPS (M3-M9, T1-T6)
const schedulesDisseny2nRest: ScheduleEntry[] = [
  // Processaré les imatges restants i afegiré aquí tots els horaris
  // M3, M4, M5, M6, M7, M8, M9
  // T1, T2, T3, T4, T5, T6
]

// DISSENY 3r CURS - TOTS ELS GRUPS
const schedulesDisseny3r: ScheduleEntry[] = [
  // Processaré les imatges i afegiré aquí tots els horaris
  // M1, M2, M3, M4, M5
  // T1, T2, T3, T4
]

// DISSENY 4t CURS - TOTS ELS GRUPS
const schedulesDisseny4t: ScheduleEntry[] = [
  // Processaré les imatges i afegiré aquí tots els horaris
  // M1, M2, M3, M4, M5
  // T1, T2, T3
]

// BELLES ARTS - TOTS ELS CURSOS
const schedulesBellesArts1r: ScheduleEntry[] = [
  // 1r curs Belles Arts
]

const schedulesBellesArts2n: ScheduleEntry[] = [
  // 2n curs Belles Arts
]

const schedulesBellesArts3r: ScheduleEntry[] = [
  // 3r curs Belles Arts
]

const schedulesBellesArts4t: ScheduleEntry[] = [
  // 4t curs Belles Arts
]

// FUNCIÓ PRINCIPAL
async function importAllRemainingSchedules() {
  console.log('🎓 IMPORTACIÓ MASSIVA DE TOTS ELS CURSOS RESTANTS')
  console.log('================================================\n')
  
  // Per ara, crear grups de Belles Arts si no existeixen
  const bellesArtsGroups = [
    // 1r curs
    { name: '1r BA Matí', year: 1, shift: 'mati', max_students: 60 },
    { name: '1r BA Tarda', year: 1, shift: 'tarda', max_students: 60 },
    // 2n curs
    { name: '2n BA Matí', year: 2, shift: 'mati', max_students: 60 },
    { name: '2n BA Tarda', year: 2, shift: 'tarda', max_students: 60 },
    // 3r curs
    { name: '3r BA Matí', year: 3, shift: 'mati', max_students: 60 },
    { name: '3r BA Tarda', year: 3, shift: 'tarda', max_students: 60 },
    // 4t curs
    { name: '4t BA Matí', year: 4, shift: 'mati', max_students: 60 },
    { name: '4t BA Tarda', year: 4, shift: 'tarda', max_students: 60 }
  ]
  
  // Combinar tots els horaris
  const allSchedules = [
    ...schedulesDisseny2nRest,
    ...schedulesDisseny3r,
    ...schedulesDisseny4t,
    ...schedulesBellesArts1r,
    ...schedulesBellesArts2n,
    ...schedulesBellesArts3r,
    ...schedulesBellesArts4t
  ]
  
  if (allSchedules.length === 0) {
    console.log('⚠️  No hi ha horaris per importar encara')
    console.log('Cal processar les imatges restants primer')
    return
  }
  
  const { successCount, errorCount } = await importSchedule(allSchedules, false)
  
  console.log('\n================================================')
  console.log('✅ IMPORTACIÓ COMPLETADA')
  console.log(`📊 Resum final: ${successCount} èxits, ${errorCount} errors`)
}

// Executar
importAllRemainingSchedules().catch(console.error)