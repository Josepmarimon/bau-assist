import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

async function checkAllAssignments() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('📊 CHECKING ALL CLASSROOM ASSIGNMENTS')
  console.log('====================================\n')

  // Get total counts
  const { count: totalSlots } = await supabase
    .from('schedule_slots')
    .select('*', { count: 'exact', head: true })

  const { count: totalAssignments } = await supabase
    .from('schedule_slot_classrooms')
    .select('*', { count: 'exact', head: true })

  console.log(`Total schedule slots: ${totalSlots}`)
  console.log(`Total classroom assignments: ${totalAssignments}`)
  console.log(`Percentage assigned: ${totalSlots ? ((totalAssignments! / totalSlots) * 100).toFixed(1) : 0}%\n`)

  // Get some sample assignments
  const { data: sampleAssignments } = await supabase
    .from('schedule_slot_classrooms')
    .select(`
      *,
      classrooms(code, name),
      schedule_slots(
        day_of_week,
        start_time,
        end_time,
        semester,
        subjects(name),
        student_groups(name)
      )
    `)
    .limit(20)

  console.log('SAMPLE ASSIGNMENTS:')
  console.log('==================')
  
  sampleAssignments?.forEach(a => {
    const slot = a.schedule_slots
    const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri']
    console.log(`\n${a.classrooms.code}: ${slot.subjects.name}`)
    console.log(`  Group: ${slot.student_groups.name}`)
    console.log(`  Time: ${dayNames[slot.day_of_week]} ${slot.start_time.substring(0,5)} - ${slot.end_time.substring(0,5)}`)
    console.log(`  Semester: ${slot.semester}`)
  })

  // Check classrooms with most assignments
  console.log('\n\nCLASSROOMS WITH MOST ASSIGNMENTS:')
  console.log('==================================')
  
  const { data: classroomStats } = await supabase
    .from('classrooms')
    .select(`
      code,
      name,
      schedule_slot_classrooms(count)
    `)
    .order('schedule_slot_classrooms.count', { ascending: false })
    .limit(10)

  classroomStats?.forEach(c => {
    const count = c.schedule_slot_classrooms[0]?.count || 0
    if (count > 0) {
      console.log(`${c.code}: ${count} assignments`)
    }
  })

  // Check unassigned slots
  console.log('\n\nUNASSIGNED SCHEDULE SLOTS:')
  console.log('==========================')
  
  const { data: unassignedSlots } = await supabase
    .from('schedule_slots')
    .select(`
      id,
      subjects(name),
      student_groups(name),
      day_of_week,
      start_time,
      semester
    `)
    .is('id', 'not.in', `(select schedule_slot_id from schedule_slot_classrooms)`)
    .limit(10)

  console.log(`Found ${unassignedSlots?.length || 0} unassigned slots (showing first 10):`)
  
  unassignedSlots?.forEach(slot => {
    console.log(`  - ${slot.subjects?.name} (${slot.student_groups?.name}) - Day ${slot.day_of_week}, Sem ${slot.semester}`)
  })

  // Check specific classrooms
  console.log('\n\nSPECIFIC CLASSROOM CHECKS:')
  console.log('==========================')
  
  const checkClassrooms = ['P.1.6', 'L.0.2', 'P.0.12', 'G.1.2', 'P.2.2']
  
  for (const code of checkClassrooms) {
    const { data: classroom } = await supabase
      .from('classrooms')
      .select(`
        id,
        code,
        schedule_slot_classrooms(
          schedule_slots(
            subjects(name),
            student_groups(name)
          )
        )
      `)
      .eq('code', code)
      .single()

    if (classroom) {
      const assignments = classroom.schedule_slot_classrooms || []
      console.log(`\n${code}: ${assignments.length} assignments`)
      assignments.slice(0, 3).forEach(a => {
        console.log(`  - ${a.schedule_slots.subjects.name} (${a.schedule_slots.student_groups.name})`)
      })
    }
  }
}

checkAllAssignments().catch(console.error)