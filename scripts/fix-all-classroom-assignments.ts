import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import { CLASSROOM_MAPPINGS, findClassroom } from './import-schedules-complete-mapping'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ScheduleClass {
  subject: string
  teacher: string | null
  classroom: string
  day: number
  start_time: string
  end_time: string
  semester: number
}

interface ScheduleGroup {
  degree: string
  course: number
  group: string
  classes: ScheduleClass[]
}

async function fixAllClassroomAssignments() {
  console.log('🔧 FIXING ALL CLASSROOM ASSIGNMENTS FROM JSON DATA')
  console.log('=================================================\n')
  
  // Read the schedule data
  const jsonData = readFileSync('/Users/josepmarimon/Documents/github/bau-assist/data/all_schedules_data.json', 'utf-8')
  const { schedules } = JSON.parse(jsonData) as { schedules: ScheduleGroup[] }
  
  let totalFixed = 0
  let totalErrors = 0
  let totalSkipped = 0
  
  for (const group of schedules) {
    console.log(`\n📚 Processing ${group.group}...`)
    
    for (const classData of group.classes) {
      try {
        // Skip entries without classrooms
        if (!classData.classroom) {
          continue
        }
        
        // Find the schedule slot
        const { data: slots } = await supabase
          .from('schedule_slots')
          .select(`
            id,
            student_groups!inner(name),
            subjects!inner(name)
          `)
          .eq('student_groups.name', group.group)
          .eq('subjects.name', classData.subject)
          .eq('day_of_week', classData.day)
          .eq('start_time', classData.start_time + ':00')
          .eq('semester', classData.semester)
        
        if (!slots || slots.length === 0) {
          console.log(`   ❌ No slot found for ${classData.subject} on day ${classData.day}`)
          totalErrors++
          continue
        }
        
        const slot = slots[0]
        
        // Check if already has classrooms
        const { data: existingClassrooms } = await supabase
          .from('schedule_slot_classrooms')
          .select('id')
          .eq('schedule_slot_id', slot.id)
        
        if (existingClassrooms && existingClassrooms.length > 0) {
          totalSkipped++
          continue
        }
        
        // Parse classroom(s) - some entries have multiple classrooms separated by commas
        const classrooms = classData.classroom.split(',').map(c => c.trim())
        
        // Add classroom assignments
        for (const classroomCode of classrooms) {
          const classroomId = await findClassroom(classroomCode)
          if (classroomId) {
            await supabase
              .from('schedule_slot_classrooms')
              .insert({
                schedule_slot_id: slot.id,
                classroom_id: classroomId
              })
            console.log(`   ✅ ${classData.subject} -> ${classroomCode}`)
            totalFixed++
          } else {
            console.log(`   ❌ ${classData.subject} -> ${classroomCode} (not found)`)
            totalErrors++
          }
        }
        
      } catch (error) {
        console.error(`   ❌ Error processing ${classData.subject}:`, error)
        totalErrors++
      }
    }
  }
  
  console.log(`\n📊 SUMMARY`)
  console.log(`===========`)
  console.log(`✅ Fixed: ${totalFixed} classroom assignments`)
  console.log(`⏭️  Skipped: ${totalSkipped} (already assigned)`)
  console.log(`❌ Errors: ${totalErrors}`)
  
  // Final status check
  console.log('\n📊 FINAL DATABASE STATUS')
  console.log('========================\n')
  
  const { data: finalStats } = await supabase
    .from('schedule_slots')
    .select('id')
  
  const { data: assignedStats } = await supabase
    .from('schedule_slots')
    .select('id')
    .eq('id', supabase.from('schedule_slot_classrooms').select('schedule_slot_id'))
  
  const { count: totalSlots } = await supabase
    .from('schedule_slots')
    .select('*', { count: 'exact', head: true })
  
  const { count: slotsWithClassrooms } = await supabase
    .from('schedule_slot_classrooms')
    .select('schedule_slot_id', { count: 'exact', head: true })
    .eq('schedule_slot_id', supabase.from('schedule_slot_classrooms').select('schedule_slot_id'))
  
  // Get actual count of slots with and without classrooms
  const { data: detailedStats } = await supabase
    .rpc('get_schedule_classroom_stats')
  
  if (!detailedStats) {
    // Fallback query
    const { data: slots } = await supabase
      .from('schedule_slots')
      .select(`
        id,
        schedule_slot_classrooms(id)
      `)
    
    if (slots) {
      const withClassrooms = slots.filter(s => s.schedule_slot_classrooms && s.schedule_slot_classrooms.length > 0).length
      const withoutClassrooms = slots.length - withClassrooms
      
      console.log(`Total schedule slots: ${slots.length}`)
      console.log(`Slots with classrooms: ${withClassrooms}`)
      console.log(`Slots without classrooms: ${withoutClassrooms}`)
      console.log(`Percentage assigned: ${((withClassrooms / slots.length) * 100).toFixed(1)}%`)
    }
  }
}

// Execute
fixAllClassroomAssignments().catch(console.error)