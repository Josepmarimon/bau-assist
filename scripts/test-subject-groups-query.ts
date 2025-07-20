import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function testQuery() {
  // First find Fonaments
  const { data: subject } = await supabase
    .from('subjects')
    .select('*')
    .eq('name', 'Fonaments del Disseny I')
    .single()

  console.log('Subject:', subject)

  if (!subject) return

  // Test the exact query from SubjectDetailDialog
  const { data, error } = await supabase
    .from('subject_groups')
    .select(`
      id,
      group_code,
      group_type,
      max_students,
      semester_id,
      semester:semesters (
        id,
        name,
        number,
        academic_year:academic_years (
          id,
          year
        )
      ),
      assignments (
        id,
        classroom:classrooms (
          id,
          code,
          name,
          building,
          capacity
        ),
        time_slot:time_slots (
          id,
          day_of_week,
          start_time,
          end_time
        )
      )
    `)
    .eq('subject_id', subject.id)
    .order('semester_id', { ascending: false })
    .order('group_type', { ascending: true })
    .order('group_code', { ascending: true })

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('\nSubject Groups:', data?.length || 0)
  console.log('First Group:', JSON.stringify(data?.[0], null, 2))
  
  // Check if the issue is with the foreign key naming
  console.log('\nSimple test with correct foreign key:')
  const { data: simpleData, error: simpleError } = await supabase
    .from('subject_groups')
    .select('*')
    .eq('subject_id', subject.id)
    
  console.log('Simple query result:', simpleData?.length, 'groups')
}

testQuery().catch(console.error)