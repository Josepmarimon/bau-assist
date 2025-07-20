import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

async function checkOccupancyP05() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('📊 CHECKING OCCUPANCY FOR P.0.5/0.7')
  console.log('===================================\n')

  // Get the classroom
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('*')
    .eq('code', 'P.0.5/0.7')
    .single()

  if (!classroom) {
    console.log('Classroom not found!')
    return
  }

  console.log(`Classroom: ${classroom.name} (${classroom.code})`)
  console.log(`Capacity: ${classroom.capacity} students`)
  console.log(`Type: ${classroom.type}\n`)

  // Get all schedule slots for this classroom
  const { data: assignments } = await supabase
    .from('schedule_slot_classrooms')
    .select(`
      schedule_slots (
        id,
        day_of_week,
        start_time,
        end_time,
        semester,
        subjects (name, code),
        student_groups (name),
        schedule_slot_teachers (
          teachers (first_name, last_name)
        )
      )
    `)
    .eq('classroom_id', classroom.id)
    .order('schedule_slots(semester)', { ascending: true })
    .order('schedule_slots(day_of_week)', { ascending: true })
    .order('schedule_slots(start_time)', { ascending: true })

  // Group by semester
  const bySemester = {
    1: [] as any[],
    2: [] as any[]
  }

  assignments?.forEach(a => {
    const slot = a.schedule_slots
    if (slot) {
      bySemester[slot.semester as 1 | 2].push(slot)
    }
  })

  // Display occupancy by semester
  for (const semester of [1, 2]) {
    console.log(`\n📅 SEMESTER ${semester}`)
    console.log('-------------')
    
    const slots = bySemester[semester as 1 | 2]
    
    if (slots.length === 0) {
      console.log('No classes assigned')
      continue
    }

    // Group by day
    const byDay: Record<number, any[]> = {}
    slots.forEach(slot => {
      if (!byDay[slot.day_of_week]) byDay[slot.day_of_week] = []
      byDay[slot.day_of_week].push(slot)
    })

    const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    
    for (let day = 1; day <= 5; day++) {
      if (byDay[day] && byDay[day].length > 0) {
        console.log(`\n${dayNames[day]}:`)
        
        byDay[day].forEach(slot => {
          const teachers = slot.schedule_slot_teachers
            ?.map((t: any) => `${t.teachers.first_name} ${t.teachers.last_name}`)
            .join(', ') || 'No teacher assigned'
            
          console.log(`  ${slot.start_time.substring(0,5)} - ${slot.end_time.substring(0,5)}: ${slot.subjects.name}`)
          console.log(`    Group: ${slot.student_groups.name}`)
          console.log(`    Teacher: ${teachers}`)
        })
      }
    }
  }

  // Calculate occupancy percentages
  const totalPossibleSlots = 5 * 13 * 2 // 5 days * 13 hours * 2 semesters
  const occupiedSlots = assignments?.length || 0
  const occupancyPercentage = (occupiedSlots / totalPossibleSlots * 100).toFixed(1)

  console.log('\n📊 OCCUPANCY STATISTICS')
  console.log('---------------------')
  console.log(`Total occupied slots: ${occupiedSlots}`)
  console.log(`Occupancy percentage: ${occupancyPercentage}%`)
}

checkOccupancyP05().catch(console.error)