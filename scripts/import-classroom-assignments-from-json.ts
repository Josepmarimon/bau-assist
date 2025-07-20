import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'

dotenv.config()

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

async function importClassroomAssignments() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables')
    process.exit(1)
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔧 IMPORTING CLASSROOM ASSIGNMENTS FROM JSON DATA')
  console.log('=================================================\n')

  // Read the JSON data
  const jsonData = JSON.parse(
    readFileSync('/Users/josepmarimon/Documents/github/bau-assist/data/all_schedules_data.json', 'utf-8')
  )

  let totalProcessed = 0
  let totalAssigned = 0
  let totalErrors = 0
  const errors: string[] = []

  // First, create a mapping of classroom codes to IDs
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('id, code, name')

  const classroomMap = new Map<string, string>()
  classrooms?.forEach(classroom => {
    classroomMap.set(classroom.code, classroom.id)
    // Also add variations without dots
    const codeWithoutDots = classroom.code.replace(/\./g, '')
    classroomMap.set(codeWithoutDots, classroom.id)
  })

  console.log(`📚 Found ${classrooms?.length || 0} classrooms in database\n`)

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
      continue
    }

    // Process each class
    for (const scheduleClass of groupSchedule.classes) {
      totalProcessed++

      if (!scheduleClass.classroom) {
        continue // Skip classes without classroom assignments
      }

      // Get the subject
      const { data: subject } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', scheduleClass.subject)
        .single()

      if (!subject) {
        continue // Skip if subject not found
      }

      // Find the schedule slot
      const { data: scheduleSlot } = await supabase
        .from('schedule_slots')
        .select('id')
        .eq('subject_id', subject.id)
        .eq('student_group_id', studentGroup.id)
        .eq('day_of_week', scheduleClass.day)
        .eq('start_time', scheduleClass.start_time + ':00')
        .eq('semester', scheduleClass.semester)
        .single()

      if (!scheduleSlot) {
        continue // Skip if schedule slot not found
      }

      // Parse classroom codes (handle multiple classrooms separated by /)
      const classroomCodes = scheduleClass.classroom.split('/').map(c => c.trim())
      
      for (const classroomCode of classroomCodes) {
        // Try to find the classroom ID
        let classroomId = classroomMap.get(classroomCode)
        
        if (!classroomId) {
          // Try variations
          const upperCode = classroomCode.toUpperCase()
          classroomId = classroomMap.get(upperCode)
          
          if (!classroomId) {
            // Try with dots between parts
            const withDots = classroomCode.replace(/([A-Za-z])(\d)/, '$1.$2')
            classroomId = classroomMap.get(withDots)
          }
        }

        if (!classroomId) {
          console.log(`   ⚠️  Classroom not found: ${classroomCode}`)
          errors.push(`Classroom ${classroomCode} not found for ${scheduleClass.subject} (${groupSchedule.group})`)
          totalErrors++
          continue
        }

        // Check if assignment already exists
        const { data: existing } = await supabase
          .from('schedule_slot_classrooms')
          .select('id')
          .eq('schedule_slot_id', scheduleSlot.id)
          .eq('classroom_id', classroomId)
          .single()

        if (existing) {
          continue // Skip if already assigned
        }

        // Create the assignment
        const { error } = await supabase
          .from('schedule_slot_classrooms')
          .insert({
            schedule_slot_id: scheduleSlot.id,
            classroom_id: classroomId
          })

        if (error) {
          console.log(`   ❌ Error assigning ${classroomCode}: ${error.message}`)
          totalErrors++
        } else {
          console.log(`   ✅ Assigned ${scheduleClass.subject} to ${classroomCode}`)
          totalAssigned++
        }
      }
    }
  }

  console.log('\n📊 SUMMARY')
  console.log('===========')
  console.log(`✅ Successfully assigned: ${totalAssigned} classrooms`)
  console.log(`❌ Errors: ${totalErrors}`)
  console.log(`📋 Total classes processed: ${totalProcessed}`)

  if (errors.length > 0) {
    console.log('\n❌ CLASSROOM NOT FOUND ERRORS:')
    const uniqueErrors = [...new Set(errors)]
    uniqueErrors.slice(0, 20).forEach(error => console.log(`   - ${error}`))
    if (uniqueErrors.length > 20) {
      console.log(`   ... and ${uniqueErrors.length - 20} more`)
    }
  }

  // Final check
  const { count: totalSlots } = await supabase
    .from('schedule_slots')
    .select('*', { count: 'exact', head: true })

  const { count: assignedSlots } = await supabase
    .from('schedule_slot_classrooms')
    .select('*', { count: 'exact', head: true })

  console.log('\n📊 FINAL DATABASE STATUS')
  console.log('========================')
  console.log(`Total schedule slots: ${totalSlots}`)
  console.log(`Slots with classrooms: ${assignedSlots}`)
  console.log(`Percentage assigned: ${((assignedSlots! / totalSlots!) * 100).toFixed(1)}%`)
}

importClassroomAssignments().catch(console.error)