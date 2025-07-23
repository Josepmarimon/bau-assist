import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

async function checkP14Occupancy() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔍 CHECKING P.1.4 CLASSROOM OCCUPANCY AND CONFLICTS')
  console.log('=================================================\n')

  // Get P.1.4 classroom
  const { data: classroom, error: classroomError } = await supabase
    .from('classrooms')
    .select('*')
    .eq('code', 'P.1.4')
    .single()

  if (classroomError || !classroom) {
    console.log('❌ Could not find classroom P.1.4')
    return
  }

  console.log(`✅ Found classroom: ${classroom.code} - ${classroom.name}`)
  console.log(`   ID: ${classroom.id}`)
  console.log(`   Capacity: ${classroom.capacity}`)
  console.log(`   Type: ${classroom.type}\n`)

  // Get current academic year and semesters
  const { data: currentYear } = await supabase
    .from('academic_years')
    .select('id, name')
    .eq('is_current', true)
    .single()

  const { data: semesters } = await supabase
    .from('semesters')
    .select('id, name, number')
    .eq('academic_year_id', currentYear?.id)
    .order('number')

  console.log('📅 Current academic year:', currentYear?.name)
  console.log('Semesters:')
  semesters?.forEach(s => console.log(`  - ${s.name} (ID: ${s.id})`))

  // Check OLD SYSTEM (schedule_slots)
  console.log('\n\n🔍 OLD SYSTEM (schedule_slots) ASSIGNMENTS:')
  console.log('==========================================')
  
  const { data: scheduleSlots } = await supabase
    .from('schedule_slot_classrooms')
    .select(`
      id,
      schedule_slots!inner (
        id,
        day_of_week,
        start_time,
        end_time,
        semester,
        subjects (name, code),
        student_groups (name)
      )
    `)
    .eq('classroom_id', classroom.id)

  const slotsBySemester: Record<number, any[]> = {}
  scheduleSlots?.forEach(slot => {
    const semester = slot.schedule_slots.semester
    if (!slotsBySemester[semester]) {
      slotsBySemester[semester] = []
    }
    slotsBySemester[semester].push(slot.schedule_slots)
  })

  for (const sem of [1, 2]) {
    const slots = slotsBySemester[sem] || []
    console.log(`\nSemester ${sem}: ${slots.length} assignments`)
    slots.forEach(slot => {
      const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
      console.log(`  - ${dayNames[slot.day_of_week]} ${slot.start_time.substring(0,5)}-${slot.end_time.substring(0,5)}: ${slot.subjects?.name} (${slot.student_groups?.name})`)
    })
  }

  // Check NEW SYSTEM (assignments)
  console.log('\n\n🔍 NEW SYSTEM (assignments) ASSIGNMENTS:')
  console.log('=======================================')
  
  const { data: assignments } = await supabase
    .from('assignment_classrooms')
    .select(`
      id,
      is_full_semester,
      week_range_type,
      assignment_classroom_weeks (week_number),
      assignments!inner (
        id,
        semester_id,
        time_slots (
          day_of_week,
          start_time,
          end_time
        ),
        subject_groups (
          group_code,
          subjects (name, code)
        ),
        student_groups (name)
      )
    `)
    .eq('classroom_id', classroom.id)

  const assignmentsBySemester: Record<string, any[]> = {}
  assignments?.forEach(ac => {
    const semesterId = ac.assignments.semester_id
    if (!assignmentsBySemester[semesterId]) {
      assignmentsBySemester[semesterId] = []
    }
    assignmentsBySemester[semesterId].push(ac)
  })

  semesters?.forEach(semester => {
    const semAssignments = assignmentsBySemester[semester.id] || []
    console.log(`\n${semester.name}: ${semAssignments.length} assignments`)
    
    semAssignments.forEach(ac => {
      const assignment = ac.assignments
      const timeSlot = assignment.time_slots
      const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
      const weeks = ac.is_full_semester ? 'All weeks' : `Weeks: ${ac.assignment_classroom_weeks?.map((w: any) => w.week_number).join(', ')}`
      
      console.log(`  - ${dayNames[timeSlot?.day_of_week]} ${timeSlot?.start_time.substring(0,5)}-${timeSlot?.end_time.substring(0,5)}: ${assignment.subject_groups?.subjects?.name} (${assignment.subject_groups?.group_code || assignment.student_groups?.name})`)
      console.log(`    ${weeks}`)
    })
  })

  // Test conflict detection for a specific time slot
  console.log('\n\n🔍 TESTING CONFLICT DETECTION:')
  console.log('==============================')
  
  // Let's check if there are any time slots with potential conflicts
  const { data: timeSlots } = await supabase
    .from('time_slots')
    .select('id, day_of_week, start_time, end_time')
    .eq('day_of_week', 1) // Monday
    .eq('start_time', '15:00:00')
    .single()

  if (timeSlots && semesters && semesters.length > 0) {
    console.log(`\nChecking conflicts for Monday 15:00 in ${semesters[0].name}:`)
    
    const { data: conflicts } = await supabase.rpc('check_classroom_week_conflicts', {
      p_classroom_id: classroom.id,
      p_time_slot_id: timeSlots.id,
      p_week_numbers: [1, 2, 3, 4, 5],
      p_semester_id: semesters[0].id
    })

    if (conflicts && conflicts.length > 0) {
      console.log('Conflicts found:')
      conflicts.forEach((conflict: any) => {
        console.log(`  - ${conflict.subject_name} (${conflict.group_code}) - Weeks: ${conflict.conflicting_weeks.join(', ')}`)
      })
    } else {
      console.log('No conflicts found')
    }

    // Check without semester filter
    console.log(`\nChecking conflicts for Monday 15:00 WITHOUT semester filter:`)
    
    const { data: conflictsNoSemester } = await supabase.rpc('check_classroom_week_conflicts', {
      p_classroom_id: classroom.id,
      p_time_slot_id: timeSlots.id,
      p_week_numbers: [1, 2, 3, 4, 5],
      p_semester_id: null
    })

    if (conflictsNoSemester && conflictsNoSemester.length > 0) {
      console.log('Conflicts found (across all semesters):')
      conflictsNoSemester.forEach((conflict: any) => {
        console.log(`  - ${conflict.subject_name} (${conflict.group_code}) - Weeks: ${conflict.conflicting_weeks.join(', ')}`)
      })
    } else {
      console.log('No conflicts found')
    }
  }

  // Check for any assignments without proper semester
  console.log('\n\n🔍 CHECKING FOR ASSIGNMENTS WITHOUT SEMESTER:')
  console.log('============================================')
  
  const { data: assignmentsNoSemester } = await supabase
    .from('assignments')
    .select(`
      id,
      semester_id,
      subject_groups (
        group_code,
        subjects (name)
      ),
      assignment_classrooms!inner (
        classroom_id
      )
    `)
    .eq('assignment_classrooms.classroom_id', classroom.id)
    .is('semester_id', null)

  if (assignmentsNoSemester && assignmentsNoSemester.length > 0) {
    console.log(`⚠️  Found ${assignmentsNoSemester.length} assignments without semester!`)
    assignmentsNoSemester.forEach(a => {
      console.log(`  - ${a.subject_groups?.subjects?.name} (${a.subject_groups?.group_code})`)
    })
  } else {
    console.log('✅ All assignments have semester assigned')
  }
}

checkP14Occupancy().catch(console.error)