import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

async function verifyP05Data() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔍 VERIFYING P.0.5/0.7 DATA IN DATABASE')
  console.log('======================================\n')

  // Find the classroom
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('*')
    .eq('code', 'P.0.5/0.7')
    .single()

  if (!classroom) {
    console.log('❌ Classroom P.0.5/0.7 not found!')
    return
  }

  console.log('✅ Found classroom:', classroom.code, '(ID:', classroom.id, ')\n')

  // Get all schedule slots for this classroom
  const { data: assignments, error } = await supabase
    .from('schedule_slot_classrooms')
    .select(`
      schedule_slot_id,
      schedule_slots!inner (
        id,
        day_of_week,
        start_time,
        end_time,
        semester,
        subjects (id, name),
        student_groups (id, name),
        schedule_slot_teachers (
          teachers (id, first_name, last_name)
        )
      )
    `)
    .eq('classroom_id', classroom.id)

  if (error) {
    console.log('❌ Error fetching assignments:', error)
    return
  }

  console.log(`📚 Found ${assignments?.length || 0} assignments for this classroom:\n`)

  // Group by semester
  const bySemester: Record<number, any[]> = {}
  
  assignments?.forEach(a => {
    const slot = a.schedule_slots
    if (!bySemester[slot.semester]) {
      bySemester[slot.semester] = []
    }
    bySemester[slot.semester].push(slot)
  })

  // Display by semester
  for (const semester of [1, 2]) {
    const slots = bySemester[semester] || []
    console.log(`\n📅 SEMESTER ${semester}: ${slots.length} assignments`)
    console.log('--------------------------------')
    
    slots.forEach(slot => {
      const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      console.log(`\n${dayNames[slot.day_of_week]} ${slot.start_time} - ${slot.end_time}`)
      console.log(`  Subject: ${slot.subjects?.name || 'Unknown'} (ID: ${slot.subjects?.id})`)
      console.log(`  Group: ${slot.student_groups?.name || 'Unknown'} (ID: ${slot.student_groups?.id})`)
      
      const teachers = slot.schedule_slot_teachers || []
      if (teachers.length > 0) {
        teachers.forEach((t: any) => {
          console.log(`  Teacher: ${t.teachers.first_name} ${t.teachers.last_name}`)
        })
      } else {
        console.log('  Teacher: Not assigned')
      }
    })
  }

  // Also check if the specific Tipografia II assignment exists
  console.log('\n\n🔍 CHECKING TIPOGRAFIA II SPECIFICALLY:')
  console.log('---------------------------------------')
  
  const { data: tipografiaSlot } = await supabase
    .from('schedule_slots')
    .select(`
      *,
      subjects!inner(name),
      student_groups!inner(name),
      schedule_slot_classrooms(
        classrooms(code, name)
      )
    `)
    .eq('subjects.name', 'Tipografia II')
    .single()

  if (tipografiaSlot) {
    console.log('\n✅ Found Tipografia II slot:')
    console.log(`  Day: ${tipografiaSlot.day_of_week}, Time: ${tipografiaSlot.start_time} - ${tipografiaSlot.end_time}`)
    console.log(`  Group: ${tipografiaSlot.student_groups.name}`)
    console.log(`  Semester: ${tipografiaSlot.semester}`)
    console.log(`  Assigned classrooms:`, tipografiaSlot.schedule_slot_classrooms.map((sc: any) => sc.classrooms.code).join(', '))
  } else {
    console.log('\n❌ Tipografia II slot not found')
  }
}

verifyP05Data().catch(console.error)