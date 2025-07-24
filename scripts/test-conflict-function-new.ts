import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function testConflictFunction() {
  console.log('🔍 Testing classroom conflict function...\n')

  // Get P.1.12 classroom ID
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('*')
    .eq('name', 'P.1.12')
    .single()

  console.log('Classroom P.1.12 ID:', classroom?.id)

  // Get Tuesday morning time slot (like in the screenshot)
  const { data: timeSlot } = await supabase
    .from('time_slots')
    .select('*')
    .eq('day_of_week', 2) // Tuesday
    .eq('slot_type', 'mati')
    .single()

  console.log('Tuesday morning time slot ID:', timeSlot?.id)

  // Test 1: Check conflicts WITHOUT semester filter
  console.log('\n📋 Test 1: Conflicts WITHOUT semester filter:')
  const { data: conflictsNoSemester } = await supabase
    .rpc('check_classroom_week_conflicts', {
      p_classroom_id: classroom?.id,
      p_time_slot_id: timeSlot?.id,
      p_week_numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      p_exclude_assignment_id: null,
      p_semester_id: null // No semester filter
    })

  console.log('Conflicts found:', conflictsNoSemester?.length)
  conflictsNoSemester?.forEach((c: any) => {
    console.log(`- ${c.subject_name} (${c.group_code})`)
  })

  // Test 2: Check conflicts WITH second semester filter
  console.log('\n📋 Test 2: Conflicts WITH second semester filter:')
  const secondSemesterId = '3dbb586b-7ae8-4a82-9013-24220dedf632'
  
  const { data: conflictsWithSemester } = await supabase
    .rpc('check_classroom_week_conflicts', {
      p_classroom_id: classroom?.id,
      p_time_slot_id: timeSlot?.id,
      p_week_numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
      p_exclude_assignment_id: null,
      p_semester_id: secondSemesterId // Second semester filter
    })

  console.log('Conflicts found:', conflictsWithSemester?.length)
  conflictsWithSemester?.forEach((c: any) => {
    console.log(`- ${c.subject_name} (${c.group_code})`)
  })

  // Test 3: Get the actual assignment that's causing conflict
  console.log('\n📋 Test 3: Checking the actual Tècniques Infogràfiques I assignment:')
  
  const { data: assignment } = await supabase
    .from('assignments')
    .select(`
      *,
      semester_id,
      semesters (
        name
      ),
      subject_groups (
        group_code,
        subjects (
          name,
          semester
        )
      ),
      assignment_classrooms!inner (
        classroom_id,
        classrooms (
          name
        )
      )
    `)
    .eq('assignment_classrooms.classroom_id', classroom?.id)
    .eq('time_slot_id', timeSlot?.id)
    .single()

  if (assignment) {
    console.log('Assignment found:')
    console.log('- Subject:', assignment.subject_groups?.subjects?.name)
    console.log('- Subject semester config:', assignment.subject_groups?.subjects?.semester)
    console.log('- Assignment semester ID:', assignment.semester_id)
    console.log('- Assignment semester name:', assignment.semesters?.name)
    console.log('- Group:', assignment.subject_groups?.group_code)
  }
}

testConflictFunction()