import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!  // Use service role key

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkGroupsDetailed() {
  console.log('Checking all tables for group information...\n')

  // Check student_groups table
  const { data: studentGroups, error: sgError } = await supabase
    .from('student_groups')
    .select('*')
    .in('name', ['GR3-Gm1', 'GR3-Gm2', 'GR3-Gt'])

  console.log('Student groups found:')
  console.log(studentGroups)

  // Check subject_groups with RLS bypassed
  const { data: subjectGroups, error: subError } = await supabase
    .from('subject_groups')
    .select(`
      *,
      subjects (
        name,
        code,
        semester
      ),
      semesters (
        name,
        start_date,
        end_date
      )
    `)
    .limit(10)

  console.log('\nSubject groups (first 10):')
  console.log(subjectGroups)

  // Check for Infografia II groups specifically
  const { data: infografia } = await supabase
    .from('subjects')
    .select('*')
    .eq('code', 'GDVG93')
    .single()

  if (infografia) {
    console.log('\nInfografia II subject:')
    console.log('- ID:', infografia.id)
    console.log('- Name:', infografia.name)
    console.log('- Semester:', infografia.semester)

    // Try to find groups for this subject
    const { data: infografiaGroups, error } = await supabase
      .from('subject_groups')
      .select('*')
      .eq('subject_id', infografia.id)

    console.log('\nGroups for Infografia II:')
    console.log(infografiaGroups)
    if (error) console.error('Error:', error)
  }

  // Check if there's a view or different table
  let tables = null
  try {
    const result = await supabase.rpc('get_table_names')
    tables = result.data
  } catch (error) {
    // Function might not exist
  }

  if (tables) {
    console.log('\nTables with "group" in name:')
    tables.filter((t: any) => t.table_name.includes('group')).forEach((t: any) => {
      console.log(`- ${t.table_name}`)
    })
  }
}

checkGroupsDetailed()