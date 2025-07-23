import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

async function checkSpecificClassroomOccupancy() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  // Use anon key like the web app
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  console.log('🔍 CHECKING SPECIFIC CLASSROOM OCCUPANCY (AS WEB APP)')
  console.log('=====================================================\n')

  // Check a few classrooms with known assignments
  const classroomsToCheck = ['P.1.6', 'L.1.2', 'P.2.2', 'G.0.4']

  for (const code of classroomsToCheck) {
    console.log(`\n📚 Checking ${code}:`)
    console.log('------------------------')

    // Get the classroom
    const { data: classroom, error: classroomError } = await supabase
      .from('classrooms')
      .select('*')
      .eq('code', code)
      .single()

    if (classroomError || !classroom) {
      console.log(`❌ Error getting classroom: ${classroomError?.message}`)
      continue
    }

    console.log(`✅ Found classroom: ${classroom.name} (ID: ${classroom.id})`)

    // Get assignments using the same query structure as the web app
    const { data: assignments, error: assignmentError } = await supabase
      .from('schedule_slot_classrooms')
      .select(`
        schedule_slot_id,
        schedule_slots!inner (
          id,
          day_of_week,
          start_time,
          end_time,
          semester,
          subject_id,
          subjects (name),
          schedule_slot_teachers (
            teachers (first_name, last_name)
          ),
          student_groups (name)
        )
      `)
      .eq('classroom_id', classroom.id)

    if (assignmentError) {
      console.log(`❌ Error getting assignments: ${assignmentError.message}`)
      continue
    }

    console.log(`📊 Assignments found: ${assignments?.length || 0}`)

    // Group by semester
    const bySemester: Record<number, any[]> = {}
    
    assignments?.forEach((a: any) => {
      const slot = a.schedule_slots
      if (slot && slot.semester) {
        if (!bySemester[slot.semester]) {
          bySemester[slot.semester] = []
        }
        bySemester[slot.semester].push(slot)
      }
    })

    for (const sem of [1, 2]) {
      const slots = bySemester[sem] || []
      if (slots.length > 0) {
        console.log(`\n  Semester ${sem}: ${slots.length} assignments`)
        slots.forEach(slot => {
          const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
          console.log(`    - ${dayNames[slot.day_of_week]} ${slot.start_time.substring(0,5)}: ${slot.subjects?.name} (${slot.student_groups?.name})`)
        })
      }
    }
  }

  // Also test the getAllClassroomsOccupancyData function
  console.log('\n\n🔍 TESTING getAllClassroomsOccupancyData:')
  console.log('=========================================')
  
  try {
    // Import and test the server action
    const { getAllClassroomsOccupancyData } = await import('../src/app/(authenticated)/aules/actions')
    const occupancyData = await getAllClassroomsOccupancyData()
    
    console.log(`\nTotal classrooms with occupancy data: ${occupancyData.length}`)
    
    // Check P.1.6 specifically
    const p16 = occupancyData.find(c => c.classroomCode === 'P.1.6')
    if (p16) {
      console.log('\nP.1.6 occupancy data:')
      p16.semesters.forEach(sem => {
        const occupied = sem.classroomOccupancy.timeSlots.filter(s => s.isOccupied)
        console.log(`  Semester ${sem.semesterName}: ${occupied.length} occupied slots`)
        occupied.slice(0, 3).forEach(slot => {
          console.log(`    - ${slot.assignment?.subjectName} (${slot.assignment?.groupCode})`)
        })
      })
    }
  } catch (error) {
    console.log('❌ Error testing server action:', error)
  }
}

checkSpecificClassroomOccupancy().catch(console.error)