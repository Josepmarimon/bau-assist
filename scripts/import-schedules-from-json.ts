import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ScheduleClass {
  subject: string
  teacher: string | null
  classroom: string | null
  day: number
  start_time: string
  end_time: string
  semester: number
}

interface GroupSchedule {
  group: string
  classes: ScheduleClass[]
}

async function importSchedules() {
  console.log('🔧 IMPORTING SCHEDULES FROM JSON DATA')
  console.log('=====================================\n')

  // Read the JSON data
  const jsonData = JSON.parse(
    readFileSync('/Users/josepmarimon/Documents/github/bau-assist/data/all_schedules_data.json', 'utf-8')
  )

  let totalProcessed = 0
  let totalCreated = 0
  let totalErrors = 0
  let totalSkipped = 0

  // Clear existing schedule slots to avoid duplicates
  console.log('Clearing existing schedule slots...')
  await supabase.from('schedule_slots').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('schedule_slot_classrooms').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // Get academic year
  let { data: academicYear } = await supabase
    .from('academic_years')
    .select('id')
    .eq('name', '2025-2026')
    .single()

  if (!academicYear) {
    console.log('Creating academic year 2025-2026...')
    const { data: newYear } = await supabase
      .from('academic_years')
      .insert({
        name: '2025-2026',
        start_date: '2025-09-01',
        end_date: '2026-07-31',
        is_current: true
      })
      .select()
      .single()
    
    academicYear = newYear
  }

  // Create mapping of classroom codes to IDs
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('id, code')

  const classroomMap = new Map<string, string>()
  classrooms?.forEach(classroom => {
    classroomMap.set(classroom.code, classroom.id)
    // Also map variations
    const codeWithoutDots = classroom.code.replace(/\./g, '')
    classroomMap.set(codeWithoutDots, classroom.id)
  })

  // Process each group's schedule
  for (const groupSchedule of jsonData.schedules as GroupSchedule[]) {
    console.log(`\n📚 Processing ${groupSchedule.group}...`)

    // Get the student group
    const { data: studentGroup } = await supabase
      .from('student_groups')
      .select('id')
      .eq('name', groupSchedule.group)
      .single()

    if (!studentGroup) {
      console.log(`   ❌ Student group not found: ${groupSchedule.group}`)
      totalErrors++
      continue
    }

    // Process each class
    for (const scheduleClass of groupSchedule.classes) {
      totalProcessed++

      // Skip tutorials for now
      if (scheduleClass.subject.toLowerCase().includes('tutori')) {
        totalSkipped++
        continue
      }

      // Find the subject
      const { data: subject } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', scheduleClass.subject)
        .single()

      if (!subject) {
        // Try with variations
        const { data: subjectAlt } = await supabase
          .from('subjects')
          .select('id')
          .ilike('name', `%${scheduleClass.subject}%`)
          .single()

        if (!subjectAlt) {
          console.log(`   ⚠️  Subject not found: ${scheduleClass.subject}`)
          totalErrors++
          continue
        }
        subject.id = subjectAlt.id
      }

      // Create the schedule slot
      const scheduleSlotData = {
        subject_id: subject.id,
        student_group_id: studentGroup.id,
        day_of_week: scheduleClass.day,
        start_time: scheduleClass.start_time + ':00',
        end_time: scheduleClass.end_time + ':00',
        semester: scheduleClass.semester,
        academic_year: '2025-2026'
      }

      const { data: scheduleSlot, error: slotError } = await supabase
        .from('schedule_slots')
        .insert(scheduleSlotData)
        .select()
        .single()

      if (slotError) {
        console.log(`   ❌ Error creating slot: ${slotError.message}`)
        totalErrors++
        continue
      }

      console.log(`   ✅ Created slot for ${scheduleClass.subject}`)
      totalCreated++

      // Assign classrooms if available
      if (scheduleClass.classroom && scheduleSlot) {
        const classroomCodes = scheduleClass.classroom.split('/').map(c => c.trim())
        
        for (const classroomCode of classroomCodes) {
          let classroomId = classroomMap.get(classroomCode)
          
          if (!classroomId) {
            // Try variations
            const upperCode = classroomCode.toUpperCase()
            classroomId = classroomMap.get(upperCode)
            
            if (!classroomId) {
              const withDots = classroomCode.replace(/([A-Za-z])(\d)/, '$1.$2')
              classroomId = classroomMap.get(withDots)
            }
          }

          if (classroomId) {
            const { error: assignError } = await supabase
              .from('schedule_slot_classrooms')
              .insert({
                schedule_slot_id: scheduleSlot.id,
                classroom_id: classroomId
              })

            if (!assignError) {
              console.log(`      📍 Assigned classroom ${classroomCode}`)
            }
          }
        }
      }

      // Assign teacher if available
      if (scheduleClass.teacher && scheduleSlot) {
        // Split multiple teachers
        const teacherNames = scheduleClass.teacher.split(',').map(t => t.trim())
        
        for (const teacherName of teacherNames) {
          // Try to find teacher
          const nameParts = teacherName.split(' ')
          const firstName = nameParts[0]
          const lastName = nameParts.slice(1).join(' ')

          const { data: teacher } = await supabase
            .from('teachers')
            .select('id')
            .or(`first_name.ilike.%${firstName}%,last_name.ilike.%${lastName}%`)
            .single()

          if (teacher) {
            await supabase
              .from('schedule_slot_teachers')
              .insert({
                schedule_slot_id: scheduleSlot.id,
                teacher_id: teacher.id
              })
          }
        }
      }
    }
  }

  console.log('\n📊 SUMMARY')
  console.log('===========')
  console.log(`✅ Successfully created: ${totalCreated} schedule slots`)
  console.log(`⏭️  Skipped (tutorials): ${totalSkipped}`)
  console.log(`❌ Errors: ${totalErrors}`)
  console.log(`📋 Total classes processed: ${totalProcessed}`)

  // Final check
  const { count: totalSlots } = await supabase
    .from('schedule_slots')
    .select('*', { count: 'exact', head: true })

  const { count: slotsWithClassrooms } = await supabase
    .from('schedule_slot_classrooms')
    .select('*', { count: 'exact', head: true })

  console.log('\n📊 FINAL DATABASE STATUS')
  console.log('========================')
  console.log(`Total schedule slots: ${totalSlots}`)
  console.log(`Slots with classrooms: ${slotsWithClassrooms}`)
  console.log(`Percentage with classrooms: ${totalSlots ? ((slotsWithClassrooms! / totalSlots) * 100).toFixed(1) : 0}%`)
}

importSchedules().catch(console.error)