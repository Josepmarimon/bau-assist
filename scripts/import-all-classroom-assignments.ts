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

// Function to clean classroom codes
function parseClassroomCodes(classroomString: string): string[] {
  if (!classroomString) return []
  
  // Remove parenthetical notes like "(5 darreres sessions)"
  let cleaned = classroomString.replace(/\([^)]+\)/g, '')
  
  // Split by comma or slash
  const codes = cleaned.split(/[,\/]/).map(c => c.trim()).filter(c => c)
  
  return codes
}

async function importAllClassroomAssignments() {
  console.log('🔧 IMPORTING ALL CLASSROOM ASSIGNMENTS')
  console.log('=====================================\n')

  // Read the JSON data
  const jsonData = JSON.parse(
    readFileSync('/Users/josepmarimon/Documents/github/bau-assist/data/all_schedules_data.json', 'utf-8')
  )

  // Get all classrooms for mapping
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('id, code')

  const classroomMap = new Map<string, string>()
  classrooms?.forEach(c => {
    classroomMap.set(c.code, c.id)
    // Also map without dots
    classroomMap.set(c.code.replace(/\./g, ''), c.id)
    // Map uppercase versions
    classroomMap.set(c.code.toUpperCase(), c.id)
    classroomMap.set(c.code.replace(/\./g, '').toUpperCase(), c.id)
  })

  console.log(`📚 Found ${classrooms?.length || 0} classrooms in database`)

  let totalProcessed = 0
  let totalAssigned = 0
  let totalSkipped = 0
  let totalErrors = 0
  const missingClassrooms = new Set<string>()

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
      console.log(`   ❌ Student group not found`)
      continue
    }

    // Process each class
    for (const scheduleClass of groupSchedule.classes) {
      if (!scheduleClass.classroom) continue
      
      totalProcessed++

      // Find the subject (try exact match first, then ilike)
      let subject = await supabase
        .from('subjects')
        .select('id')
        .eq('name', scheduleClass.subject)
        .single()

      if (!subject.data) {
        const { data: subjectAlt } = await supabase
          .from('subjects')
          .select('id')
          .ilike('name', `%${scheduleClass.subject}%`)
          .single()
        
        if (!subjectAlt) {
          totalErrors++
          continue
        }
        subject = { data: subjectAlt }
      }

      // Find the schedule slot
      const { data: scheduleSlot } = await supabase
        .from('schedule_slots')
        .select('id')
        .eq('subject_id', subject.data.id)
        .eq('student_group_id', studentGroup.id)
        .eq('day_of_week', scheduleClass.day)
        .eq('start_time', scheduleClass.start_time + ':00')
        .eq('semester', scheduleClass.semester)
        .single()

      if (!scheduleSlot) {
        totalErrors++
        continue
      }

      // Check if already has classrooms assigned
      const { count: existingCount } = await supabase
        .from('schedule_slot_classrooms')
        .select('*', { count: 'exact', head: true })
        .eq('schedule_slot_id', scheduleSlot.id)

      if (existingCount && existingCount > 0) {
        totalSkipped++
        continue
      }

      // Parse and assign classrooms
      const classroomCodes = parseClassroomCodes(scheduleClass.classroom)
      let assigned = false

      for (const code of classroomCodes) {
        // Try to find classroom ID
        let classroomId = classroomMap.get(code)
        
        if (!classroomId) {
          // Try variations
          const variations = [
            code.toUpperCase(),
            code.replace(/([A-Za-z])(\d)/, '$1.$2'),
            code.replace(/([A-Za-z])(\d)/, '$1.$2').toUpperCase(),
            code.replace(/\s+/g, ''),
            code.replace(/\s+/g, '').toUpperCase()
          ]
          
          for (const variant of variations) {
            classroomId = classroomMap.get(variant)
            if (classroomId) break
          }
        }

        if (!classroomId) {
          missingClassrooms.add(code)
          continue
        }

        // Assign the classroom
        const { error } = await supabase
          .from('schedule_slot_classrooms')
          .insert({
            schedule_slot_id: scheduleSlot.id,
            classroom_id: classroomId
          })

        if (!error) {
          assigned = true
          console.log(`   ✅ Assigned ${scheduleClass.subject} to ${code}`)
        }
      }

      if (assigned) {
        totalAssigned++
      } else {
        totalErrors++
      }
    }
  }

  console.log('\n📊 SUMMARY')
  console.log('===========')
  console.log(`✅ Successfully assigned: ${totalAssigned}`)
  console.log(`⏭️  Already assigned: ${totalSkipped}`)
  console.log(`❌ Errors: ${totalErrors}`)
  console.log(`📋 Total processed: ${totalProcessed}`)

  if (missingClassrooms.size > 0) {
    console.log('\n⚠️  MISSING CLASSROOMS:')
    Array.from(missingClassrooms).sort().forEach(c => {
      console.log(`   - ${c}`)
    })
  }

  // Final status
  const { count: totalSlots } = await supabase
    .from('schedule_slots')
    .select('*', { count: 'exact', head: true })

  const { count: slotsWithClassrooms } = await supabase
    .from('schedule_slot_classrooms')
    .select('*', { count: 'exact', head: true })

  // Count unique slots with classrooms
  const { data: uniqueSlots } = await supabase
    .from('schedule_slot_classrooms')
    .select('schedule_slot_id')
    
  const uniqueSlotIds = new Set(uniqueSlots?.map(s => s.schedule_slot_id) || [])

  console.log('\n📊 FINAL DATABASE STATUS')
  console.log('========================')
  console.log(`Total schedule slots: ${totalSlots}`)
  console.log(`Unique slots with classrooms: ${uniqueSlotIds.size}`)
  console.log(`Total classroom assignments: ${slotsWithClassrooms}`)
  console.log(`Percentage of slots with classrooms: ${totalSlots ? ((uniqueSlotIds.size / totalSlots) * 100).toFixed(1) : 0}%`)
}

importAllClassroomAssignments().catch(console.error)