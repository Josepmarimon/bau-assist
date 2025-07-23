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

interface SubjectGroupAssignment {
  subject_group_id: string
  semester_id: string
  teacher_ids: string[]
  classroom_ids: string[]
  time_slot_id: string
  hours_per_week: number
  color?: string
  notes?: string
}

interface ImportData {
  version: string
  assignments: SubjectGroupAssignment[]
}

// Cache per optimitzar consultes
const cache = {
  subjectGroups: new Map<string, any>(),
  teachers: new Map<string, any>(),
  classrooms: new Map<string, any>(),
  timeSlots: new Map<string, any>()
}

// Validar UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Precarregar dades al cache
async function preloadCache() {
  console.log('📦 Precarregant dades...')
  
  // Carregar grups d'assignatures
  const { data: subjectGroups } = await supabase
    .from('subject_groups')
    .select(`
      id,
      group_code,
      max_students,
      subject:subjects (
        id,
        code,
        name
      )
    `)
  
  subjectGroups?.forEach(sg => {
    cache.subjectGroups.set(sg.id, sg)
  })
  
  // Carregar professors
  const { data: teachers } = await supabase
    .from('teachers')
    .select('id, first_name, last_name, code')
  
  teachers?.forEach(t => {
    cache.teachers.set(t.id, t)
  })
  
  // Carregar aules
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('id, code, capacity, type')
  
  classrooms?.forEach(c => {
    cache.classrooms.set(c.id, c)
  })
  
  // Carregar time slots
  const { data: timeSlots } = await supabase
    .from('time_slots')
    .select('id, day_of_week, start_time, end_time')
  
  timeSlots?.forEach(ts => {
    cache.timeSlots.set(ts.id, ts)
  })
  
  console.log(`✅ Cache carregat: ${cache.subjectGroups.size} grups, ${cache.teachers.size} professors, ${cache.classrooms.size} aules, ${cache.timeSlots.size} franges`)
}

// Validar existència d'entitat
async function validateEntity(table: string, id: string, cache: Map<string, any>): Promise<boolean> {
  if (cache.has(id)) return true
  
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('id', id)
  
  return count !== null && count > 0
}

// Comprovar conflictes
async function checkConflicts(
  assignment: SubjectGroupAssignment,
  timeSlot: any
): Promise<{ hasConflicts: boolean; conflicts: string[] }> {
  const conflicts: string[] = []
  
  // Comprovar conflictes de professors
  for (const teacherId of assignment.teacher_ids) {
    const { data: existingAssignments } = await supabase
      .from('assignments')
      .select(`
        id,
        subject_group:subject_groups (
          group_code,
          subject:subjects (
            name
          )
        )
      `)
      .eq('teacher_id', teacherId)
      .eq('time_slot_id', assignment.time_slot_id)
      .eq('semester_id', assignment.semester_id)
    
    if (existingAssignments && existingAssignments.length > 0) {
      const teacher = cache.teachers.get(teacherId)
      const existing = existingAssignments[0]
      conflicts.push(
        `Professor ${teacher?.first_name} ${teacher?.last_name} ja assignat a ${existing.subject_group && typeof existing.subject_group === 'object' && 'subject' in existing.subject_group && existing.subject_group.subject && typeof existing.subject_group.subject === 'object' && 'name' in existing.subject_group.subject ? existing.subject_group.subject.name : 'Unknown'} (${existing.subject_group && typeof existing.subject_group === 'object' && 'group_code' in existing.subject_group ? existing.subject_group.group_code : 'Unknown'})`
      )
    }
  }
  
  // Comprovar conflictes d'aules
  for (const classroomId of assignment.classroom_ids) {
    const { data: existingAssignments } = await supabase
      .from('assignments')
      .select(`
        id,
        subject_group:subject_groups (
          group_code,
          subject:subjects (
            name
          )
        )
      `)
      .eq('classroom_id', classroomId)
      .eq('time_slot_id', assignment.time_slot_id)
      .eq('semester_id', assignment.semester_id)
    
    if (existingAssignments && existingAssignments.length > 0) {
      const classroom = cache.classrooms.get(classroomId)
      const existing = existingAssignments[0]
      conflicts.push(
        `Aula ${classroom?.code} ja ocupada per ${existing.subject_group && typeof existing.subject_group === 'object' && 'subject' in existing.subject_group && existing.subject_group.subject && typeof existing.subject_group.subject === 'object' && 'name' in existing.subject_group.subject ? existing.subject_group.subject.name : 'Unknown'} (${existing.subject_group && typeof existing.subject_group === 'object' && 'group_code' in existing.subject_group ? existing.subject_group.group_code : 'Unknown'})`
      )
    }
  }
  
  // Comprovar capacitat d'aules
  const subjectGroup = cache.subjectGroups.get(assignment.subject_group_id)
  if (subjectGroup) {
    for (const classroomId of assignment.classroom_ids) {
      const classroom = cache.classrooms.get(classroomId)
      if (classroom && classroom.capacity < subjectGroup.max_students) {
        conflicts.push(
          `Aula ${classroom.code} té capacitat ${classroom.capacity} però el grup necessita ${subjectGroup.max_students}`
        )
      }
    }
  }
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  }
}

async function importSubjectGroupsSchedule(filePath: string) {
  console.log('🚀 IMPORTACIÓ D\'HORARIS PER GRUPS D\'ASSIGNATURES')
  console.log('===============================================\n')
  console.log(`📄 Fitxer: ${filePath}\n`)
  
  try {
    // Precarregar cache
    await preloadCache()
    
    // Llegir fitxer
    const fileContent = readFileSync(filePath, 'utf-8')
    const data: ImportData = JSON.parse(fileContent)
    
    // Validar versió
    if (data.version !== '3.0') {
      throw new Error(`Versió incorrecta. Esperada: 3.0, Trobada: ${data.version}`)
    }
    
    console.log(`📊 Total assignacions a processar: ${data.assignments.length}\n`)
    
    let successCount = 0
    let errorCount = 0
    let conflictCount = 0
    
    // Processar cada assignació
    for (let i = 0; i < data.assignments.length; i++) {
      const assignment = data.assignments[i]
      console.log(`\n[${i + 1}/${data.assignments.length}] Processant assignació...`)
      
      // Obtenir informació del grup
      const subjectGroup = cache.subjectGroups.get(assignment.subject_group_id)
      if (!subjectGroup) {
        console.error(`❌ Grup d'assignatura no trobat: ${assignment.subject_group_id}`)
        errorCount++
        continue
      }
      
      console.log(`📚 ${subjectGroup.subject?.name} - ${subjectGroup.group_code}`)
      
      // Validar IDs
      let hasError = false
      
      // Validar subject_group_id
      if (!isValidUUID(assignment.subject_group_id)) {
        console.error(`   ❌ subject_group_id no és un UUID vàlid`)
        hasError = true
      }
      
      // Validar semester_id
      if (!isValidUUID(assignment.semester_id)) {
        console.error(`   ❌ semester_id no és un UUID vàlid`)
        hasError = true
      }
      
      // Validar time_slot_id
      if (!isValidUUID(assignment.time_slot_id)) {
        console.error(`   ❌ time_slot_id no és un UUID vàlid`)
        hasError = true
      } else if (!cache.timeSlots.has(assignment.time_slot_id)) {
        console.error(`   ❌ time_slot_id no existeix: ${assignment.time_slot_id}`)
        hasError = true
      }
      
      // Validar teacher_ids
      for (const teacherId of assignment.teacher_ids) {
        if (!isValidUUID(teacherId)) {
          console.error(`   ❌ teacher_id no és un UUID vàlid: ${teacherId}`)
          hasError = true
        } else if (!cache.teachers.has(teacherId)) {
          console.error(`   ❌ teacher_id no existeix: ${teacherId}`)
          hasError = true
        }
      }
      
      // Validar classroom_ids
      if (assignment.classroom_ids.length === 0) {
        console.error(`   ❌ Cal especificar almenys una aula`)
        hasError = true
      }
      
      for (const classroomId of assignment.classroom_ids) {
        if (!isValidUUID(classroomId)) {
          console.error(`   ❌ classroom_id no és un UUID vàlid: ${classroomId}`)
          hasError = true
        } else if (!cache.classrooms.has(classroomId)) {
          console.error(`   ❌ classroom_id no existeix: ${classroomId}`)
          hasError = true
        }
      }
      
      if (hasError) {
        errorCount++
        continue
      }
      
      // Mostrar informació de l'assignació
      const timeSlot = cache.timeSlots.get(assignment.time_slot_id)
      const days = ['', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']
      console.log(`   📅 ${days[timeSlot.day_of_week]} ${timeSlot.start_time.slice(0,5)}-${timeSlot.end_time.slice(0,5)}`)
      
      const teacherNames = assignment.teacher_ids.map(id => {
        const t = cache.teachers.get(id)
        return `${t?.first_name} ${t?.last_name}`
      })
      console.log(`   👥 Professors: ${teacherNames.join(', ')}`)
      
      const classroomCodes = assignment.classroom_ids.map(id => cache.classrooms.get(id)?.code)
      console.log(`   🏫 Aules: ${classroomCodes.join(', ')}`)
      
      // Comprovar conflictes
      const { hasConflicts, conflicts } = await checkConflicts(assignment, timeSlot)
      
      if (hasConflicts) {
        console.error(`   ⚠️  Conflictes detectats:`)
        conflicts.forEach(c => console.error(`      - ${c}`))
        conflictCount++
        continue
      }
      
      // Crear assignacions per cada combinació professor-aula
      let createdCount = 0
      let failedCount = 0
      
      // Si no hi ha professors, crear una assignació sense professor
      const teacherList = assignment.teacher_ids.length > 0 ? assignment.teacher_ids : [null]
      
      for (const teacherId of teacherList) {
        for (const classroomId of assignment.classroom_ids) {
          // Obtenir subject_id del grup
          const { data: subjectGroupData } = await supabase
            .from('subject_groups')
            .select('subject_id')
            .eq('id', assignment.subject_group_id)
            .single()
          
          if (!subjectGroupData) {
            console.error(`      ❌ No s'ha pogut obtenir subject_id`)
            failedCount++
            continue
          }
          
          const { error } = await supabase
            .from('assignments')
            .insert({
              semester_id: assignment.semester_id,
              subject_id: subjectGroupData.subject_id,
              subject_group_id: assignment.subject_group_id,
              teacher_id: teacherId,
              classroom_id: classroomId,
              time_slot_id: assignment.time_slot_id,
              hours_per_week: assignment.hours_per_week,
              color: assignment.color || '#3B82F6',
              notes: assignment.notes
            })
          
          if (error) {
            console.error(`      ❌ Error creant assignació:`, error.message)
            failedCount++
          } else {
            createdCount++
          }
        }
      }
      
      if (createdCount > 0) {
        console.log(`   ✅ ${createdCount} assignacions creades correctament`)
        successCount++
      } else {
        console.error(`   ❌ No s'ha pogut crear cap assignació`)
        errorCount++
      }
    }
    
    // Resum final
    console.log('\n' + '='.repeat(50))
    console.log('\n📊 RESUM DE LA IMPORTACIÓ')
    console.log('========================')
    console.log(`✅ Èxit: ${successCount}`)
    console.log(`⚠️  Conflictes: ${conflictCount}`)
    console.log(`❌ Errors: ${errorCount}`)
    console.log(`📋 Total processat: ${data.assignments.length}`)
    
    const successRate = data.assignments.length > 0 
      ? ((successCount / data.assignments.length) * 100).toFixed(1)
      : 0
    console.log(`📈 Taxa d'èxit: ${successRate}%`)
    
    if (errorCount === 0 && conflictCount === 0) {
      console.log('\n🎉 IMPORTACIÓ PERFECTA! Totes les assignacions s\'han creat correctament!')
    }
    
  } catch (error) {
    console.error('\n💥 Error fatal:', error)
    process.exit(1)
  }
}

// Executar
const filePath = process.argv[2]

if (!filePath) {
  console.error('❌ Cal especificar el fitxer JSON a importar')
  console.error('ℹ️  Ús: npm run import-subject-groups-schedule data/horari-grups.json')
  console.error('\n📝 Workflow:')
  console.error('   1. npm run export-subject-groups')
  console.error('   2. Crea el fitxer JSON amb les assignacions')
  console.error('   3. npm run import-subject-groups-schedule data/fitxer.json')
  process.exit(1)
}

importSubjectGroupsSchedule(filePath).catch(console.error)