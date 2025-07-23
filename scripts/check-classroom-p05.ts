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
    
    assignments?.forEach((a: any) => {
      const slot = a.schedule_slots
      console.log(`\n  📅 ${getDayName(slot?.day_of_week)} ${slot?.start_time} - ${slot?.end_time}`)
      console.log(`     Subject: ${slot?.subjects?.name}`)
      console.log(`     Group: ${slot?.student_groups?.name}`)
      console.log(`     Semester: ${slot?.semester}`)
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
  tipografiaSlots?.forEach((slot: any) => {
    console.log(`\n  📅 ${getDayName(slot.day_of_week)} ${slot.start_time} - ${slot.end_time}`)
    console.log(`     Group: ${slot.student_groups?.name}`)
    console.log(`     Semester: ${slot.semester}`)
    const classrooms = slot.schedule_slot_classrooms?.map((sc: any) => sc.classrooms?.code).join(', ')
    console.log(`     Classrooms: ${classrooms || 'No classroom assigned'}`)
  })

  // Check occupancy using the utility function
  console.log('\n🔍 Checking occupancy using utility function...')
  const { getClassroomOccupancy } = await import('../src/lib/utils/classroom-occupancy')
  
  if (p05) {
    try {
      const occupancyData = await getClassroomOccupancy(p05.id)
      console.log('\nOccupancy data:')
      
      if (Array.isArray(occupancyData)) {
        // Handle semester array format
        occupancyData.forEach((semesterData: any) => {
          console.log(`\n  Semester ${semesterData.semester}:`)
          console.log(`    Morning: ${semesterData.morningPercentage}%`)
          console.log(`    Afternoon: ${semesterData.afternoonPercentage}%`)
          console.log(`    Total: ${semesterData.totalPercentage}%`)
          
          const occupiedSlots = semesterData.slots.filter((s: any) => s.isOccupied)
          console.log(`    Occupied slots: ${occupiedSlots.length}`)
          occupiedSlots.slice(0, 3).forEach((slot: any) => {
            console.log(`      - ${getDayName(slot.dayOfWeek)} ${slot.startTime}: ${slot.subject} (${slot.group})`)
          })
        })
      } else {
        // Handle single object format
        console.log(`  Morning: ${(occupancyData as any).morningPercentage}%`)
        console.log(`  Afternoon: ${(occupancyData as any).afternoonPercentage}%`)
        console.log(`  Total: ${(occupancyData as any).totalPercentage}%`)
        
        const occupiedSlots = (occupancyData as any).slots.filter((s: any) => s.isOccupied)
        console.log(`\n  Occupied slots: ${occupiedSlots.length}`)
        occupiedSlots.slice(0, 5).forEach((slot: any) => {
          console.log(`    - ${getDayName(slot.dayOfWeek)} ${slot.startTime}: ${slot.subject} (${slot.group})`)
        })
      }
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