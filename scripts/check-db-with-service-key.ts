import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

async function checkData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing environment variables')
    process.exit(1)
  }
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  // Check classrooms
  const { data: classrooms, count: classroomCount } = await supabase
    .from('classrooms')
    .select('*', { count: 'exact' })
    .limit(5)

  console.log('Classrooms in DB:', classroomCount)
  console.log('Sample classrooms:', classrooms?.map(c => ({ code: c.code, name: c.name })))

  // Check student groups
  const { data: groups, count: groupCount } = await supabase
    .from('student_groups')
    .select('*', { count: 'exact' })
    .order('name')
    .limit(10)

  console.log('\nStudent groups in DB:', groupCount)
  console.log('Sample groups:')
  groups?.forEach(g => console.log(`  - ${g.name} (${g.code})`))

  // Check schedule slots with classrooms
  const { count: slotsWithClassrooms } = await supabase
    .from('schedule_slot_classrooms')
    .select('*', { count: 'exact', head: true })

  console.log('\nSchedule slots with classrooms:', slotsWithClassrooms)
}

checkData().catch(console.error)