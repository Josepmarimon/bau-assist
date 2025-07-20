import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Estructura per definir els horaris
interface ScheduleEntry {
  groupName: string
  subjectName: string
  teachers: string[]
  classrooms: string[]
  dayOfWeek: number // 1=Dilluns, 5=Divendres
  startTime: string
  endTime: string
  semester: number
}

// Horaris del Grup M1 - Primer Semestre
const schedulesM1S1: ScheduleEntry[] = [
  // DILLUNS
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
  // DIMARTS
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
  // DIMECRES - Matí
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
  // DIMECRES - Tarda
  {
    groupName: '1r Matí M1',
    subjectName: 'Iconografia i Comunicació',
    teachers: ['Jorge Luís Marzo Pérez'],
    classrooms: ['PO.12'],
    dayOfWeek: 3,
    startTime: '11:30',
    endTime: '13:30',
    semester: 1
  },
  // DIJOUS
  {
    groupName: '1r Matí M1',
    subjectName: 'Iconografia i Comunicació',
    teachers: ['Jorge Luís Marzo Pérez'],
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
  // DIVENDRES
  {
    groupName: '1r Matí M1',
    subjectName: 'Eines Informàtiques I',
    teachers: ['Anna Ferré Boltà', 'Elserida', 'Fontarnau', 'Pau Pericas'],
    classrooms: ['P1.2', 'P1.3', 'P1.8', 'P1.12', 'G2.1', 'Plates', 'Sala'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 1
  }
]

// Horaris del Grup M1 - Segon Semestre
const schedulesM1S2: ScheduleEntry[] = [
  // DILLUNS
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
  // DIMARTS
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
  // DIMECRES
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
  // DIJOUS
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
  // DIVENDRES
  {
    groupName: '1r Matí M1',
    subjectName: 'Eines Informàtiques II',
    teachers: ['Glòria Deumal', 'Ricard Marimon', 'Daniel Tahmaz'],
    classrooms: ['P1.2', 'P1.3', 'P1.12', 'P1.8', 'G2.1', 'Plates', 'Sala Carolines'],
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '13:30',
    semester: 2
  }
]

async function importSchedules() {
  console.log('Començant importació d\'horaris...')

  // Combinar tots els horaris
  const allSchedules = [...schedulesM1S1, ...schedulesM1S2]

  for (const schedule of allSchedules) {
    try {
      console.log(`\nProcessant: ${schedule.subjectName} - ${schedule.groupName} - Dia ${schedule.dayOfWeek} - Semestre ${schedule.semester}`)

      // 1. Buscar el grup d'estudiants
      const { data: group, error: groupError } = await supabase
        .from('student_groups')
        .select('id')
        .eq('name', schedule.groupName)
        .single()

      if (groupError || !group) {
        console.error('Error buscant grup:', schedule.groupName, groupError)
        continue
      }

      // 2. Buscar l'assignatura
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', schedule.subjectName)
        .single()

      if (subjectError || !subject) {
        console.error('Error buscant assignatura:', schedule.subjectName, subjectError)
        continue
      }

      // 3. Crear el slot d'horari
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
        console.error('Error creant slot:', slotError)
        continue
      }

      console.log('Slot creat amb ID:', slot.id)

      // 4. Associar professors
      for (const teacherName of schedule.teachers) {
        // Buscar professor per nom complet o parcial
        const nameParts = teacherName.split(' ')
        let teacherQuery = supabase.from('teachers').select('id')
        
        if (nameParts.length > 1) {
          // Nom i cognom
          teacherQuery = teacherQuery
            .ilike('first_name', `%${nameParts[0]}%`)
            .ilike('last_name', `%${nameParts.slice(1).join(' ')}%`)
        } else {
          // Només un nom
          teacherQuery = teacherQuery.or(`first_name.ilike.%${teacherName}%,last_name.ilike.%${teacherName}%`)
        }

        const { data: teachers } = await teacherQuery.limit(1)

        if (teachers && teachers.length > 0) {
          await supabase
            .from('schedule_slot_teachers')
            .insert({
              schedule_slot_id: slot.id,
              teacher_id: teachers[0].id
            })
          console.log(`Professor associat: ${teacherName}`)
        } else {
          console.warn(`Professor no trobat: ${teacherName}`)
        }
      }

      // 5. Associar aules (temporalment comentat perquè les aules no coincideixen)
      console.log(`Aules pendents d'associar: ${schedule.classrooms.join(', ')}`)
      // TODO: Crear aules que falten o mapejar-les correctament

    } catch (error) {
      console.error('Error processant horari:', error)
    }
  }

  console.log('\nImportació completada!')
}

// Executar la importació
importSchedules().catch(console.error)