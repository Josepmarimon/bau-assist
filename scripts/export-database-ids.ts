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

async function exportDatabaseIds() {
  console.log('📊 EXPORTANT IDs DE LA BASE DE DADES')
  console.log('====================================\n')

  const output: any = {
    export_date: new Date().toISOString(),
    description: "IDs únics de totes les entitats per importació d'horaris",
    student_groups: {},
    subjects: {},
    teachers: {},
    classrooms: {},
    semesters: {},
    academic_years: {}
  }

  try {
    // Exportar grups d'estudiants
    console.log('👥 Exportant grups d\'estudiants...')
    const { data: studentGroups } = await supabase
      .from('student_groups')
      .select('id, name, year, shift')
      .order('year', { ascending: true })
      .order('name', { ascending: true })

    studentGroups?.forEach(group => {
      output.student_groups[group.id] = {
        name: group.name,
        year: group.year,
        shift: group.shift
      }
    })
    console.log(`   ✅ ${studentGroups?.length || 0} grups`)

    // Exportar assignatures
    console.log('📚 Exportant assignatures...')
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
      .order('first_name', { ascending: true })

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

    // Exportar semestres
    console.log('📅 Exportant semestres...')
    const { data: semesters } = await supabase
      .from('semesters')
      .select('id, name, number, academic_year_id, start_date, end_date')
      .order('start_date', { ascending: false })

    semesters?.forEach(semester => {
      output.semesters[semester.id] = {
        name: semester.name,
        number: semester.number,
        academic_year_id: semester.academic_year_id,
        start_date: semester.start_date,
        end_date: semester.end_date
      }
    })
    console.log(`   ✅ ${semesters?.length || 0} semestres`)

    // Exportar anys acadèmics
    console.log('🎓 Exportant anys acadèmics...')
    const { data: academicYears } = await supabase
      .from('academic_years')
      .select('id, name, is_current')
      .order('name', { ascending: false })

    academicYears?.forEach(year => {
      output.academic_years[year.id] = {
        name: year.name,
        is_current: year.is_current
      }
    })
    console.log(`   ✅ ${academicYears?.length || 0} anys acadèmics`)

    // Crear fitxer de referència per facilitar la cerca
    const lookupTables: any = {
      export_date: output.export_date,
      lookup_helpers: {
        student_groups_by_name: {},
        subjects_by_code: {},
        subjects_by_name: {},
        teachers_by_name: {},
        classrooms_by_code: {}
      }
    }

    // Crear taules de cerca inversa
    Object.entries(output.student_groups).forEach(([id, group]: any) => {
      lookupTables.lookup_helpers.student_groups_by_name[group.name] = id
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

    // Guardar fitxers
    const timestamp = new Date().toISOString().split('T')[0]
    
    const mainFile = path.join(__dirname, `../data/database-ids-${timestamp}.json`)
    writeFileSync(mainFile, JSON.stringify(output, null, 2))
    console.log(`\n✅ Fitxer principal guardat: ${mainFile}`)

    const lookupFile = path.join(__dirname, `../data/database-lookup-${timestamp}.json`)
    writeFileSync(lookupFile, JSON.stringify(lookupTables, null, 2))
    console.log(`✅ Fitxer de cerca guardat: ${lookupFile}`)

    // Mostrar resum
    console.log('\n📊 RESUM')
    console.log('========')
    console.log(`Grups d'estudiants: ${Object.keys(output.student_groups).length}`)
    console.log(`Assignatures: ${Object.keys(output.subjects).length}`)
    console.log(`Professors: ${Object.keys(output.teachers).length}`)
    console.log(`Aules: ${Object.keys(output.classrooms).length}`)
    console.log(`Semestres: ${Object.keys(output.semesters).length}`)
    console.log(`Anys acadèmics: ${Object.keys(output.academic_years).length}`)

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

exportDatabaseIds().catch(console.error)