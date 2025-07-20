import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ScheduleClass {
  subject: string
  subject_code?: string
  group_type: 'teoria' | 'practica' | 'laboratori' | 'seminari'
  teachers: string[]
  classrooms: string[]
  day: number
  start_time: string
  end_time: string
  notes?: string
}

interface GroupSchedule {
  group: string
  semester: number
  classes: ScheduleClass[]
}

interface ImportTemplate {
  academic_year: string
  schedules: GroupSchedule[]
}

// Cache per optimitzar consultes
const cache = {
  teachers: new Map<string, string>(),
  subjects: new Map<string, string>(),
  classrooms: new Map<string, string>(),
  studentGroups: new Map<string, string>(),
  subjectGroups: new Map<string, string>()
}

async function preloadCache() {
  console.log('📦 Precarregant dades...')
  
  // Carregar professors
  const { data: teachers } = await supabase.from('teachers').select('id, first_name, last_name')
  teachers?.forEach(t => {
    const fullName = `${t.first_name} ${t.last_name}`.toLowerCase()
    cache.teachers.set(fullName, t.id)
  })
  
  // Carregar assignatures
  const { data: subjects } = await supabase.from('subjects').select('id, name, code')
  subjects?.forEach(s => {
    cache.subjects.set(s.name.toLowerCase(), s.id)
    if (s.code) cache.subjects.set(s.code.toLowerCase(), s.id)
  })
  
  // Carregar aules
  const { data: classrooms } = await supabase.from('classrooms').select('id, code')
  classrooms?.forEach(c => {
    cache.classrooms.set(c.code.toLowerCase(), c.id)
    // També mappejar sense punts
    cache.classrooms.set(c.code.replace(/\./g, '').toLowerCase(), c.id)
  })
  
  // Carregar grups d'estudiants
  const { data: studentGroups } = await supabase.from('student_groups').select('id, name')
  studentGroups?.forEach(g => {
    cache.studentGroups.set(g.name.toLowerCase(), g.id)
  })
  
  console.log(`✅ Cache carregat: ${cache.teachers.size} professors, ${cache.subjects.size} assignatures, ${cache.classrooms.size} aules`)
}

async function findOrCreateStudentGroup(groupName: string): Promise<string | null> {
  const cached = cache.studentGroups.get(groupName.toLowerCase())
  if (cached) return cached
  
  // Analitzar el nom del grup per extreure informació
  const parts = groupName.split(' ')
  const year = parseInt(parts[0].replace(/[^\d]/g, ''))
  const shift = groupName.toLowerCase().includes('matí') ? 'MORNING' : 'AFTERNOON'
  
  const { data, error } = await supabase
    .from('student_groups')
    .insert({
      name: groupName,
      year: year || 1,
      shift,
      max_students: 30 // Valor per defecte
    })
    .select('id')
    .single()
  
  if (!error && data) {
    cache.studentGroups.set(groupName.toLowerCase(), data.id)
    return data.id
  }
  
  console.error(`❌ Error creant grup ${groupName}:`, error)
  return null
}

async function findSubject(name: string, code?: string): Promise<string | null> {
  // Primer provar amb el codi si existeix
  if (code) {
    const cached = cache.subjects.get(code.toLowerCase())
    if (cached) return cached
  }
  
  // Després provar amb el nom
  const cached = cache.subjects.get(name.toLowerCase())
  if (cached) return cached
  
  // Si no està al cache, buscar variants
  const { data } = await supabase
    .from('subjects')
    .select('id')
    .ilike('name', `%${name}%`)
    .single()
  
  if (data) {
    cache.subjects.set(name.toLowerCase(), data.id)
    return data.id
  }
  
  console.warn(`⚠️  Assignatura no trobada: ${name}`)
  return null
}

async function findTeacher(fullName: string): Promise<string | null> {
  const cached = cache.teachers.get(fullName.toLowerCase())
  if (cached) return cached
  
  // Buscar per nom complet
  const { data } = await supabase
    .from('teachers')
    .select('id')
    .or(`first_name.ilike.%${fullName}%,last_name.ilike.%${fullName}%`)
    .single()
  
  if (data) {
    cache.teachers.set(fullName.toLowerCase(), data.id)
    return data.id
  }
  
  console.warn(`⚠️  Professor no trobat: ${fullName}`)
  return null
}

async function findClassroom(code: string): Promise<string | null> {
  const cached = cache.classrooms.get(code.toLowerCase())
  if (cached) return cached
  
  // Provar variants
  const variants = [
    code,
    code.replace(/\./g, ''),
    code.replace(/([A-Za-z])(\d)/, '$1.$2')
  ]
  
  for (const variant of variants) {
    const cached = cache.classrooms.get(variant.toLowerCase())
    if (cached) return cached
  }
  
  console.warn(`⚠️  Aula no trobada: ${code}`)
  return null
}

async function validateNoConflicts(
  day: number,
  startTime: string,
  endTime: string,
  semester: number,
  studentGroupId: string,
  teacherIds: string[],
  classroomIds: string[]
): Promise<{ valid: boolean; conflicts: string[] }> {
  const conflicts: string[] = []
  
  // Obtenir el semester actual
  const { data: currentSemester } = await supabase
    .from('semesters')
    .select('id')
    .eq('number', semester)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  
  if (!currentSemester) {
    conflicts.push('Semestre no trobat')
    return { valid: false, conflicts }
  }
  
  // Comprovar conflictes de grup d'estudiants
  const { data: groupConflicts } = await supabase
    .from('schedule_slots')
    .select('subject:subjects(name)')
    .eq('student_group_id', studentGroupId)
    .eq('day_of_week', day)
    .eq('semester', semester)
    .or(`start_time.lte.${startTime},end_time.gte.${endTime}`)
  
  if (groupConflicts && groupConflicts.length > 0) {
    conflicts.push(`Grup ja té classe: ${groupConflicts[0].subject?.name}`)
  }
  
  // Comprovar conflictes de professors
  for (const teacherId of teacherIds) {
    const { data: teacherSlots } = await supabase
      .from('schedule_slot_teachers')
      .select(`
        schedule_slot:schedule_slots(
          subject:subjects(name),
          start_time,
          end_time
        )
      `)
      .eq('teacher_id', teacherId)
    
    const hasConflict = teacherSlots?.some(slot => {
      const s = slot.schedule_slot as any
      return s?.start_time <= startTime && s?.end_time >= endTime
    })
    
    if (hasConflict) {
      conflicts.push(`Professor ocupat`)
    }
  }
  
  // Comprovar conflictes d'aules
  for (const classroomId of classroomIds) {
    const { data: classroomSlots } = await supabase
      .from('schedule_slot_classrooms')
      .select(`
        schedule_slot:schedule_slots(
          subject:subjects(name),
          start_time,
          end_time,
          day_of_week,
          semester
        )
      `)
      .eq('classroom_id', classroomId)
    
    const hasConflict = classroomSlots?.some(slot => {
      const s = slot.schedule_slot as any
      return s?.day_of_week === day && 
             s?.semester === semester &&
             s?.start_time <= startTime && 
             s?.end_time >= endTime
    })
    
    if (hasConflict) {
      const { data: classroom } = await supabase
        .from('classrooms')
        .select('code')
        .eq('id', classroomId)
        .single()
      conflicts.push(`Aula ${classroom?.code} ocupada`)
    }
  }
  
  return { valid: conflicts.length === 0, conflicts }
}

async function importSchedule(filePath: string) {
  console.log('🚀 IMPORTACIÓ D\'HORARIS AMB VALIDACIONS')
  console.log('=====================================\n')
  
  try {
    // Carregar cache
    await preloadCache()
    
    // Llegir fitxer
    const fileContent = readFileSync(filePath, 'utf-8')
    const data: ImportTemplate = JSON.parse(fileContent)
    
    console.log(`📅 Any acadèmic: ${data.academic_year}`)
    console.log(`📊 Grups a importar: ${data.schedules.length}\n`)
    
    let totalClasses = 0
    let successfulImports = 0
    let failedImports = 0
    let skippedDueToConflicts = 0
    
    // Processar cada grup
    for (const groupSchedule of data.schedules) {
      console.log(`\n👥 Processant grup: ${groupSchedule.group}`)
      console.log(`   Semestre: ${groupSchedule.semester}`)
      console.log(`   Classes: ${groupSchedule.classes.length}`)
      
      // Trobar o crear el grup d'estudiants
      const studentGroupId = await findOrCreateStudentGroup(groupSchedule.group)
      if (!studentGroupId) {
        console.error(`   ❌ No s'ha pogut trobar/crear el grup`)
        failedImports += groupSchedule.classes.length
        continue
      }
      
      // Processar cada classe
      for (const scheduleClass of groupSchedule.classes) {
        totalClasses++
        
        console.log(`\n   📚 ${scheduleClass.subject} (${scheduleClass.group_type})`)
        console.log(`      📅 Dia ${scheduleClass.day}, ${scheduleClass.start_time}-${scheduleClass.end_time}`)
        
        // Trobar assignatura
        const subjectId = await findSubject(scheduleClass.subject, scheduleClass.subject_code)
        if (!subjectId) {
          console.error(`      ❌ Assignatura no trobada`)
          failedImports++
          continue
        }
        
        // Trobar professors
        const teacherIds: string[] = []
        for (const teacherName of scheduleClass.teachers) {
          const teacherId = await findTeacher(teacherName)
          if (teacherId) teacherIds.push(teacherId)
        }
        
        if (teacherIds.length === 0 && scheduleClass.teachers.length > 0) {
          console.warn(`      ⚠️  Cap professor trobat`)
        }
        
        // Trobar aules
        const classroomIds: string[] = []
        for (const classroomCode of scheduleClass.classrooms) {
          const classroomId = await findClassroom(classroomCode)
          if (classroomId) classroomIds.push(classroomId)
        }
        
        if (classroomIds.length === 0) {
          console.error(`      ❌ Cap aula trobada`)
          failedImports++
          continue
        }
        
        // Validar conflictes
        const { valid, conflicts } = await validateNoConflicts(
          scheduleClass.day,
          scheduleClass.start_time,
          scheduleClass.end_time,
          groupSchedule.semester,
          studentGroupId,
          teacherIds,
          classroomIds
        )
        
        if (!valid) {
          console.error(`      ❌ Conflictes detectats:`)
          conflicts.forEach(c => console.error(`         - ${c}`))
          skippedDueToConflicts++
          continue
        }
        
        // Crear schedule_slot
        const { data: scheduleSlot, error: slotError } = await supabase
          .from('schedule_slots')
          .insert({
            student_group_id: studentGroupId,
            subject_id: subjectId,
            day_of_week: scheduleClass.day,
            start_time: scheduleClass.start_time + ':00',
            end_time: scheduleClass.end_time + ':00',
            academic_year: data.academic_year,
            semester: groupSchedule.semester
          })
          .select('id')
          .single()
        
        if (slotError || !scheduleSlot) {
          console.error(`      ❌ Error creant slot:`, slotError)
          failedImports++
          continue
        }
        
        // Assignar professors
        if (teacherIds.length > 0) {
          const teacherAssignments = teacherIds.map(teacher_id => ({
            schedule_slot_id: scheduleSlot.id,
            teacher_id
          }))
          
          const { error: teacherError } = await supabase
            .from('schedule_slot_teachers')
            .insert(teacherAssignments)
          
          if (teacherError) {
            console.error(`      ⚠️  Error assignant professors:`, teacherError)
          }
        }
        
        // Assignar aules
        const classroomAssignments = classroomIds.map(classroom_id => ({
          schedule_slot_id: scheduleSlot.id,
          classroom_id
        }))
        
        const { error: classroomError } = await supabase
          .from('schedule_slot_classrooms')
          .insert(classroomAssignments)
        
        if (classroomError) {
          console.error(`      ❌ Error assignant aules:`, classroomError)
          failedImports++
          continue
        }
        
        console.log(`      ✅ Importat correctament`)
        console.log(`         Professors: ${teacherIds.length}`)
        console.log(`         Aules: ${classroomIds.join(', ')}`)
        if (scheduleClass.notes) {
          console.log(`         Notes: ${scheduleClass.notes}`)
        }
        
        successfulImports++
      }
    }
    
    // Resum final
    console.log('\n\n📊 RESUM DE LA IMPORTACIÓ')
    console.log('========================')
    console.log(`✅ Importats correctament: ${successfulImports}`)
    console.log(`⏭️  Omesos per conflictes: ${skippedDueToConflicts}`)
    console.log(`❌ Errors: ${failedImports}`)
    console.log(`📋 Total processat: ${totalClasses}`)
    console.log(`📈 Taxa d'èxit: ${((successfulImports/totalClasses)*100).toFixed(1)}%`)
    
  } catch (error) {
    console.error('💥 Error fatal:', error)
    process.exit(1)
  }
}

// Executar importació
const templatePath = process.argv[2] || path.join(__dirname, '../data/schedule-import-template.json')

if (!templatePath) {
  console.error('ℹ️  Ús: npm run import-schedule [path-to-json]')
  console.error('    Exemple: npm run import-schedule data/my-schedule.json')
  process.exit(1)
}

importSchedule(templatePath).catch(console.error)