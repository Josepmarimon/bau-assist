import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { writeFileSync } from 'fs'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function exportSubjectGroupsData() {
  console.log('📊 EXPORTANT DADES PER ASSIGNACIÓ D\'HORARIS')
  console.log('==========================================\n')

  const output: any = {
    export_date: new Date().toISOString(),
    description: "Dades per importació d'horaris basada en grups d'assignatures",
    subject_groups: {},
    subjects: {},
    teachers: {},
    classrooms: {},
    semesters: {},
    time_slots: {}
  }

  try {
    // Exportar grups d'assignatures amb informació completa
    console.log('📚 Exportant grups d\'assignatures...')
    const { data: subjectGroups, error } = await supabase
      .from('subject_groups')
      .select(`
        id,
        group_code,
        max_students,
        semester_id,
        subject:subjects (
          id,
          code,
          name,
          year,
          type,
          credits
        ),
        semester:semesters (
          id,
          name,
          number,
          academic_year:academic_years (
            name
          )
        )
      `)
      .order('group_code', { ascending: true })
    
    if (error) {
      console.error('❌ Error carregant subject_groups:', error)
    }

    subjectGroups?.forEach(group => {
      // Inferir el tipus de grup del codi
      let groupType = 'GENERAL'
      const code = group.group_code.toUpperCase()
      
      if (code.includes('_TEORIA') || code.includes('-T') || code.endsWith('T')) {
        groupType = 'THEORY'
      } else if (code.includes('_PRACTICA') || code.includes('-P') || code.includes('M')) {
        groupType = 'PRACTICE'
      } else if (code.includes('_LAB') || code.includes('LAB')) {
        groupType = 'LABORATORY'
      } else if (code.includes('_SEM') || code.includes('SEM')) {
        groupType = 'SEMINAR'
      }
      
      output.subject_groups[group.id] = {
        group_code: group.group_code,
        group_type_inferred: groupType,
        max_students: group.max_students,
        semester_id: group.semester_id,
        subject: {
          id: group.subject && 'id' in group.subject ? group.subject.id : null,
          code: group.subject && 'code' in group.subject ? group.subject.code : null,
          name: group.subject && 'name' in group.subject ? group.subject.name : null,
          year: group.subject && 'year' in group.subject ? group.subject.year : null
        },
        semester_info: {
          name: group.semester && typeof group.semester === 'object' && 'name' in group.semester ? group.semester.name : null,
          number: group.semester && typeof group.semester === 'object' && 'number' in group.semester ? group.semester.number : null,
          academic_year: group.semester && typeof group.semester === 'object' && 'academic_year' in group.semester && group.semester.academic_year && typeof group.semester.academic_year === 'object' && 'name' in group.semester.academic_year ? group.semester.academic_year.name : null
        }
      }
    })
    console.log(`   ✅ ${subjectGroups?.length || 0} grups d'assignatures`)

    // Exportar assignatures
    console.log('📖 Exportant assignatures...')
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, code, name, year, type, credits')
      .order('year', { ascending: true })
      .order('name', { ascending: true })

    subjects?.forEach(subject => {
      output.subjects[subject.id] = {
        code: subject.code,
        name: subject.name,
        year: subject.year,
        type: subject.type,
        credits: subject.credits
      }
    })
    console.log(`   ✅ ${subjects?.length || 0} assignatures`)

    // Exportar professors
    console.log('👨‍🏫 Exportant professors...')
    const { data: teachers } = await supabase
      .from('teachers')
      .select('id, code, first_name, last_name, email, department')
      .order('last_name', { ascending: true })

    teachers?.forEach(teacher => {
      output.teachers[teacher.id] = {
        code: teacher.code,
        full_name: `${teacher.first_name} ${teacher.last_name}`,
        email: teacher.email,
        department: teacher.department
      }
    })
    console.log(`   ✅ ${teachers?.length || 0} professors`)

    // Exportar aules
    console.log('🏫 Exportant aules...')
    const { data: classrooms } = await supabase
      .from('classrooms')
      .select('id, code, name, building, capacity, type')
      .order('building', { ascending: true })
      .order('code', { ascending: true })

    classrooms?.forEach(classroom => {
      output.classrooms[classroom.id] = {
        code: classroom.code,
        name: classroom.name,
        building: classroom.building,
        capacity: classroom.capacity,
        type: classroom.type
      }
    })
    console.log(`   ✅ ${classrooms?.length || 0} aules`)

    // Exportar time slots
    console.log('🕐 Exportant franges horàries...')
    const { data: timeSlots } = await supabase
      .from('time_slots')
      .select('id, day_of_week, start_time, end_time, slot_type')
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })

    timeSlots?.forEach(slot => {
      const dayNames = ['', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']
      output.time_slots[slot.id] = {
        day_of_week: slot.day_of_week,
        day_name: dayNames[slot.day_of_week],
        start_time: slot.start_time,
        end_time: slot.end_time,
        slot_type: slot.slot_type,
        display: `${dayNames[slot.day_of_week]} ${slot.start_time.slice(0,5)}-${slot.end_time.slice(0,5)}`
      }
    })
    console.log(`   ✅ ${timeSlots?.length || 0} franges horàries`)

    // Exportar semestres
    console.log('📅 Exportant semestres...')
    const { data: semesters } = await supabase
      .from('semesters')
      .select(`
        id,
        name,
        number,
        academic_year:academic_years (
          name
        )
      `)
      .order('name', { ascending: false })

    semesters?.forEach(semester => {
      output.semesters[semester.id] = {
        name: semester.name,
        number: semester.number,
        academic_year: semester.academic_year && typeof semester.academic_year === 'object' && 'name' in semester.academic_year ? semester.academic_year.name : null
      }
    })
    console.log(`   ✅ ${semesters?.length || 0} semestres`)

    // Crear lookup tables per facilitar la cerca
    const lookupTables: any = {
      export_date: output.export_date,
      lookup_helpers: {
        subject_groups_by_code: {},
        subjects_by_code: {},
        subjects_by_name: {},
        teachers_by_name: {},
        classrooms_by_code: {},
        time_slots_by_day_and_time: {}
      }
    }

    // Crear taules de cerca inversa
    Object.entries(output.subject_groups).forEach(([id, group]: any) => {
      lookupTables.lookup_helpers.subject_groups_by_code[group.group_code] = id
    })

    Object.entries(output.subjects).forEach(([id, subject]: any) => {
      lookupTables.lookup_helpers.subjects_by_code[subject.code] = id
      lookupTables.lookup_helpers.subjects_by_name[subject.name] = id
    })

    Object.entries(output.teachers).forEach(([id, teacher]: any) => {
      lookupTables.lookup_helpers.teachers_by_name[teacher.full_name] = id
    })

    Object.entries(output.classrooms).forEach(([id, classroom]: any) => {
      lookupTables.lookup_helpers.classrooms_by_code[classroom.code] = id
    })

    Object.entries(output.time_slots).forEach(([id, slot]: any) => {
      const key = `${slot.day_of_week}-${slot.start_time}-${slot.end_time}`
      lookupTables.lookup_helpers.time_slots_by_day_and_time[key] = id
    })

    // Guardar fitxers
    const timestamp = new Date().toISOString().split('T')[0]
    
    const mainFile = path.join(__dirname, `../data/subject-groups-data-${timestamp}.json`)
    writeFileSync(mainFile, JSON.stringify(output, null, 2))
    console.log(`\n✅ Fitxer de dades guardat: ${mainFile}`)

    const lookupFile = path.join(__dirname, `../data/subject-groups-lookup-${timestamp}.json`)
    writeFileSync(lookupFile, JSON.stringify(lookupTables, null, 2))
    console.log(`✅ Fitxer de cerca guardat: ${lookupFile}`)

    // Mostrar exemples d'ús
    console.log('\n📋 EXEMPLES DE GRUPS D\'ASSIGNATURES')
    console.log('===================================')
    const examples = Object.entries(output.subject_groups).slice(0, 5)
    examples.forEach(([id, group]: any) => {
      console.log(`\n${group.group_code} (${group.group_type_inferred})`)
      console.log(`   ID: ${id}`)
      console.log(`   Assignatura: ${group.subject?.name} (${group.subject?.code})`)
      console.log(`   Capacitat: ${group.max_students} estudiants`)
      console.log(`   Semestre: ${group.semester_info?.name}`)
    })

    // Resum
    console.log('\n📊 RESUM')
    console.log('========')
    console.log(`Grups d'assignatures: ${Object.keys(output.subject_groups).length}`)
    console.log(`Assignatures: ${Object.keys(output.subjects).length}`)
    console.log(`Professors: ${Object.keys(output.teachers).length}`)
    console.log(`Aules: ${Object.keys(output.classrooms).length}`)
    console.log(`Franges horàries: ${Object.keys(output.time_slots).length}`)
    console.log(`Semestres: ${Object.keys(output.semesters).length}`)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

exportSubjectGroupsData().catch(console.error)