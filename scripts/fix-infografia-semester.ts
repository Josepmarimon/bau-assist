import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!  // Use service role key

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixInfografiaSemester() {
  console.log('Checking and fixing Infografia II semester assignment...\n')

  // Get all semesters
  const { data: semesters, error: semError } = await supabase
    .from('semesters')
    .select(`
      *,
      academic_years (
        name
      )
    `)
    .order('name')

  if (semError) {
    console.error('Error fetching semesters:', semError)
    return
  }

  console.log('Available semesters:')
  semesters?.forEach(sem => {
    console.log(`- ${sem.name} (ID: ${sem.id})`)
    console.log(`  Academic Year: ${sem.academic_years?.name}`)
    console.log(`  Dates: ${sem.start_date} to ${sem.end_date}`)
  })

  // Find the second semester for 2025-2026
  const secondSemester = semesters?.find(s => 
    s.name.includes('Segon Semestre') && 
    s.academic_years?.name === '2025-2026'
  )

  if (!secondSemester) {
    console.error('\nError: Could not find second semester for 2025-2026')
    return
  }

  console.log(`\nFound second semester: ${secondSemester.name} (ID: ${secondSemester.id})`)

  // Get Infografia II groups
  const { data: infografiaGroups, error: groupError } = await supabase
    .from('subject_groups')
    .select('*')
    .eq('subject_id', '8110fdb3-3361-4b07-b745-7396836d5ffc')

  if (groupError) {
    console.error('Error fetching Infografia II groups:', groupError)
    return
  }

  console.log(`\nFound ${infografiaGroups?.length} groups for Infografia II`)
  
  // Update each group to the correct semester
  for (const group of infografiaGroups || []) {
    console.log(`\nUpdating group ${group.group_code}...`)
    
    const { error: updateError } = await supabase
      .from('subject_groups')
      .update({ 
        semester_id: secondSemester.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', group.id)

    if (updateError) {
      console.error(`Error updating group ${group.group_code}:`, updateError)
    } else {
      console.log(`✓ Updated group ${group.group_code} to ${secondSemester.name}`)
    }
  }

  // Verify the update
  const { data: updatedGroups } = await supabase
    .from('subject_groups')
    .select(`
      *,
      semesters (
        name
      )
    `)
    .eq('subject_id', '8110fdb3-3361-4b07-b745-7396836d5ffc')

  console.log('\nVerification - Updated groups:')
  updatedGroups?.forEach(group => {
    console.log(`- ${group.group_code}: ${group.semesters?.name}`)
  })

  console.log('\n✓ Fix completed!')
}

fixInfografiaSemester()