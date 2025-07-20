import { importSchedule, ScheduleEntry } from './import-schedules-complete-mapping'

// DISSENY 1r CURS - TOTS ELS GRUPS

// Grup M1 (ja fet però el repetim per completesa)
const schedulesM1: ScheduleEntry[] = [
  // PRIMER SEMESTRE
  {
    groupName: '1r Matí M1',
    subjectName: 'Fonaments del Disseny I',
    teachers: ['Laura Ginés Bataller'],
    classrooms: ['P1.5'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M1',
    subjectName: 'Taller de Dibuix Artístic',
    teachers: ['Montse Casacuberta Suñer'],
    classrooms: ['LO.1'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M1',
    subjectName: 'Taller d\'Expressió i Comunicació',
    teachers: ['Marta Camps'],
    classrooms: ['G1.1'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M1',
    subjectName: 'Iconografia i Comunicació',
    teachers: ['Jorge Luis Marzo'],
    classrooms: ['PO.12'],
    dayOfWeek: 3,
    startTime: '11:30',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '1r Matí M1',
    subjectName: 'Iconografia i Comunicació',
    teachers: ['Jorge Luis Marzo'],
    classrooms: ['PO.12'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M1',
    subjectName: 'Taller d\'Expressió i Comunicació',
    teachers: ['Marta Camps'],
    classrooms: ['G1.1'],
    dayOfWeek: 4,
    startTime: '11:30',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '1r Matí M1',
    subjectName: 'Eines Informàtiques I',
    teachers: ['Anna Ferré Boltà', 'Elserida', 'Fontarnau', 'Pau Pericas'],
    classrooms: ['P1.2', 'P1.3', 'P1.8', 'P1.12', 'G2.1'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  // SEGON SEMESTRE
  {
    groupName: '1r Matí M1',
    subjectName: 'Fonaments del Disseny II',
    teachers: ['Laura Ginés Bataller'],
    classrooms: ['P1.5'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M1',
    subjectName: 'Taller de Color',
    teachers: ['Montse Casacuberta Suñer'],
    classrooms: ['LO.1'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M1',
    subjectName: 'Antropologia Sociocultural',
    teachers: ['Marina Riera'],
    classrooms: ['P1.16'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M1',
    subjectName: 'Estètica i Teoria de les Arts',
    teachers: ['Alejandra López Gabrielidis'],
    classrooms: ['P1.16'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M1',
    subjectName: 'Eines Informàtiques II',
    teachers: ['Glòria Deumal', 'Ricard Marimon', 'Daniel Tahmaz'],
    classrooms: ['P1.2', 'P1.3', 'P1.12', 'P1.8', 'G2.1'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  }
]

// Grup M2
const schedulesM2: ScheduleEntry[] = [
  // PRIMER SEMESTRE
  {
    groupName: '1r Matí M2',
    subjectName: 'Fonaments del Disseny I',
    teachers: ['Marina Gil'],
    classrooms: ['P0.8'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M2',
    subjectName: 'Taller de Dibuix Artístic',
    teachers: ['Laura Gual'],
    classrooms: ['LO.1'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M2',
    subjectName: 'Iconografia i Comunicació',
    teachers: ['Jorge Luis Marzo'],
    classrooms: ['PO.12'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M2',
    subjectName: 'Taller d\'Expressió i Comunicació',
    teachers: ['Marta Camps'],
    classrooms: ['G1.1'],
    dayOfWeek: 3,
    startTime: '11:30',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '1r Matí M2',
    subjectName: 'Taller d\'Expressió i Comunicació',
    teachers: ['Marta Camps'],
    classrooms: ['G1.1'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M2',
    subjectName: 'Iconografia i Comunicació',
    teachers: ['Jorge Luis Marzo'],
    classrooms: ['PO.12'],
    dayOfWeek: 4,
    startTime: '11:30',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '1r Matí M2',
    subjectName: 'Eines Informàtiques I',
    teachers: ['Anna Ferré', 'Elserida', 'Fontarnau', 'Pau Pericas'],
    classrooms: ['P1.2', 'P1.3', 'P1.8', 'P1.12', 'G2.1'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  // SEGON SEMESTRE
  {
    groupName: '1r Matí M2',
    subjectName: 'Fonaments del Disseny II',
    teachers: ['Marina Gil'],
    classrooms: ['P0.8'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M2',
    subjectName: 'Taller de Color',
    teachers: ['Laura Gual'],
    classrooms: ['LO.1'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M2',
    subjectName: 'Estètica i Teoria de les Arts',
    teachers: ['Arnau Horta'],
    classrooms: ['P1.9'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M2',
    subjectName: 'Antropologia Sociocultural',
    teachers: ['Marina Riera'],
    classrooms: ['P0.8'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M2',
    subjectName: 'Eines Informàtiques II',
    teachers: ['Glòria Deumal', 'Ricard Marimon', 'Daniel Tahmaz'],
    classrooms: ['P1.2', 'P1.3', 'P1.12', 'P1.8', 'G2.1'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  }
]

// Grup M3
const schedulesM3: ScheduleEntry[] = [
  // PRIMER SEMESTRE
  {
    groupName: '1r Matí M3',
    subjectName: 'Taller de Dibuix Artístic',
    teachers: ['Montse Casacuberta'],
    classrooms: ['LO.1'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M3',
    subjectName: 'Fonaments del Disseny I',
    teachers: ['Nico Juárez'],
    classrooms: ['P0.2/0.4'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M3',
    subjectName: 'Antropologia Sociocultural',
    teachers: ['Marina Riera'],
    classrooms: ['P1.16'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M3',
    subjectName: 'Estètica i Teoria de les Arts',
    teachers: ['Alejandra López Gabrielidis'],
    classrooms: ['P1.16'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M3',
    subjectName: 'Eines Informàtiques I',
    teachers: ['Glòria Deumal', 'Elserida', 'Fontarnau', 'Pau Pericas'],
    classrooms: ['P1.2', 'P1.3', 'P1.8', 'P1.12', 'G2.1'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  // SEGON SEMESTRE
  {
    groupName: '1r Matí M3',
    subjectName: 'Taller de Color',
    teachers: ['Montse Casacuberta'],
    classrooms: ['LO.1'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M3',
    subjectName: 'Fonaments del Disseny II',
    teachers: ['Nico Juárez'],
    classrooms: ['P0.2/0.4'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M3',
    subjectName: 'Taller d\'Expressió i Comunicació',
    teachers: ['Elida Pérez'],
    classrooms: ['G1.1'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M3',
    subjectName: 'Iconografia i Comunicació',
    teachers: ['Jorge Luis Marzo'],
    classrooms: ['PO.12'],
    dayOfWeek: 3,
    startTime: '11:30',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '1r Matí M3',
    subjectName: 'Iconografia i Comunicació',
    teachers: ['Jorge Luis Marzo'],
    classrooms: ['PO.12'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M3',
    subjectName: 'Taller d\'Expressió i Comunicació',
    teachers: ['Elida Pérez'],
    classrooms: ['G1.1'],
    dayOfWeek: 4,
    startTime: '11:30',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '1r Matí M3',
    subjectName: 'Eines Informàtiques II',
    teachers: ['Glòria Deumal', 'Ricard Marimon', 'Daniel Tahmaz'],
    classrooms: ['P1.2', 'P1.3', 'P1.12', 'P1.8', 'G2.1'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  }
]

// Grup M4
const schedulesM4: ScheduleEntry[] = [
  // PRIMER SEMESTRE
  {
    groupName: '1r Matí M4',
    subjectName: 'Taller de Dibuix Artístic',
    teachers: ['Anna Clemente'],
    classrooms: ['LO.1'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M4',
    subjectName: 'Estètica i Teoria de les Arts',
    teachers: ['Arnau Horta'],
    classrooms: ['P1.9'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M4',
    subjectName: 'Fonaments del Disseny I',
    teachers: ['Josep M. Marimon'],
    classrooms: ['P1.7'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M4',
    subjectName: 'Antropologia Sociocultural',
    teachers: ['Marina Riera'],
    classrooms: ['P1.9'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M4',
    subjectName: 'Eines Informàtiques II',
    teachers: ['Glòria Deumal', 'Ricard Marimon', 'Daniel Tahmaz'],
    classrooms: ['P1.2', 'P1.3', 'P1.8', 'P1.12', 'G2.1'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  // SEGON SEMESTRE
  {
    groupName: '1r Matí M4',
    subjectName: 'Taller de Color',
    teachers: ['Anna Clemente'],
    classrooms: ['LO.1'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M4',
    subjectName: 'Fonaments del Disseny II',
    teachers: ['Josep M. Marimon'],
    classrooms: ['P1.7'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M4',
    subjectName: 'Iconografia i Comunicació',
    teachers: ['Jorge Luis Marzo'],
    classrooms: ['PO.12'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M4',
    subjectName: 'Taller d\'Expressió i Comunicació',
    teachers: ['Elida Pérez'],
    classrooms: ['G1.1'],
    dayOfWeek: 3,
    startTime: '11:30',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '1r Matí M4',
    subjectName: 'Taller d\'Expressió i Comunicació',
    teachers: ['Elida Pérez'],
    classrooms: ['G1.1'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M4',
    subjectName: 'Iconografia i Comunicació',
    teachers: ['Jorge Luis Marzo'],
    classrooms: ['PO.12'],
    dayOfWeek: 4,
    startTime: '11:30',
    endTime: '13:30',
    semester: 2
  },
  {
    groupName: '1r Matí M4',
    subjectName: 'Eines Informàtiques I',
    teachers: ['Anna Ferré', 'Elisenda Fontarnau', 'Pau Pericas'],
    classrooms: ['P1.2', 'P1.3', 'P1.8', 'P1.12', 'G2.1'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  }
]

// Grup M5
const schedulesM5: ScheduleEntry[] = [
  // PRIMER SEMESTRE
  {
    groupName: '1r Matí M5',
    subjectName: 'Taller d\'Expressió i Comunicació',
    teachers: ['Oriol Rodríguez'],
    classrooms: ['G1.1'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M5',
    subjectName: 'Iconografia i Comunicació',
    teachers: ['Jorge Luis Marzo'],
    classrooms: ['P1.16'],
    dayOfWeek: 1,
    startTime: '11:30',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '1r Matí M5',
    subjectName: 'Iconografia i Comunicació',
    teachers: ['Jorge Luis Marzo'],
    classrooms: ['P1.16'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M5',
    subjectName: 'Taller d\'Expressió i Comunicació',
    teachers: ['Oriol Rodríguez'],
    classrooms: ['G1.1'],
    dayOfWeek: 2,
    startTime: '11:30',
    endTime: '13:30',
    semester: 1
  },
  {
    groupName: '1r Matí M5',
    subjectName: 'Fonaments del Disseny I',
    teachers: ['Pierino del Pozzo'],
    classrooms: ['P1.5'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M5',
    subjectName: 'Taller de Dibuix Artístic',
    teachers: ['Laura Gual'],
    classrooms: ['L0.2'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 1
  },
  {
    groupName: '1r Matí M5',
    subjectName: 'Eines Informàtiques II',
    teachers: ['Glòria Deumal', 'Ricard Marimon', 'Daniel Tahmaz'],
    classrooms: ['P1.2', 'P1.3', 'P1.8', 'P1.12', 'G2.1'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  },
  // SEGON SEMESTRE
  {
    groupName: '1r Matí M5',
    subjectName: 'Estètica i Teoria de les Arts',
    teachers: ['Arnau Horta'],
    classrooms: ['P1.16'],
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M5',
    subjectName: 'Antropologia Sociocultural',
    teachers: ['Marina Riera'],
    classrooms: ['P1.16'],
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M5',
    subjectName: 'Fonaments del Disseny II',
    teachers: ['Pierino del Pozzo'],
    classrooms: ['P1.5'],
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M5',
    subjectName: 'Taller de Color',
    teachers: ['Laura Gual'],
    classrooms: ['L0.1'],
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '11:00',
    semester: 2
  },
  {
    groupName: '1r Matí M5',
    subjectName: 'Eines Informàtiques I',
    teachers: ['Anna Ferré', 'Elisenda Fontarnau', 'Pau Pericas'],
    classrooms: ['P1.2', 'P1.3', 'P1.12', 'P1.8', 'G2.1'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  }
]

// Grup T1
const schedulesT1: ScheduleEntry[] = [
  // PRIMER SEMESTRE
  {
    groupName: '1r Tarda T1',
    subjectName: 'Iconografia i Comunicació',
    teachers: ['Roc Albalat'],
    classrooms: ['PO.12'],
    dayOfWeek: 1,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  {
    groupName: '1r Tarda T1',
    subjectName: 'Taller d\'Expressió i Comunicació',
    teachers: ['Oriol Rodríguez'],
    classrooms: ['G1.1'],
    dayOfWeek: 1,
    startTime: '17:30',
    endTime: '19:30',
    semester: 1
  },
  {
    groupName: '1r Tarda T1',
    subjectName: 'Taller d\'Expressió i Comunicació',
    teachers: ['Oriol Rodríguez'],
    classrooms: ['G1.1'],
    dayOfWeek: 2,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  {
    groupName: '1r Tarda T1',
    subjectName: 'Iconografia i Comunicació',
    teachers: ['Roc Albalat'],
    classrooms: ['PO.12'],
    dayOfWeek: 2,
    startTime: '17:30',
    endTime: '19:30',
    semester: 1
  },
  {
    groupName: '1r Tarda T1',
    subjectName: 'Fonaments del Disseny I',
    teachers: ['Santiago Benítez'],
    classrooms: ['L1.2'],
    dayOfWeek: 3,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  {
    groupName: '1r Tarda T1',
    subjectName: 'Taller de Dibuix Artístic',
    teachers: ['Montse Casacuberta'],
    classrooms: ['L0.1'],
    dayOfWeek: 4,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  {
    groupName: '1r Tarda T1',
    subjectName: 'Eines Informàtiques I',
    teachers: ['Glòria Deumal', 'Elserida', 'Fontarnau'],
    classrooms: ['P1.2', 'P1.3', 'G2.1'],
    dayOfWeek: 5,
    startTime: '15:00',
    endTime: '19:30',
    semester: 1
  },
  // SEGON SEMESTRE
  {
    groupName: '1r Tarda T1',
    subjectName: 'Antropologia Sociocultural',
    teachers: ['Mafe Moscoso'],
    classrooms: ['P1.16'],
    dayOfWeek: 1,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  },
  {
    groupName: '1r Tarda T1',
    subjectName: 'Estètica i Teoria de les Arts',
    teachers: ['Arnau Horta'],
    classrooms: ['P1.16'],
    dayOfWeek: 2,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  },
  {
    groupName: '1r Tarda T1',
    subjectName: 'Fonaments del Disseny II',
    teachers: ['Santiago Benítez'],
    classrooms: ['L1.2'],
    dayOfWeek: 3,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  },
  {
    groupName: '1r Tarda T1',
    subjectName: 'Taller de Color',
    teachers: ['Montse Casacuberta'],
    classrooms: ['L0.1'],
    dayOfWeek: 4,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  },
  {
    groupName: '1r Tarda T1',
    subjectName: 'Eines Informàtiques II',
    teachers: ['Glòria Deumal', 'Ricard Marimon', 'Daniel Tahmaz'],
    classrooms: ['P1.2', 'P1.3', 'G2.1', 'P1.12'],
    dayOfWeek: 5,
    startTime: '15:00',
    endTime: '19:30',
    semester: 2
  }
]

// Grup T2
const schedulesT2: ScheduleEntry[] = [
  // PRIMER SEMESTRE
  {
    groupName: '1r Tarda T2',
    subjectName: 'Estètica i Teoria de les Arts',
    teachers: ['Alejandra López Gabrielidis'],
    classrooms: ['P1.16'],
    dayOfWeek: 1,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  {
    groupName: '1r Tarda T2',
    subjectName: 'Antropologia Sociocultural',
    teachers: ['Marina Riera'],
    classrooms: ['P1.16'],
    dayOfWeek: 2,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  {
    groupName: '1r Tarda T2',
    subjectName: 'Fonaments del Disseny I',
    teachers: ['Nico Juárez'],
    classrooms: ['L0.1'],
    dayOfWeek: 3,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  {
    groupName: '1r Tarda T2',
    subjectName: 'Taller de Dibuix Artístic',
    teachers: ['Anna Clemente'],
    classrooms: ['L0.1'],
    dayOfWeek: 4,
    startTime: '15:00',
    endTime: '17:00',
    semester: 1
  },
  {
    groupName: '1r Tarda T2',
    subjectName: 'Eines Informàtiques II',
    teachers: ['Glòria Deumal', 'Ricard Marimon', 'Daniel Tahmaz'],
    classrooms: ['P1.2', 'P1.3', 'G2.1'],
    dayOfWeek: 5,
    startTime: '15:00',
    endTime: '19:30',
    semester: 1
  },
  // SEGON SEMESTRE
  {
    groupName: '1r Tarda T2',
    subjectName: 'Iconografia i Comunicació',
    teachers: ['Jorge Luis Marzo'],
    classrooms: ['PO.12'],
    dayOfWeek: 1,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  },
  {
    groupName: '1r Tarda T2',
    subjectName: 'Taller d\'Expressió i Comunicació',
    teachers: ['Oriol Rodríguez'],
    classrooms: ['G1.1'],
    dayOfWeek: 1,
    startTime: '17:30',
    endTime: '19:30',
    semester: 2
  },
  {
    groupName: '1r Tarda T2',
    subjectName: 'Taller d\'Expressió i Comunicació',
    teachers: ['Oriol Rodríguez'],
    classrooms: ['G1.1'],
    dayOfWeek: 2,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  },
  {
    groupName: '1r Tarda T2',
    subjectName: 'Iconografia i Comunicació',
    teachers: ['Jorge Luis Marzo'],
    classrooms: ['PO.12'],
    dayOfWeek: 2,
    startTime: '17:30',
    endTime: '19:30',
    semester: 2
  },
  {
    groupName: '1r Tarda T2',
    subjectName: 'Fonaments del Disseny II',
    teachers: ['Nico Juárez'],
    classrooms: ['L0.1'],
    dayOfWeek: 3,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  },
  {
    groupName: '1r Tarda T2',
    subjectName: 'Taller de Color',
    teachers: ['Anna Clemente'],
    classrooms: ['L0.1'],
    dayOfWeek: 4,
    startTime: '15:00',
    endTime: '17:00',
    semester: 2
  },
  {
    groupName: '1r Tarda T2',
    subjectName: 'Eines Informàtiques I',
    teachers: ['Glòria Deumal', 'Elisenda Fontarnau', 'Pau Pericas'],
    classrooms: ['P1.2', 'P1.3', 'G2.1'],
    dayOfWeek: 5,
    startTime: '15:00',
    endTime: '19:30',
    semester: 2
  }
]

// Executar la importació
async function importAllFirstYear() {
  console.log('🎓 IMPORTACIÓ D\'HORARIS - DISSENY 1r CURS')
  console.log('=========================================\n')

  const allSchedules = [
    ...schedulesM1,
    ...schedulesM2,
    ...schedulesM3,
    ...schedulesM4,
    ...schedulesM5,
    ...schedulesT1,
    ...schedulesT2
  ]

  const { successCount, errorCount } = await importSchedule(allSchedules, true)
  
  console.log('\n=========================================')
  console.log(`✅ IMPORTACIÓ COMPLETADA`)
  console.log(`📊 Total: ${successCount} èxits, ${errorCount} errors`)
  console.log(`📚 Grups processats: M1, M2, M3, M4, M5, T1, T2`)
}

// Executar
importAllFirstYear().catch(console.error)