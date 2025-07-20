import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function findScheduleIds() {
  console.log('🔍 CERCANT IDs PER L\'HORARI 1r DISSENY M1')
  console.log('==========================================\n')

  // ASSIGNATURES 1r SEMESTRE
  const subjects1stSem = [
    'Fonaments del Disseny I',
    'Taller de Dibuix Artístic',
    'Taller d\'Expressió i Comunicació',
    'Iconografia i Comunicació',
    'Eines Informatiques I'
  ]

  // ASSIGNATURES 2n SEMESTRE
  const subjects2ndSem = [
    'Fonaments del Disseny II',
    'Taller de Color',
    'Antropologia Sociocultural',
    'Estètica i Teoria de les Arts',
    'Eines Informatiques II'
  ]

  // PROFESSORS
  const teachers = [
    'Laura Ginés',
    'Montse Casacuberta',
    'Marta Camps',
    'Jorge Luis Marzo',
    'Anna Farré',
    'Elisenda Fontarnau',
    'Pau Pericas',
    'Marina Riera',
    'Alejandra López Gabrielidis',
    'Glòria Deumal',
    'Ricard Marimon',
    'Daniel Tahmaz'
  ]

  // AULES
  const classrooms = [
    'P.1.5', 'P1.5',
    'L.0.1', 'L0.1',
    'G.1.1', 'G1.1',
    'P.0.12', 'P0.12',
    'P.1.2', 'P1.2',
    'P.1.3', 'P1.3',
    'P.1.8', 'P1.8',
    'P.1.12', 'P1.12',
    'G.2.1', 'G2.1',
    'P.1.16', 'P1.16',
    'Platós', 'Sala Carolines'
  ]

  console.log('📚 ASSIGNATURES 1r SEMESTRE')
  console.log('===========================')
  
  for (const subjectName of subjects1stSem) {
    const { data: subject } = await supabase
      .from('subjects')
      .select('id, code, name')
      .ilike('name', `%${subjectName}%`)
      .single()
    
    if (subject) {
      console.log(`\n${subjectName}:`)
      console.log(`  Subject ID: ${subject.id}`)
      console.log(`  Codi: ${subject.code}`)
      
      // Buscar grups M1
      const { data: groups } = await supabase
        .from('subject_groups')
        .select('id, group_code')
        .eq('subject_id', subject.id)
        .ilike('group_code', '%M1%')
      
      if (groups && groups.length > 0) {
        groups.forEach(g => {
          console.log(`  Group ${g.group_code}: ${g.id}`)
        })
      }
    }
  }

  console.log('\n\n📚 ASSIGNATURES 2n SEMESTRE')
  console.log('===========================')
  
  for (const subjectName of subjects2ndSem) {
    const { data: subject } = await supabase
      .from('subjects')
      .select('id, code, name')
      .ilike('name', `%${subjectName}%`)
      .single()
    
    if (subject) {
      console.log(`\n${subjectName}:`)
      console.log(`  Subject ID: ${subject.id}`)
      console.log(`  Codi: ${subject.code}`)
      
      // Buscar grups M1
      const { data: groups } = await supabase
        .from('subject_groups')
        .select('id, group_code')
        .eq('subject_id', subject.id)
        .ilike('group_code', '%M1%')
      
      if (groups && groups.length > 0) {
        groups.forEach(g => {
          console.log(`  Group ${g.group_code}: ${g.id}`)
        })
      }
    }
  }

  console.log('\n\n👥 PROFESSORS')
  console.log('=============')
  
  for (const teacherName of teachers) {
    const names = teacherName.split(' ')
    const firstName = names[0]
    const lastName = names.slice(1).join(' ')
    
    const { data: teacher } = await supabase
      .from('teachers')
      .select('id, code, first_name, last_name')
      .ilike('first_name', `%${firstName}%`)
      .ilike('last_name', `%${lastName}%`)
      .single()
    
    if (teacher) {
      console.log(`${teacherName}: ${teacher.id}`)
    } else {
      console.log(`${teacherName}: ❌ NO TROBAT`)
    }
  }

  console.log('\n\n🏫 AULES')
  console.log('========')
  
  const uniqueClassrooms = [...new Set(classrooms)]
  for (const classroomCode of uniqueClassrooms) {
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('id, code, name, capacity')
      .or(`code.eq.${classroomCode},code.eq.${classroomCode.replace('.', '')}`)
      .single()
    
    if (classroom) {
      console.log(`${classroom.code}: ${classroom.id} (capacitat: ${classroom.capacity})`)
    } else {
      console.log(`${classroomCode}: ❌ NO TROBAT`)
    }
  }

  console.log('\n\n🕐 TIME SLOTS')
  console.log('=============')
  
  // Franges horàries de l'horari
  const timeSlots = [
    { day: 1, start: '09:00:00', end: '11:00:00' }, // Dilluns matí
    { day: 1, start: '11:30:00', end: '13:30:00' }, // Dilluns matí
    { day: 2, start: '09:00:00', end: '11:00:00' }, // Dimarts matí
    { day: 2, start: '11:30:00', end: '13:30:00' }, // Dimarts matí
    { day: 3, start: '09:00:00', end: '11:00:00' }, // Dimecres matí
    { day: 3, start: '11:30:00', end: '13:30:00' }, // Dimecres matí
    { day: 4, start: '09:00:00', end: '11:00:00' }, // Dijous matí
    { day: 4, start: '11:30:00', end: '13:30:00' }, // Dijous matí
    { day: 5, start: '09:00:00', end: '11:00:00' }, // Divendres matí
    { day: 5, start: '11:30:00', end: '13:30:00' }, // Divendres matí
  ]

  const days = ['', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']
  
  for (const slot of timeSlots) {
    const { data: timeSlot } = await supabase
      .from('time_slots')
      .select('id')
      .eq('day_of_week', slot.day)
      .eq('start_time', slot.start)
      .eq('end_time', slot.end)
      .single()
    
    if (timeSlot) {
      console.log(`${days[slot.day]} ${slot.start.slice(0,5)}-${slot.end.slice(0,5)}: ${timeSlot.id}`)
    }
  }

  console.log('\n\n📅 SEMESTRES')
  console.log('============')
  
  const { data: semesters } = await supabase
    .from('semesters')
    .select('id, name, number')
    .order('number', { ascending: true })
  
  semesters?.forEach(s => {
    console.log(`Semestre ${s.number}: ${s.id} (${s.name})`)
  })
}

findScheduleIds().catch(console.error)