import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createTimeSlots() {
  console.log('🚀 Creant time slots...')
  
  const timeSlots = []
  const days = [1, 2, 3, 4, 5] // Monday to Friday
  
  // Morning slots
  const morningSlots = [
    { start: '08:00:00', end: '09:00:00' },
    { start: '09:00:00', end: '10:00:00' },
    { start: '09:00:00', end: '11:00:00' },
    { start: '09:00:00', end: '13:30:00' },
    { start: '10:00:00', end: '11:00:00' },
    { start: '11:00:00', end: '12:00:00' },
    { start: '11:00:00', end: '13:00:00' },
    { start: '11:30:00', end: '13:30:00' },
    { start: '12:00:00', end: '13:00:00' },
    { start: '12:00:00', end: '14:00:00' },
    { start: '13:00:00', end: '14:00:00' },
    { start: '13:30:00', end: '14:30:00' },
  ]
  
  // Afternoon slots
  const afternoonSlots = [
    { start: '15:00:00', end: '16:00:00' },
    { start: '15:00:00', end: '17:00:00' },
    { start: '15:00:00', end: '17:30:00' },
    { start: '15:00:00', end: '19:30:00' },
    { start: '15:00:00', end: '20:30:00' },
    { start: '16:00:00', end: '17:00:00' },
    { start: '16:00:00', end: '18:00:00' },
    { start: '17:00:00', end: '18:00:00' },
    { start: '17:00:00', end: '19:00:00' },
    { start: '17:30:00', end: '19:30:00' },
    { start: '18:00:00', end: '19:00:00' },
    { start: '18:00:00', end: '20:00:00' },
    { start: '19:00:00', end: '20:00:00' },
    { start: '19:00:00', end: '21:00:00' },
    { start: '19:30:00', end: '20:30:00' },
    { start: '20:00:00', end: '21:00:00' },
  ]
  
  // Create slots for each day
  for (const day of days) {
    // Morning slots
    for (const slot of morningSlots) {
      timeSlots.push({
        day_of_week: day,
        start_time: slot.start,
        end_time: slot.end,
        slot_type: 'mati' as const
      })
    }
    
    // Afternoon slots
    for (const slot of afternoonSlots) {
      timeSlots.push({
        day_of_week: day,
        start_time: slot.start,
        end_time: slot.end,
        slot_type: 'tarda' as const
      })
    }
  }
  
  // Insert all time slots
  const { data, error } = await supabase
    .from('time_slots')
    .insert(timeSlots)
    .select()
  
  if (error) {
    console.error('Error creating time slots:', error)
  } else {
    console.log(`✅ Creats ${data?.length || 0} time slots`)
  }
}

createTimeSlots().catch(console.error)