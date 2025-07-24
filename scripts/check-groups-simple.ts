import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkGroups() {
  // Get all subject groups with group code GR3-Gm1 or GR3-Gm2
  const { data: groups, error } = await supabase
    .from('subject_groups')
    .select(`
      *,
      subjects (
        name,
        code,
        semester
      ),
      semesters (
        id,
        name,
        start_date,
        end_date
      )
    `)
    .in('group_code', ['GR3-Gm1', 'GR3-Gm2', 'GR3-Gt'])

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Groups found:', groups?.length)
  
  groups?.forEach(group => {
    console.log(`\n${group.group_code} - ${group.subjects?.name} (${group.subjects?.code})`)
    console.log('Subject semester:', group.subjects?.semester)
    console.log('Group semester ID:', group.semester_id)
    console.log('Group semester name:', group.semesters?.name)
    console.log('Semester dates:', group.semesters?.start_date, 'to', group.semesters?.end_date)
  })

  // Check all semesters
  console.log('\n\nAll available semesters:')
  const { data: allSemesters } = await supabase
    .from('semesters')
    .select('*')
    .order('name')

  allSemesters?.forEach(sem => {
    console.log(`- ${sem.name} (ID: ${sem.id})`)
    console.log(`  Dates: ${sem.start_date} to ${sem.end_date}`)
  })
}

checkGroups()