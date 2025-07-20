import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

async function checkData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  
  console.log('Connecting to Supabase...')
  console.log('URL:', supabaseUrl ? 'Set' : 'Not set')
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Check classrooms
  const { data: classrooms, count: classroomCount } = await supabase
    .from('classrooms')
    .select('*', { count: 'exact' })
    .limit(10)

  console.log('Classrooms in DB:', classroomCount)
  console.log('Sample classrooms:', classrooms?.map(c => ({ code: c.code, name: c.name })))

  // Check student groups
  const { data: groups } = await supabase
    .from('student_groups')
    .select('name, code')
    .order('name')

  console.log('\nAll student groups:')
  groups?.forEach(g => console.log(`  - ${g.name} (${g.code})`))
}

checkData().catch(console.error)