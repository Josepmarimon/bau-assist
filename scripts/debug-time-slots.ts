import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugTimeSlots() {
  console.log('🔍 Debugging time slots...\n')

  // Get all time slots
  const { data: timeSlots } = await supabase
    .from('time_slots')
    .select('*')
    .order('day_of_week')
    .order('start_time')

  console.log('All time slots:')
  timeSlots?.forEach(ts => {
    console.log(`- Day ${ts.day_of_week}, ${ts.start_time}-${ts.end_time}, Type: ${ts.slot_type}, ID: ${ts.id}`)
  })

  // Find the Tuesday morning slot that matches 09:00-14:30
  const tuesdayMorning = timeSlots?.find(ts => 
    ts.day_of_week === 2 && 
    ts.start_time === '09:00:00' && 
    ts.end_time === '14:30:00'
  )

  console.log('\nTuesday 09:00-14:30 slot:', tuesdayMorning)

  if (tuesdayMorning) {
    // Now test conflicts with this slot
    const classroom = await supabase
      .from('classrooms')
      .select('*')
      .eq('name', 'P.1.12')
      .single()

    console.log('\n📋 Testing conflicts for P.1.12 on Tuesday 09:00-14:30:')
    
    // Without semester filter
    const { data: conflictsAll } = await supabase
      .rpc('check_classroom_week_conflicts', {
        p_classroom_id: classroom.data?.id,
        p_time_slot_id: tuesdayMorning.id,
        p_week_numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15]
      })

    console.log('\nConflicts (all semesters):', conflictsAll)

    // With second semester filter
    const { data: conflictsSecond } = await supabase
      .rpc('check_classroom_week_conflicts', {
        p_classroom_id: classroom.data?.id,
        p_time_slot_id: tuesdayMorning.id,
        p_week_numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        p_semester_id: '3dbb586b-7ae8-4a82-9013-24220dedf632' // Second semester
      })

    console.log('\nConflicts (second semester only):', conflictsSecond)
  }
}

debugTimeSlots()