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

interface ScheduleClassWithIds {
  subject_id: string
  group_type: 'THEORY' | 'PRACTICE' | 'LABORATORY' | 'SEMINAR'
  teacher_ids: string[]
  classroom_ids: string[]
  day_of_week: number
  start_time: string
  end_time: string
  notes?: string
}

interface ScheduleWithIds {
  student_group_id: string
  semester_id: string
  classes: ScheduleClassWithIds[]
}

interface ImportData {
  version: string
  schedules: ScheduleWithIds[]
}

// Validar format UUID
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(uuid)
}

// Validar que existeix a la BD
async function validateEntityExists(table: string, id: string): Promise<boolean> {
  const { count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true })
    .eq('id', id)
  
  return count !== null && count > 0
}

// Validar format de temps
function isValidTime(time: string): boolean {
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/
  return timeRegex.test(time)
}

// Validar conflictes
async function checkForConflicts(
  studentGroupId: string,
  semesterId: string,
  dayOfWeek: number,
  startTime: string,
  endTime: string,
  teacherIds: string[],
  classroomIds: string[]
): Promise<{ hasConflicts: boolean; conflicts: string[] }> {
  const conflicts: string[] = []
  
  // Comprovar conflicte de grup d'estudiants
  const { data: existingSlots } = await supabase
    .from('schedule_slots')
    .select('id, subject:subjects(name), start_time, end_time')
    .eq('student_group_id', studentGroupId)
    .eq('day_of_week', dayOfWeek)
    .gte('end_time', startTime)
    .lte('start_time', endTime)
  
  if (existingSlots && existingSlots.length > 0) {
    conflicts.push(`Grup d'estudiants ja té classe: ${existingSlots[0].subject?.name} (${existingSlots[0].start_time}-${existingSlots[0].end_time})`)
  }
  
  // Comprovar conflictes de professors
  for (const teacherId of teacherIds) {
    const { data: teacherSlots } = await supabase
      .from('schedule_slot_teachers')
      .select(`
        schedule_slot:schedule_slots!inner(
          day_of_week,
          start_time,
          end_time,
          subject:subjects(name)
        )
      `)
      .eq('teacher_id', teacherId)
      .eq('schedule_slot.day_of_week', dayOfWeek)
    
    const conflictingSlot = teacherSlots?.find(slot => {
      const s = slot.schedule_slot as any
      return s.start_time < endTime && s.end_time > startTime
    })
    
    if (conflictingSlot) {
      const { data: teacher } = await supabase
        .from('teachers')
        .select('first_name, last_name')
        .eq('id', teacherId)
        .single()
      
      const s = conflictingSlot.schedule_slot as any
      conflicts.push(`Professor ${teacher?.first_name} ${teacher?.last_name} ja té classe: ${s.subject?.name}`)
    }
  }
  
  // Comprovar conflictes d'aules
  for (const classroomId of classroomIds) {
    const { data: classroomSlots } = await supabase
      .from('schedule_slot_classrooms')
      .select(`
        schedule_slot:schedule_slots!inner(
          day_of_week,
          start_time,
          end_time,
          subject:subjects(name)
        )
      `)
      .eq('classroom_id', classroomId)
      .eq('schedule_slot.day_of_week', dayOfWeek)
    
    const conflictingSlot = classroomSlots?.find(slot => {
      const s = slot.schedule_slot as any
      return s.start_time < endTime && s.end_time > startTime
    })
    
    if (conflictingSlot) {
      const { data: classroom } = await supabase
        .from('classrooms')
        .select('code')
        .eq('id', classroomId)
        .single()
      
      const s = conflictingSlot.schedule_slot as any
      conflicts.push(`Aula ${classroom?.code} ja ocupada: ${s.subject?.name}`)
    }
  }
  
  return {
    hasConflicts: conflicts.length > 0,
    conflicts
  }
}

async function importScheduleWithIds(filePath: string) {
  console.log('🚀 IMPORTACIÓ D\'HORARIS AMB IDs ÚNICS')
  console.log('=====================================\n')
  console.log('⚡ Mode: Matching 100% garantit amb IDs')
  console.log(`📄 Fitxer: ${filePath}\n`)
  
  try {
    // Llegir i parsejar fitxer
    const fileContent = readFileSync(filePath, 'utf-8')
    const data: ImportData = JSON.parse(fileContent)
    
    // Validar versió
    if (data.version !== '2.0') {
      throw new Error(`Versió incorrecta. Esperada: 2.0, Trobada: ${data.version}`)
    }
    
    console.log(`📊 Total grups a processar: ${data.schedules.length}`)
    
    let totalClasses = 0
    let successfulImports = 0
    let validationErrors = 0
    let conflictErrors = 0
    
    // Processar cada grup
    for (const schedule of data.schedules) {
      console.log('\n' + '='.repeat(60))
      
      // Validar IDs del grup
      if (!isValidUUID(schedule.student_group_id)) {
        console.error(`❌ student_group_id no és un UUID vàlid: ${schedule.student_group_id}`)
        validationErrors++
        continue
      }
      
      if (!isValidUUID(schedule.semester_id)) {
        console.error(`❌ semester_id no és un UUID vàlid: ${schedule.semester_id}`)
        validationErrors++
        continue
      }
      
      // Obtenir info del grup per mostrar
      const { data: groupInfo } = await supabase
        .from('student_groups')
        .select('name')
        .eq('id', schedule.student_group_id)
        .single()
      
      console.log(`\n👥 Grup: ${groupInfo?.name || 'Desconegut'} (${schedule.student_group_id})`)
      console.log(`📅 Classes a importar: ${schedule.classes.length}`)
      
      // Processar cada classe
      for (const classData of schedule.classes) {
        totalClasses++
        
        // Obtenir info de l'assignatura
        const { data: subjectInfo } = await supabase
          .from('subjects')
          .select('name, code')
          .eq('id', classData.subject_id)
          .single()
        
        console.log(`\n   📚 ${subjectInfo?.name || 'Assignatura desconeguda'} (${classData.group_type})`)
        console.log(`      📅 ${['', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres'][classData.day_of_week]}, ${classData.start_time}-${classData.end_time}`)
        
        // VALIDACIONS
        let hasValidationError = false
        
        // Validar UUID de subject
        if (!isValidUUID(classData.subject_id)) {
          console.error(`      ❌ subject_id no és un UUID vàlid`)
          hasValidationError = true
        } else if (!(await validateEntityExists('subjects', classData.subject_id))) {
          console.error(`      ❌ subject_id no existeix a la BD`)
          hasValidationError = true
        }
        
        // Validar UUIDs de professors
        for (const teacherId of classData.teacher_ids) {
          if (!isValidUUID(teacherId)) {
            console.error(`      ❌ teacher_id no és un UUID vàlid: ${teacherId}`)
            hasValidationError = true
          } else if (!(await validateEntityExists('teachers', teacherId))) {
            console.error(`      ❌ teacher_id no existeix a la BD: ${teacherId}`)
            hasValidationError = true
          }
        }
        
        // Validar UUIDs d'aules
        for (const classroomId of classData.classroom_ids) {
          if (!isValidUUID(classroomId)) {
            console.error(`      ❌ classroom_id no és un UUID vàlid: ${classroomId}`)
            hasValidationError = true
          } else if (!(await validateEntityExists('classrooms', classroomId))) {
            console.error(`      ❌ classroom_id no existeix a la BD: ${classroomId}`)
            hasValidationError = true
          }
        }
        
        // Validar format de temps
        if (!isValidTime(classData.start_time) || !isValidTime(classData.end_time)) {
          console.error(`      ❌ Format de temps incorrecte (ha de ser HH:MM:SS)`)
          hasValidationError = true
        }
        
        // Validar dia de la setmana
        if (classData.day_of_week < 1 || classData.day_of_week > 5) {
          console.error(`      ❌ day_of_week ha de ser entre 1 i 5`)
          hasValidationError = true
        }
        
        // Validar group_type
        const validGroupTypes = ['THEORY', 'PRACTICE', 'LABORATORY', 'SEMINAR']
        if (!validGroupTypes.includes(classData.group_type)) {
          console.error(`      ❌ group_type invàlid. Ha de ser: ${validGroupTypes.join(', ')}`)
          hasValidationError = true
        }
        
        if (hasValidationError) {
          validationErrors++
          continue
        }
        
        // COMPROVAR CONFLICTES
        const { hasConflicts, conflicts } = await checkForConflicts(
          schedule.student_group_id,
          schedule.semester_id,
          classData.day_of_week,
          classData.start_time,
          classData.end_time,
          classData.teacher_ids,
          classData.classroom_ids
        )
        
        if (hasConflicts) {
          console.error(`      ❌ Conflictes detectats:`)
          conflicts.forEach(c => console.error(`         - ${c}`))
          conflictErrors++
          continue
        }
        
        // CREAR SCHEDULE SLOT
        const { data: scheduleSlot, error: slotError } = await supabase
          .from('schedule_slots')
          .insert({
            student_group_id: schedule.student_group_id,
            subject_id: classData.subject_id,
            day_of_week: classData.day_of_week,
            start_time: classData.start_time,
            end_time: classData.end_time,
            semester: parseInt(schedule.semester_id), // Temporalment, fins que s'actualitzi l'esquema
            academic_year: '2025-2026'
          })
          .select('id')
          .single()
        
        if (slotError || !scheduleSlot) {
          console.error(`      ❌ Error creant schedule_slot:`, slotError)
          continue
        }
        
        // ASSIGNAR PROFESSORS
        if (classData.teacher_ids.length > 0) {
          const teacherAssignments = classData.teacher_ids.map(teacher_id => ({
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
        
        // ASSIGNAR AULES
        const classroomAssignments = classData.classroom_ids.map(classroom_id => ({
          schedule_slot_id: scheduleSlot.id,
          classroom_id
        }))
        
        const { error: classroomError } = await supabase
          .from('schedule_slot_classrooms')
          .insert(classroomAssignments)
        
        if (classroomError) {
          console.error(`      ❌ Error assignant aules:`, classroomError)
          continue
        }
        
        // Mostrar info dels IDs per confirmació
        const teacherNames = []
        for (const tid of classData.teacher_ids) {
          const { data } = await supabase.from('teachers').select('first_name, last_name').eq('id', tid).single()
          if (data) teacherNames.push(`${data.first_name} ${data.last_name}`)
        }
        
        const classroomCodes = []
        for (const cid of classData.classroom_ids) {
          const { data } = await supabase.from('classrooms').select('code').eq('id', cid).single()
          if (data) classroomCodes.push(data.code)
        }
        
        console.log(`      ✅ Importat correctament`)
        console.log(`         Professors: ${teacherNames.join(', ')}`)
        console.log(`         Aules: ${classroomCodes.join(', ')}`)
        if (classData.notes) {
          console.log(`         Notes: ${classData.notes}`)
        }
        
        successfulImports++
      }
    }
    
    // RESUM FINAL
    console.log('\n' + '='.repeat(60))
    console.log('\n📊 RESUM DE LA IMPORTACIÓ')
    console.log('========================')
    console.log(`✅ Importats correctament: ${successfulImports}`)
    console.log(`❌ Errors de validació: ${validationErrors}`)
    console.log(`⚠️  Conflictes detectats: ${conflictErrors}`)
    console.log(`📋 Total classes processades: ${totalClasses}`)
    console.log(`📈 Taxa d'èxit: ${totalClasses > 0 ? ((successfulImports/totalClasses)*100).toFixed(1) : 0}%`)
    
    if (validationErrors === 0 && conflictErrors === 0 && successfulImports === totalClasses) {
      console.log('\n🎉 IMPORTACIÓ PERFECTA! Matching 100% aconseguit!')
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
  console.error('ℹ️  Ús: npm run import-schedule-ids data/horari-amb-ids.json')
  console.error('\n📝 Primer executa: npm run export-ids')
  console.error('   Després utilitza els IDs del fitxer generat')
  process.exit(1)
}

importScheduleWithIds(filePath).catch(console.error)