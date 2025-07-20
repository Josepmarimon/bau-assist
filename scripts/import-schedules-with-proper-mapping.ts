import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mapeig de noms de professors dels horaris als noms reals de la BD
const TEACHER_MAPPINGS: Record<string, string> = {
  'Jorge Luis Marzo': 'Jorge Luís Marzo Pérez',
  'Alejandra López Gabrielidis': 'María Alejandra López',
  'Marta Camps': 'Marta Camps Banqué',
  'Elserida': '', // No existeix a la BD
  'Fontarnau': 'Elisenda Fontarnau Català',
  'Pau Pericas': 'Pau Pericas Bosch',
  'Marina Riera': 'Marina Riera Retamero'
}

// Mapeig d'aules dels horaris al format de la BD
const CLASSROOM_MAPPINGS: Record<string, string> = {
  'P1.5': 'P.1.5',
  'P1.8': 'P.1.8',
  'P1.12': 'P.1.12',
  'P1.16': '', // No existeix a la BD
  'P1.9': 'P.1.9',
  'P1.7': 'P.1.7',
  'P1.2': 'P.1.2',
  'P1.3': 'P.1.3',
  'P0.8': 'P.0.8',
  'P0.12': 'P.0.12',
  'P0.2/0.4': 'P.0.2/0.4',
  'P2.1': 'P.2.1',
  'LO.1': 'L.0.1',
  'L0.1': 'L.0.1',
  'L0.2': 'L.0.2',
  'L1.2': 'L.1.2',
  'G1.1': 'G.1.1',
  'G2.1': 'G.2.1',
  'G.1.1': 'G.1.1', // Ja està en format correcte
  'Plates': '', // No existeix com a aula
  'Sala': '', // No existeix com a aula
  'Sala Carolines': '', // No existeix com a aula
  'PO.12': 'P.0.12' // Correcció de typo
}

// Estructura per definir els horaris
interface ScheduleEntry {
  groupName: string
  subjectName: string
  teachers: string[]
  classrooms: string[]
  dayOfWeek: number
  startTime: string
  endTime: string
  semester: number
}

async function findTeacher(teacherName: string) {
  // Primer intentar amb el mapeig
  const mappedName = TEACHER_MAPPINGS[teacherName] || teacherName
  
  if (!mappedName) {
    console.warn(`Professor ${teacherName} no té mapeig definit`)
    return null
  }

  const nameParts = mappedName.split(' ')
  
  // Buscar per nom complet
  if (nameParts.length >= 2) {
    const firstName = nameParts[0]
    const lastName = nameParts.slice(1).join(' ')
    
    const { data } = await supabase
      .from('teachers')
      .select('id, first_name, last_name')
      .ilike('first_name', `%${firstName}%`)
      .ilike('last_name', `%${lastName}%`)
      .limit(1)
    
    if (data && data.length > 0) {
      console.log(`Trobat: ${data[0].first_name} ${data[0].last_name}`)
      return data[0].id
    }
  }
  
  // Si no es troba, buscar només per cognom
  const { data } = await supabase
    .from('teachers')
    .select('id, first_name, last_name')
    .or(`first_name.ilike.%${teacherName}%,last_name.ilike.%${teacherName}%`)
    .limit(1)
  
  if (data && data.length > 0) {
    console.log(`Trobat (parcial): ${data[0].first_name} ${data[0].last_name}`)
    return data[0].id
  }
  
  console.warn(`No trobat: ${teacherName}`)
  return null
}

async function findClassroom(classroomCode: string) {
  const mappedCode = CLASSROOM_MAPPINGS[classroomCode] || classroomCode
  
  if (!mappedCode) {
    console.warn(`Aula ${classroomCode} no té mapeig definit`)
    return null
  }
  
  const { data } = await supabase
    .from('classrooms')
    .select('id, code')
    .eq('code', mappedCode)
    .single()
  
  if (data) {
    console.log(`Aula trobada: ${data.code}`)
    return data.id
  }
  
  console.warn(`Aula no trobada: ${classroomCode} (mapejat a ${mappedCode})`)
  return null
}

async function clearExistingSchedule(groupName: string) {
  const { data: group } = await supabase
    .from('student_groups')
    .select('id')
    .eq('name', groupName)
    .single()
  
  if (group) {
    console.log(`Esborrant horaris existents per ${groupName}...`)
    await supabase
      .from('schedule_slots')
      .delete()
      .eq('student_group_id', group.id)
  }
}

async function importSchedule(schedules: ScheduleEntry[]) {
  // Primer, esborrar horaris existents per evitar duplicats
  const uniqueGroups = [...new Set(schedules.map(s => s.groupName))]
  for (const groupName of uniqueGroups) {
    await clearExistingSchedule(groupName)
  }

  for (const schedule of schedules) {
    try {
      console.log(`\n📚 ${schedule.subjectName} - ${schedule.groupName}`)
      console.log(`   📅 Dia ${schedule.dayOfWeek}, ${schedule.startTime}-${schedule.endTime}, Semestre ${schedule.semester}`)

      // 1. Buscar el grup
      const { data: group, error: groupError } = await supabase
        .from('student_groups')
        .select('id')
        .eq('name', schedule.groupName)
        .single()

      if (groupError || !group) {
        console.error('❌ Error buscant grup:', schedule.groupName)
        continue
      }

      // 2. Buscar l'assignatura
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', schedule.subjectName)
        .single()

      if (subjectError || !subject) {
        console.error('❌ Error buscant assignatura:', schedule.subjectName)
        continue
      }

      // 3. Crear el slot
      const { data: slot, error: slotError } = await supabase
        .from('schedule_slots')
        .insert({
          student_group_id: group.id,
          subject_id: subject.id,
          day_of_week: schedule.dayOfWeek,
          start_time: schedule.startTime,
          end_time: schedule.endTime,
          semester: schedule.semester,
          academic_year: '2025-26'
        })
        .select('id')
        .single()

      if (slotError || !slot) {
        console.error('❌ Error creant slot:', slotError)
        continue
      }

      console.log('✅ Slot creat')

      // 4. Associar professors
      for (const teacherName of schedule.teachers) {
        const teacherId = await findTeacher(teacherName)
        if (teacherId) {
          await supabase
            .from('schedule_slot_teachers')
            .insert({
              schedule_slot_id: slot.id,
              teacher_id: teacherId
            })
          console.log(`   👨‍🏫 ${teacherName}`)
        }
      }

      // 5. Associar aules
      for (const classroomCode of schedule.classrooms) {
        const classroomId = await findClassroom(classroomCode)
        if (classroomId) {
          await supabase
            .from('schedule_slot_classrooms')
            .insert({
              schedule_slot_id: slot.id,
              classroom_id: classroomId
            })
          console.log(`   🏫 ${classroomCode}`)
        }
      }

    } catch (error) {
      console.error('❌ Error processant:', error)
    }
  }
}

// EXEMPLE: Horari complet del grup M1
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

// Executar la importació
console.log('🚀 Iniciant importació d\'horaris amb mapeig correcte...\n')
importSchedule(schedulesM1)
  .then(() => console.log('\n✅ Importació completada!'))
  .catch(console.error)