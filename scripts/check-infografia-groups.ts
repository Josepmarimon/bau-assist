import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkInfografiaGroups() {
  console.log('Checking Infografia II groups and their semesters...\n')

  // First get the subject
  const { data: subject, error: subjectError } = await supabase
    .from('subjects')
    .select('*')
    .eq('code', 'GDVG93')
    .single()

  if (subjectError) {
    console.error('Error fetching subject:', subjectError)
    return
  }

  console.log('Subject info:')
  console.log('- Name:', subject.name)
  console.log('- Semester:', subject.semester)
  console.log('- Subject ID:', subject.id)
  console.log()

  // Get subject groups with semester info
  const { data: groups, error: groupsError } = await supabase
    .from('subject_groups')
    .select(`
      *,
      semesters (
        id,
        name,
        start_date,
        end_date,
        academic_years (
          name
        )
      )
    `)
    .eq('subject_id', subject.id)

  if (groupsError) {
    console.error('Error fetching groups:', groupsError)
    return
  }

  console.log('Subject groups:')
  groups?.forEach(group => {
    console.log(`\nGroup: ${group.group_code}`)
    console.log('- Group ID:', group.id)
    console.log('- Semester ID:', group.semester_id)
    console.log('- Semester name:', group.semesters?.name)
    console.log('- Academic year:', group.semesters?.academic_years?.name)
    console.log('- Start date:', group.semesters?.start_date)
    console.log('- End date:', group.semesters?.end_date)
  })

  // Check available semesters for 2025-2026
  console.log('\n\nAvailable semesters for 2025-2026:')
  const { data: semesters, error: semestersError } = await supabase
    .from('semesters')
    .select(`
      *,
      academic_year_id,
      academic_years!inner (
        name
      )
    `)
    .filter('academic_years.name', 'eq', '2025-2026')

  if (semestersError) {
    console.error('Error fetching semesters:', semestersError)
  } else {
    semesters?.forEach(sem => {
      console.log(`\n- ${sem.name}`)
      console.log('  ID:', sem.id)
      console.log('  Start:', sem.start_date)
      console.log('  End:', sem.end_date)
    })
  }
}

checkInfografiaGroups()