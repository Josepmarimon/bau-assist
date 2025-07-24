import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testConflictFunction() {
  console.log('🔍 Testing conflict function with Infografia I scenario')
  console.log('=================================================\n')

  try {
    // Get the exact IDs from the previous debug
    const classroomId = 'd3c120ec-f8b8-4b62-a2c6-b5b0cc161887' // P.1.4
    const timeSlotId = '75af53e2-573b-471c-8d61-2791233ea36e' // Wednesday morning
    const firstSemesterId = 'eb8bab5c-ead3-42e4-b0c8-0e3e313c9d3b' // 1st semester 2025-2026
    
    // Test 1: Call with semester filter (should return no conflicts)
    console.log('Test 1: With semester filter (1st semester)')
    const { data: conflicts1, error: error1 } = await supabase
      .rpc('check_classroom_week_conflicts', {
        p_classroom_id: classroomId,
        p_time_slot_id: timeSlotId,
        p_week_numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        p_exclude_assignment_id: null,
        p_semester_id: firstSemesterId
      })
    
    if (error1) {
      console.error('  Error:', error1)
    } else {
      console.log('  Result:', conflicts1)
      console.log('  Conflicts found:', conflicts1?.length || 0)
    }

    // Test 2: Call without semester filter (should return Infografia II conflict)
    console.log('\nTest 2: Without semester filter')
    const { data: conflicts2, error: error2 } = await supabase
      .rpc('check_classroom_week_conflicts', {
        p_classroom_id: classroomId,
        p_time_slot_id: timeSlotId,
        p_week_numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        p_exclude_assignment_id: null,
        p_semester_id: null
      })
    
    if (error2) {
      console.error('  Error:', error2)
    } else {
      console.log('  Result:', conflicts2)
      if (conflicts2 && conflicts2.length > 0) {
        conflicts2.forEach((c: any) => {
          console.log(`  - Subject: "${c.subject_name}" (type: ${typeof c.subject_name})`)
          console.log(`  - Group: "${c.group_code}" (type: ${typeof c.group_code})`)
          console.log(`  - Weeks: ${c.conflicting_weeks}`)
        })
      }
    }

    // Test 3: Check the actual assignment that would conflict
    console.log('\nTest 3: Checking the Infografia II assignment details')
    const { data: assignment } = await supabase
      .from('assignments')
      .select(`
        *,
        subject_groups (
          *,
          subjects (*)
        )
      `)
      .eq('id', '6c24c30b-da72-4dd7-a81e-5178532c4a6f')
      .single()
    
    console.log('  Assignment:', {
      id: assignment?.id,
      subject_name: assignment?.subject_groups?.subjects?.name,
      group_code: assignment?.subject_groups?.group_code,
      semester_id: assignment?.semester_id
    })

    // Test 4: Raw SQL query to understand the function behavior
    console.log('\nTest 4: Raw check of what the function sees')
    const { data: rawCheck } = await supabase
      .from('assignments')
      .select(`
        id,
        semester_id,
        subject_groups!inner (
          group_code,
          subjects!inner (
            name
          )
        ),
        assignment_classrooms!inner (
          classroom_id,
          is_full_semester
        )
      `)
      .eq('time_slot_id', timeSlotId)
      .eq('assignment_classrooms.classroom_id', classroomId)
    
    console.log('  All assignments for this classroom/timeslot:')
    rawCheck?.forEach((a: any) => {
      console.log(`    - ${a.subject_groups.subjects.name} (${a.subject_groups.group_code})`)
      console.log(`      Semester: ${a.semester_id}`)
    })

  } catch (error) {
    console.error('Error:', error)
  }
}

testConflictFunction()