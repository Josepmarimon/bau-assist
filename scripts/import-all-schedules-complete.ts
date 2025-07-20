import { importSchedule, ScheduleEntry } from './import-schedules-complete-mapping'

// ============================================
// IMPORTACIÓ COMPLETA DE TOTS ELS HORARIS
// ============================================

// DISSENY 2n CURS - GRUPS M3-M5, T1-T2, especials
const schedulesDisseny2n: ScheduleEntry[] = [
  // M3 - PRIMER SEMESTRE
  {
    groupName: '2n Matí M3',
    subjectName: 'Expressió Gràfica I',
    teachers: ['David Martin'],
    classrooms: ['PO.2/O.4'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '2n Matí M3',
    subjectName: 'Iniciació als Projectes de Disseny I',
    teachers: ['Mariona Garcia'],
    classrooms: ['PO.12'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '2n Matí M3',
    subjectName: 'Llenguatges Audiovisuals I',
    teachers: ['Nico Juárez'],
    classrooms: ['L1.2'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '2n Matí M3',
    subjectName: 'Taller Tridimensional i d\'Investigació Artística',
    teachers: ['Mercedes Pimiento'],
    classrooms: ['GO.2'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '2n Matí M3',
    subjectName: 'Economia, Empresa i Disseny',
    teachers: ['Mariana Morcurill'],
    classrooms: ['P1.7'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  // M3 - SEGON SEMESTRE
  {
    groupName: '2n Matí M3',
    subjectName: 'Expressió Gràfica II',
    teachers: ['David Martin'],
    classrooms: ['PO.2/O.4'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '2n Matí M3',
    subjectName: 'Iniciació als Projectes de Disseny II',
    teachers: ['Mariona Garcia'],
    classrooms: ['PO.12'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '2n Matí M3',
    subjectName: 'Llenguatges Audiovisuals II',
    teachers: ['Serafín Álvarez'],
    classrooms: ['PO.2/O.4'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '2n Matí M3',
    subjectName: 'Taller de Creativitat',
    teachers: ['Camila Maggi'],
    classrooms: ['G1.3'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '2n Matí M3',
    subjectName: 'Història del Disseny',
    teachers: ['Sílvia Rosés'],
    classrooms: ['PO.10'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },

  // M4 - PRIMER SEMESTRE
  {
    groupName: '2n Matí M4',
    subjectName: 'Expressió Gràfica I',
    teachers: ['David Martin'],
    classrooms: ['PO.2/O.4'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '2n Matí M4',
    subjectName: 'Iniciació als Projectes de Disseny I',
    teachers: ['Mariona Garcia'],
    classrooms: ['PO.12'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '2n Matí M4',
    subjectName: 'Llenguatges Audiovisuals I',
    teachers: ['Serafín Álvarez', 'Laura Subirats'],
    classrooms: ['PO.2/O.4'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '2n Matí M4',
    subjectName: 'Taller Tridimensional i d\'Investigació Artística',
    teachers: ['Mario Santamaría'],
    classrooms: ['G1.3'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '2n Matí M4',
    subjectName: 'Economia, Empresa i Disseny',
    teachers: ['Blanca-Pia Fernández'],
    classrooms: ['PO.8'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  // M4 - SEGON SEMESTRE
  {
    groupName: '2n Matí M4',
    subjectName: 'Expressió Gràfica II',
    teachers: ['David Martin'],
    classrooms: ['PO.2/O.4'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '2n Matí M4',
    subjectName: 'Iniciació als Projectes de Disseny II',
    teachers: ['Mariona Garcia'],
    classrooms: ['PO.12'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '2n Matí M4',
    subjectName: 'Llenguatges Audiovisuals II',
    teachers: ['Irena Visa'],
    classrooms: ['L1.2'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '2n Matí M4',
    subjectName: 'Taller de Creativitat',
    teachers: ['Anna Moreno'],
    classrooms: ['GO.2'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '2n Matí M4',
    subjectName: 'Història del Disseny',
    teachers: ['Nataly dal Pozzo'],
    classrooms: ['PO.8'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },

  // M5 - PRIMER SEMESTRE
  {
    groupName: '2n Matí M5',
    subjectName: 'Expressió Gràfica I',
    teachers: ['David Martin'],
    classrooms: ['PO.2/O.4'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '2n Matí M5',
    subjectName: 'Iniciació als Projectes de Disseny I',
    teachers: ['Mariona Garcia'],
    classrooms: ['PO.12'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '2n Matí M5',
    subjectName: 'Economia, Empresa i Disseny',
    teachers: ['Blanca-Pia Fernández'],
    classrooms: ['PO.6'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '2n Matí M5',
    subjectName: 'Llenguatges Audiovisuals I',
    teachers: ['Daniel Pitarch'],
    classrooms: ['L1.2'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '2n Matí M5',
    subjectName: 'Taller Tridimensional i d\'Investigació Artística',
    teachers: ['Mercedes Pimiento'],
    classrooms: ['GO.1'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  // M5 - SEGON SEMESTRE
  {
    groupName: '2n Matí M5',
    subjectName: 'Expressió Gràfica II',
    teachers: ['David Martin'],
    classrooms: ['PO.2/O.4'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '2n Matí M5',
    subjectName: 'Iniciació als Projectes de Disseny II',
    teachers: ['Mariona Garcia'],
    classrooms: ['PO.12'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '2n Matí M5',
    subjectName: 'Història del Disseny',
    teachers: ['Nataly dal Pozzo'],
    classrooms: ['P1.7'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '2n Matí M5',
    subjectName: 'Llenguatges Audiovisuals II',
    teachers: ['Aina Roca'],
    classrooms: ['L1.2'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '2n Matí M5',
    subjectName: 'Taller de Creativitat',
    teachers: ['Laura Subirats'],
    classrooms: ['G1.3'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },

  // T1 - PRIMER SEMESTRE
  {
    groupName: '2n Tarda T1',
    subjectName: 'Taller Tridimensional i d\'Investigació Artística',
    teachers: ['Mario Santamaría'],
    classrooms: ['G2.2'],
    dayOfWeek: 1,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Llenguatges Audiovisuals I',
    teachers: ['Irena Visa'],
    classrooms: ['L1.2'],
    dayOfWeek: 2,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Expressió Gràfica I',
    teachers: ['David Martin'],
    classrooms: ['PO.2/O.4'],
    dayOfWeek: 3,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Iniciació als Projectes de Disseny I',
    teachers: ['Mariona Garcia'],
    classrooms: ['PO.12'],
    dayOfWeek: 4,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Economia, Empresa i Disseny',
    teachers: ['Blanca-Pia Fernández'],
    classrooms: ['P1.9'],
    dayOfWeek: 5,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  // T1 - SEGON SEMESTRE
  {
    groupName: '2n Tarda T1',
    subjectName: 'Taller de Creativitat',
    teachers: ['Camila Maggi'],
    classrooms: ['G1.3'],
    dayOfWeek: 1,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Història del Disseny',
    teachers: ['Mª Isabel del Río'],
    classrooms: ['PO.6'],
    dayOfWeek: 2,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Expressió Gràfica II',
    teachers: ['David Martin'],
    classrooms: ['PO.2/O.4'],
    dayOfWeek: 3,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Iniciació als Projectes de Disseny II',
    teachers: ['Mariona Garcia'],
    classrooms: ['PO.12'],
    dayOfWeek: 4,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  },
  {
    groupName: '2n Tarda T1',
    subjectName: 'Llenguatges Audiovisuals II',
    teachers: ['Laura Subirats'],
    classrooms: ['P1.5'],
    dayOfWeek: 5,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  },

  // T2 - PRIMER SEMESTRE
  {
    groupName: '2n Tarda T2',
    subjectName: 'Taller Tridimensional i d\'Investigació Artística',
    teachers: ['Jaume Ferrete Vázquez'],
    classrooms: ['G1.3'],
    dayOfWeek: 1,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Història del Disseny',
    teachers: ['Mª Isabel del Río'],
    classrooms: ['PO.6'],
    dayOfWeek: 2,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Expressió Gràfica I',
    teachers: ['David Martin'],
    classrooms: ['PO.2/O.4'],
    dayOfWeek: 3,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Iniciació als Projectes de Disseny I',
    teachers: ['Mariona Garcia'],
    classrooms: ['PO.12'],
    dayOfWeek: 4,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Llenguatges Audiovisuals I',
    teachers: ['Irena Visa'],
    classrooms: ['P1.5'],
    dayOfWeek: 5,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  // T2 - SEGON SEMESTRE
  {
    groupName: '2n Tarda T2',
    subjectName: 'Taller de Creativitat',
    teachers: ['Marta Velasco'],
    classrooms: ['G2.2'],
    dayOfWeek: 1,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Llenguatges Audiovisuals II',
    teachers: ['Serafín Álvarez'],
    classrooms: ['PO.5/O.7'],
    dayOfWeek: 2,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Expressió Gràfica II',
    teachers: ['David Martin'],
    classrooms: ['PO.2/O.4'],
    dayOfWeek: 3,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Iniciació als Projectes de Disseny II',
    teachers: ['Mariona Garcia'],
    classrooms: ['PO.12'],
    dayOfWeek: 4,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  },
  {
    groupName: '2n Tarda T2',
    subjectName: 'Economia, Empresa i Disseny',
    teachers: ['Blanca-Pia Fernández'],
    classrooms: ['P1.9'],
    dayOfWeek: 5,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  }
]

// DISSENY 3r CURS
const schedulesDisseny3r: ScheduleEntry[] = [
  // Gm1 - Gràfic i Comunicació Visual - PRIMER SEMESTRE
  {
    groupName: '3r Matí Gm1',
    subjectName: 'Projectes de Disseny Gràfic i Comunicació Visual I',
    teachers: ['Laura Ginés'],
    classrooms: ['P1.5'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '3r Matí Gm1',
    subjectName: 'Projectes de Disseny Gràfic i Comunicació Visual I',
    teachers: ['Mariona Garcia'],
    classrooms: ['P0.11'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '3r Matí Gm1',
    subjectName: 'Projectes de Disseny Gràfic i Comunicació Visual I',
    teachers: ['Manel Olle'],
    classrooms: ['P1.8'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '3r Matí Gm1',
    subjectName: 'Ecoedició',
    teachers: ['Ferran Mitjeva'],
    classrooms: ['L0.4'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '3r Matí Gm1',
    subjectName: 'Editorial',
    teachers: ['Laura Solsona'],
    classrooms: ['P1.2'],
    dayOfWeek: 4,
    startTime: '11:30',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '3r Matí Gm1',
    subjectName: 'Optativitat',
    teachers: [],
    classrooms: [],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '3r Matí Gm1',
    subjectName: 'Optativitat',
    teachers: [],
    classrooms: [],
    dayOfWeek: 5,
    startTime: '11:30',
    endTime: '13:30',
    semester: 1
  },
  // Gm1 - SEGON SEMESTRE
  {
    groupName: '3r Matí Gm1',
    subjectName: 'Projectes de Disseny Gràfic i Comunicació Visual II',
    teachers: ['Laura Ginés'],
    classrooms: ['P1.5'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '3r Matí Gm1',
    subjectName: 'Projectes de Disseny Gràfic i Comunicació Visual II',
    teachers: ['Mariona Garcia'],
    classrooms: ['P0.11'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '3r Matí Gm1',
    subjectName: 'Projectes de Disseny Gràfic i Comunicació Visual II',
    teachers: ['Manel Olle'],
    classrooms: ['P1.8'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '3r Matí Gm1',
    subjectName: 'Experimental Type',
    teachers: ['Íngrid Pardo Porta'],
    classrooms: ['P1.8'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '3r Matí Gm1',
    subjectName: 'Direcció d\'Art',
    teachers: ['Sofia Esteve'],
    classrooms: ['P1.2'],
    dayOfWeek: 4,
    startTime: '11:30',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '3r Matí Gm1',
    subjectName: 'Optativitat',
    teachers: [],
    classrooms: [],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '3r Matí Gm1',
    subjectName: 'Optativitat',
    teachers: [],
    classrooms: [],
    dayOfWeek: 5,
    startTime: '11:30',
    endTime: '13:30',
    semester: 2
  }
]

// DISSENY 4t CURS
const schedulesDisseny4t: ScheduleEntry[] = [
  // Gm1 - Gràfic i Comunicació Visual - PRIMER SEMESTRE
  {
    groupName: '4t Matí Gm1',
    subjectName: 'Projectes de Disseny Gràfic i Comunicació Visual III',
    teachers: ['Sofia Esteve'],
    classrooms: ['P1.8'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '4t Matí Gm1',
    subjectName: 'Projectes de Disseny Gràfic i Comunicació Visual III',
    teachers: ['Guillem Casadó'],
    classrooms: ['P0.12'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '4t Matí Gm1',
    subjectName: 'Projectes de Disseny Gràfic i Comunicació Visual III',
    teachers: ['David Martin'],
    classrooms: ['P0.5/0.7'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '4t Matí Gm1',
    subjectName: 'Packaging',
    teachers: ['Marta Malé-Alemany'],
    classrooms: ['P1.2'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '4t Matí Gm1',
    subjectName: 'Disseny d\'Identitat Visual',
    teachers: ['Sofia Esteve'],
    classrooms: ['P1.5'],
    dayOfWeek: 4,
    startTime: '11:30',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '4t Matí Gm1',
    subjectName: 'Optativitat',
    teachers: [],
    classrooms: [],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '4t Matí Gm1',
    subjectName: 'Optativitat',
    teachers: [],
    classrooms: [],
    dayOfWeek: 5,
    startTime: '11:30',
    endTime: '13:30',
    semester: 1
  },
  // Gm1 - SEGON SEMESTRE
  {
    groupName: '4t Matí Gm1',
    subjectName: 'Projectes de Disseny Gràfic i Comunicació Visual IV',
    teachers: ['Sofia Esteve'],
    classrooms: ['P1.8'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '4t Matí Gm1',
    subjectName: 'Projectes de Disseny Gràfic i Comunicació Visual IV',
    teachers: ['Guillem Casadó'],
    classrooms: ['P0.12'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '4t Matí Gm1',
    subjectName: 'Treball Final de Grau',
    teachers: ['David Martin', 'Marta Camps', 'Blanca'],
    classrooms: ['P0.5/0.7'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '4t Matí Gm1',
    subjectName: 'Metodologies del Disseny',
    teachers: ['Marta Camps'],
    classrooms: ['P1.7'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '4t Matí Gm1',
    subjectName: 'Optativitat',
    teachers: [],
    classrooms: [],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '4t Matí Gm1',
    subjectName: 'Optativitat',
    teachers: [],
    classrooms: [],
    dayOfWeek: 5,
    startTime: '11:30',
    endTime: '13:30',
    semester: 2
  }
]

// BELLES ARTS - TOTS ELS CURSOS
const schedulesBellesArts: ScheduleEntry[] = [
  // 1r CURS - M1 - PRIMER SEMESTRE
  {
    groupName: '1r BA Matí M1',
    subjectName: '2D. Llenguatges, Tècniques i Tecnologies',
    teachers: ['Rebecca Gil', 'Rasmus Nilausen'],
    classrooms: ['G1.2'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '1r BA Matí M1',
    subjectName: 'Visualisation and Documentation Workshop',
    teachers: ['David Ortiz', 'Irene Visa'],
    classrooms: ['LO.2'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '1r BA Matí M1',
    subjectName: '4D. Llenguatges, Tècniques i Tecnologies',
    teachers: ['Serafín Álvarez', 'Ariadna Guiteras'],
    classrooms: ['Sala Carolines'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '1r BA Matí M1',
    subjectName: 'Taller de Dibuix I',
    teachers: ['Oriol Vilapuig'],
    classrooms: ['LO.1'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '1r BA Matí M1',
    subjectName: 'Pensament Modern i Pràctiques Artístiques',
    teachers: ['Federica Matelli'],
    classrooms: ['PO.6'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  // 1r CURS - M1 - SEGON SEMESTRE
  {
    groupName: '1r BA Matí M1',
    subjectName: 'Taller de Dibuix II',
    teachers: ['Núria Inés Hernández', 'Jonathan Millán'],
    classrooms: ['G1.2'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '1r BA Matí M1',
    subjectName: '3D. Llenguatges, Tècniques i Tecnologies',
    teachers: ['Ludovica Carbotta', 'Julieta Dentone'],
    classrooms: ['GO.3'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '1r BA Matí M1',
    subjectName: 'Estètica',
    teachers: ['Alejandra López Gabrielidis'],
    classrooms: ['PO.6'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '1r BA Matí M1',
    subjectName: 'Art, Institució i Mercat',
    teachers: ['Mariona Moncunill'],
    classrooms: ['PO.2/G4'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '1r BA Matí M1',
    subjectName: 'Laboratori de Processos i Projectes I',
    teachers: ['Lúa Coderch'],
    classrooms: ['GO.2'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },

  // 2n CURS - M1 - PRIMER SEMESTRE
  {
    groupName: '2n BA Matí M1',
    subjectName: '4D. Llenguatges, Tècniques i Tecnologies Instal·lades',
    teachers: ['Jaume Ferrete Vázquez', 'Agustín Ortiz Herrera'],
    classrooms: ['Sala Carolines'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '2n BA Matí M1',
    subjectName: '2D. Llenguatges, Tècniques i Tecnologies Instal·lades',
    teachers: ['Regina Gimenez', 'Anna Clemente'],
    classrooms: ['G1.2'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '2n BA Matí M1',
    subjectName: 'Laboratori de Processos i Projectes II',
    teachers: ['Pep Vidal'],
    classrooms: ['G2.1'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '2n BA Matí M1',
    subjectName: 'Pensament Contemporani i Pràctiques Crítiques',
    teachers: ['Núria Gómez Gabriel'],
    classrooms: ['PO.8'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '2n BA Matí M1',
    subjectName: 'Writing and Communication Workshop',
    teachers: ['Eulàlia Rovira', 'Michael Lawton'],
    classrooms: ['G1.3'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  // 2n CURS - M1 - SEGON SEMESTRE
  {
    groupName: '2n BA Matí M1',
    subjectName: 'Antropologia',
    teachers: ['Mafe Moscoso'],
    classrooms: ['PO.10'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '2n BA Matí M1',
    subjectName: 'Laboratori de Processos i Projectes III',
    teachers: ['Luz Broto'],
    classrooms: ['G1.3'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '2n BA Matí M1',
    subjectName: 'XD. Llenguatges, Tècniques i Tecnologies',
    teachers: ['Daniel Pitarch', 'Paula Bruno'],
    classrooms: ['G2.1'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '2n BA Matí M1',
    subjectName: 'Art, Activisme, Mediació i Pedagogia',
    teachers: ['Quim Packard'],
    classrooms: ['P1.5'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '2n BA Matí M1',
    subjectName: '3D. Llenguatges, Tècniques i Tecnologies Instal·lades',
    teachers: ['Lara Fluxà', 'Mercedes Pimiento'],
    classrooms: ['GO.3'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },

  // 3r CURS - M1 - PRIMER SEMESTRE
  {
    groupName: '3r BA Matí M1',
    subjectName: 'Pràctiques Artístiques i Recerca',
    teachers: ['Jaron Rowan', 'Silvia Zayas'],
    classrooms: ['G2.1'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '3r BA Matí M1',
    subjectName: 'Laboratori de Processos i Projectes IV',
    teachers: ['Irene Visa'],
    classrooms: ['G.2.2'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  // 3r CURS - M1 - SEGON SEMESTRE
  {
    groupName: '3r BA Matí M1',
    subjectName: 'Laboratori de Processos i Projectes V',
    teachers: ['Serafín Álvarez'],
    classrooms: ['LO.1'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '3r BA Matí M1',
    subjectName: 'Art Practices in Context Seminar I',
    teachers: ['Anna Moreno'],
    classrooms: ['GO.1'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  },

  // 4t CURS - M1 - PRIMER SEMESTRE
  {
    groupName: '4t BA Matí M1',
    subjectName: 'Art Practices in Context Seminar II',
    teachers: ['Federica Matelli'],
    classrooms: ['PO.6'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '4t BA Matí M1',
    subjectName: 'Laboratori de Processos i Projectes VI',
    teachers: ['Lúa Coderch'],
    classrooms: ['G2.2'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '4t BA Matí M1',
    subjectName: 'Metodologies Transdisciplinàries i Experimentals',
    teachers: [],
    classrooms: ['PO.1'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  // 4t CURS - M1 - SEGON SEMESTRE
  {
    groupName: '4t BA Matí M1',
    subjectName: 'Treball Final de Grau',
    teachers: ['Lúa Coderch', 'Anna Moreno', 'Michael Lawton'],
    classrooms: ['G1.2'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  }
]

// FUNCIÓ PRINCIPAL D'IMPORTACIÓ
async function importAllSchedulesComplete() {
  console.log('🎓 IMPORTACIÓ COMPLETA DE TOTS ELS HORARIS')
  console.log('==========================================\n')
  
  // Primer crear els grups de Belles Arts si cal
  console.log('🎨 Creant grups de Belles Arts...')
  const { exec } = await import('child_process')
  const { promisify } = await import('util')
  const execPromise = promisify(exec)
  
  try {
    await execPromise('ts-node scripts/create-fine-arts-groups.ts')
    console.log('✅ Grups de Belles Arts creats o ja existeixen\n')
  } catch (error) {
    console.error('⚠️  Error creant grups de Belles Arts:', error)
  }
  
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
  
  console.log('\n==========================================')
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
importAllSchedulesComplete().catch(console.error)