import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

async function checkClassroomP05() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔍 Checking classroom P.0.5 and its assignments...\n')

  // Check if classroom exists
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('*')
    .or('code.eq.P.0.5,code.eq.P0.5,code.ilike.%P%5%')

  console.log('Classrooms found matching P.0.5:')
  classrooms?.forEach(c => console.log(`  - ${c.code} (${c.name}) - ID: ${c.id}`))

  // If we found P.0.5, check its assignments
  const p05 = classrooms?.find(c => c.code === 'P.0.5' || c.code === 'P0.5')
  
  if (p05) {
    console.log(`\n📚 Checking assignments for classroom ${p05.code} (${p05.id})...`)
    
    // Get schedule slots assigned to this classroom
    const { data: assignments } = await supabase
      .from('schedule_slot_classrooms')
      .select(`
        id,
        schedule_slots (
          id,
          day_of_week,
          start_time,
          end_time,
          semester,
          subjects (name),
          student_groups (name)
        )
      `)
      .eq('classroom_id', p05.id)

    console.log(`\nFound ${assignments?.length || 0} assignments:`)
    
    assignments?.forEach(a => {
      const slot = a.schedule_slots
      console.log(`\n  📅 ${getDayName(slot.day_of_week)} ${slot.start_time} - ${slot.end_time}`)
      console.log(`     Subject: ${slot.subjects?.name}`)
      console.log(`     Group: ${slot.student_groups?.name}`)
      console.log(`     Semester: ${slot.semester}`)
    })
  }

  // Check if there's a schedule slot for Tipografia II
  console.log('\n🔍 Checking for Tipografia II schedule slots...')
  const { data: tipografiaSlots } = await supabase
    .from('schedule_slots')
    .select(`
      id,
      day_of_week,
      start_time,
      end_time,
      semester,
      subjects!inner (name),
      student_groups!inner (name),
      schedule_slot_classrooms (
        classrooms (code, name)
      )
    `)
    .eq('subjects.name', 'Tipografia II')

  console.log(`\nFound ${tipografiaSlots?.length || 0} Tipografia II slots:`)
  tipografiaSlots?.forEach(slot => {
    console.log(`\n  📅 ${getDayName(slot.day_of_week)} ${slot.start_time} - ${slot.end_time}`)
    console.log(`     Group: ${slot.student_groups?.name}`)
    console.log(`     Semester: ${slot.semester}`)
    const classrooms = slot.schedule_slot_classrooms?.map(sc => sc.classrooms?.code).join(', ')
    console.log(`     Classrooms: ${classrooms || 'No classroom assigned'}`)
  })

  // Check occupancy using the utility function
  console.log('\n🔍 Checking occupancy using utility function...')
  const { getClassroomOccupancy } = await import('../src/lib/utils/classroom-occupancy')
  
  if (p05) {
    try {
      const occupancy = await getClassroomOccupancy(p05.id)
      console.log('\nOccupancy data:')
      console.log(`  Morning: ${occupancy.morningPercentage}%`)
      console.log(`  Afternoon: ${occupancy.afternoonPercentage}%`)
      console.log(`  Total: ${occupancy.totalPercentage}%`)
      
      // Show occupied slots
      const occupiedSlots = occupancy.slots.filter(s => s.isOccupied)
      console.log(`\n  Occupied slots: ${occupiedSlots.length}`)
      occupiedSlots.slice(0, 5).forEach(slot => {
        console.log(`    - ${getDayName(slot.dayOfWeek)} ${slot.startTime}: ${slot.subject} (${slot.group})`)
      })
    } catch (error) {
      console.log('Error getting occupancy:', error)
    }
  }
}

function getDayName(day: number): string {
  const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  return days[day] || `Day ${day}`
}

checkClassroomP05().catch(console.error)