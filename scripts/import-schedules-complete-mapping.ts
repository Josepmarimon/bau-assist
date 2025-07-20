import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mapeig COMPLET de noms de professors dels horaris als noms reals de la BD
const TEACHER_MAPPINGS: Record<string, string> = {
  // Correcció d'accents i noms complets
  'Jorge Luis Marzo': 'Jorge Luís Marzo Pérez',
  'Alejandra López Gabrielidis': 'María Alejandra López',
  'Marta Camps': 'Marta Camps Banqué',
  'Fontarnau': 'Elisenda Fontarnau Català',
  'Pau Pericas': 'Pau Pericas Bosch',
  'Marina Riera': 'Marina Riera Retamero',
  'Glòria Deumal': 'Glòria Deumal López',
  'Ricard Marimon': 'Ricard Marimon Soler',
  'Daniel Tahmaz': 'Daniel Tahmaz Pujol',
  
  // Professors trobats amb cerca
  'Nico Juárez': 'Nico Juárez Latimer-Knowles',
  'Arnau Horta': 'Arnau Horta Sellarés',
  'Josep M. Marimon': 'Josep Mª Marimon Soler',
  'Josep M.Marimon': 'Josep Mª Marimon Soler',
  'Blanca-Pia Fernández': 'Blanca-Pía Fernández Valverde',
  'Pierino del Pozzo': 'Pierino Dal Pozzo',
  'Mafe Moscoso': 'María Fernanda Moscoso Rosero',
  
  // Mapeig complet de noms del 2n any
  'Mª Isabel del Río': 'María Isabel del Río Sánchez',
  'M. Isabel del Río': 'María Isabel del Río Sánchez',
  'Nataly dal Pozzo': 'Nataly Dal Pozzo Montrucchio',
  'Laurà Subirats': 'Laura Subirats Berenguer',
  
  // Professors que NO existeixen i cal crear
  'Mariana Morcurill': '', // No existeix
  'Irena Visa': '', // No existeix
  'Lúa Coderch': '', // No existeix
  'Michael Lawton': '', // No existeix
  'Elserida': '', // No existeix a la BD
}

// Mapeig COMPLET d'aules dels horaris al format de la BD
const CLASSROOM_MAPPINGS: Record<string, string> = {
  // Format P0.X -> P.0.X (ACTUALITZAT)
  'P0.1': 'P.0.1',
  'P0.2': 'P.0.2',
  'P0.3': 'P.0.3',
  'P0.4': 'P.0.4',
  'P0.5': 'P.0.5',
  'P0.6': 'P.0.6',
  'P0.7': 'P.0.7', 
  'P0.8': 'P.0.8',
  'P0.9': 'P.0.9',
  'P0.10': 'P.0.10',
  'P0.11': 'P.0.11',
  'P0.12': 'P.0.12',
  'P0.13': 'P.0.13',
  'P0.14': 'P.0.14',
  'P0.2/0.4': 'P.0.2/0.4',
  'P0.5/0.7': 'P.0.5/0.7',
  
  // Format P1.X -> P.1.X (ACTUALITZAT)
  'P1.2': 'P.1.2',
  'P1.3': 'P.1.3',
  'P1.4': 'P.1.4',
  'P1.5': 'P.1.5',
  'P1.6': 'P.1.6',
  'P1.7': 'P.1.7',
  'P1.8': 'P.1.8',
  'P1.9': 'P.1.9',
  'P1.10': 'P.1.10',
  'P1.12': 'P.1.12',
  'P1.16': '', // No existeix
  'P1.17': '', // No existeix
  'P1.19': '', // No existeix
  
  // Format P2.X -> P.2.X
  'P2.1': 'P.2.1',
  'P2.2': 'P.2.2',
  'P2.3': 'P.2.3',
  'P2.4': 'P.2.4',
  
  // Format L.X.X
  'LO.1': 'L.0.1',
  'L0.1': 'L.0.1',
  'LO.2': 'L.0.2',
  'L0.2': 'L.0.2',
  'L0.3': 'L.0.3_PLATÓ',
  'L0.4': 'L.0.4',
  'L1.1': 'L.1.1',
  'L1.2': 'L.1.2',
  'L1.3': 'L.1.3',
  
  // Format G.X.X
  'G1.1': 'G.1.1',
  'G1.2': 'G.1.2',
  'G1.3': 'G.1.3',
  'G2.1': 'G.2.1',
  'GO.1': 'G.0.1',
  'GO.2': 'G.0.2',
  'G0.1': 'G.0.1',
  'G0.2': 'G.0.2',
  'G0.3': 'G.0.3_TALLER_D\'ESCULTURA_CERAMICA_METALL',
  'G0.4': 'G.0.4',
  'G0.5': 'G.0.5',
  'GE.1': 'G.E.1',
  'GE.2': 'G.E.2',
  'GE.3': 'G.E.3',
  
  // Errors tipogràfics i formats alternatius
  'PO.1': 'P.0.1',
  'PO.2': 'P.0.2',
  'PO.3': 'P.0.3',
  'PO.4': 'P.0.4',
  'PO.5': 'P.0.5',
  'PO.6': 'P.0.6',
  'PO.7': 'P.0.7',
  'PO.8': 'P.0.8',
  'PO.9': 'P.0.9',
  'PO.10': 'P.0.10',
  'PO.11': 'P.0.11',
  'PO.12': 'P.0.12',
  'PO.2/O.4': 'P.0.2/0.4',
  'PO.5/O.7': 'P.0.5/0.7',
  'PO.2/G4': 'P.0.2/0.4', // És la mateixa aula P.0.2/0.4
  
  // Format GO.X -> G.0.X
  'GO.3': 'G.0.3',
  'GO.4': 'G.0.4',
  
  // Format G.X.X mal escrit
  'G2.2': 'G.2.2',
  'G.2.2': 'G.2.2', // Ara existeix correctament
  
  // Sales especials
  'Sala Carolines': 'SALA_CAROLINES',
  'Sala Badajoz': 'SALA_BADAJOZ',
  'Plates': '', // No existeix
  'Sala': '', // No existeix com a aula genèrica
  'Platós': 'PLATÓS',
  'Plató': 'L.0.3_PLATÓ',
  
  // Altres
  'T.2': 'T.2',
  'T.3': 'T.3_TALLER_DE_MODA',
  'T.4': 'T.4_TALLER_DE_MODA',
  'T.5': 'T.5_TRICOTOSES',
  
  // Aules mòbils
  'Portàtils': 'PORTATILS_(1)',
  'portàtils': 'PORTATILS_(1)',
  
  // Casos especials - Pt.2+portàtils significa dues aules
  // Aquest cas s'ha de gestionar de manera especial en la importació
  'Pt.2': 'T.2',
  'P.T.2': 'T.2',
}

// Mapeig d'assignatures dels horaris als noms de la BD
const SUBJECT_MAPPINGS: Record<string, string> = {
  // Possibles mapejos alternatius (si es volen utilitzar les existents)
  // 'Projectes de Disseny Gràfic i Comunicació Visual I': 'Taller de Gràfic i Comunicació Visual I',
  // 'Projectes de Disseny Gràfic i Comunicació Visual II': 'Taller de Gràfic i Comunicació Visual II',
  // 'Projectes de Disseny Gràfic i Comunicació Visual III': 'Taller de Gràfic i Comunicació Visual III',
  // 'Experimental Type': 'Tipografia I',
  
  // Per ara utilitzem els noms tal qual apareixen als horaris
  // ja que hem creat les assignatures amb aquests noms
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
    console.warn(`⚠️  Professor ${teacherName} no té mapeig definit`)
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
    return data[0].id
  }
  
  console.warn(`❌ No trobat: ${teacherName}`)
  return null
}

async function findClassroom(classroomCode: string) {
  const mappedCode = CLASSROOM_MAPPINGS[classroomCode] || classroomCode
  
  if (!mappedCode) {
    console.warn(`⚠️  Aula ${classroomCode} no existeix`)
    return null
  }
  
  const { data } = await supabase
    .from('classrooms')
    .select('id, code')
    .eq('code', mappedCode)
    .single()
  
  if (data) {
    return data.id
  }
  
  console.warn(`❌ Aula no trobada: ${classroomCode} (mapejat a ${mappedCode})`)
  return null
}

async function clearExistingSchedule(groupName: string) {
  const { data: group } = await supabase
    .from('student_groups')
    .select('id')
    .eq('name', groupName)
    .single()
  
  if (group) {
    console.log(`🗑️  Esborrant horaris existents per ${groupName}...`)
    await supabase
      .from('schedule_slots')
      .delete()
      .eq('student_group_id', group.id)
  }
}

async function importSchedule(schedules: ScheduleEntry[], clearFirst: boolean = true) {
  // Esborrar horaris existents si cal
  if (clearFirst) {
    const uniqueGroups = [...new Set(schedules.map(s => s.groupName))]
    for (const groupName of uniqueGroups) {
      await clearExistingSchedule(groupName)
    }
  }

  let successCount = 0
  let errorCount = 0

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
        console.error('❌ Grup no trobat:', schedule.groupName)
        errorCount++
        continue
      }

      // 2. Buscar l'assignatura
      const mappedSubjectName = SUBJECT_MAPPINGS[schedule.subjectName] || schedule.subjectName
      const { data: subject, error: subjectError } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', mappedSubjectName)
        .single()

      if (subjectError || !subject) {
        console.error('❌ Assignatura no trobada:', schedule.subjectName)
        errorCount++
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
        errorCount++
        continue
      }

      console.log('✅ Slot creat')
      successCount++

      // 4. Associar professors
      let teachersFound = 0
      for (const teacherName of schedule.teachers) {
        const teacherId = await findTeacher(teacherName)
        if (teacherId) {
          await supabase
            .from('schedule_slot_teachers')
            .insert({
              schedule_slot_id: slot.id,
              teacher_id: teacherId
            })
          console.log(`   👨‍🏫 ${teacherName} ✓`)
          teachersFound++
        } else {
          console.log(`   👨‍🏫 ${teacherName} ✗`)
        }
      }
      if (teachersFound === 0 && schedule.teachers.length > 0) {
        console.warn('   ⚠️  Cap professor assignat!')
      }

      // 5. Associar aules
      let classroomsFound = 0
      for (const classroomCode of schedule.classrooms) {
        const classroomId = await findClassroom(classroomCode)
        if (classroomId) {
          await supabase
            .from('schedule_slot_classrooms')
            .insert({
              schedule_slot_id: slot.id,
              classroom_id: classroomId
            })
          console.log(`   🏫 ${classroomCode} ✓`)
          classroomsFound++
        } else {
          console.log(`   🏫 ${classroomCode} ✗`)
        }
      }
      if (classroomsFound === 0 && schedule.classrooms.length > 0) {
        console.warn('   ⚠️  Cap aula assignada!')
      }

    } catch (error) {
      console.error('❌ Error processant:', error)
      errorCount++
    }
  }

  console.log(`\n📊 Resum: ${successCount} èxits, ${errorCount} errors`)
  return { successCount, errorCount }
}

// Exportar funcions per usar en altres scripts
export { 
  importSchedule, 
  TEACHER_MAPPINGS,
  CLASSROOM_MAPPINGS,
  findTeacher,
  findClassroom
}

export type { ScheduleEntry }