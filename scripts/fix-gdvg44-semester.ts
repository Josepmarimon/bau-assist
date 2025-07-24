import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixGDVG44Semester() {
  console.log('🔧 Fixing GDVG44 semester back to first semester...\n')

  // Update GDVG44 to first semester
  const { error: subjectError } = await supabase
    .from('subjects')
    .update({ 
      semester: '1r',
      updated_at: new Date().toISOString()
    })
    .eq('code', 'GDVG44')

  if (subjectError) {
    console.error('Error updating subject:', subjectError)
    return
  }

  console.log('✅ Updated GDVG44 to first semester (1r)')

  // Now update the subject groups to first semester
  const { data: subjectGroups } = await supabase
    .from('subject_groups')
    .select('*')
    .eq('subjects.code', 'GDVG44')

  // Get first semester ID for 2025-2026
  const { data: firstSemester } = await supabase
    .from('semesters')
    .select('*')
    .eq('name', 'Primer Semestre 2025-2026')
    .single()

  if (!firstSemester) {
    console.error('Could not find first semester 2025-2026')
    return
  }

  // Update subject groups
  const { data: groups } = await supabase
    .from('subject_groups')
    .select('*, subjects!inner(code)')
    .eq('subjects.code', 'GDVG44')

  for (const group of groups || []) {
    const { error } = await supabase
      .from('subject_groups')
      .update({
        semester_id: firstSemester.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', group.id)

    if (error) {
      console.error(`Error updating group ${group.group_code}:`, error)
    } else {
      console.log(`✅ Updated group ${group.group_code} to first semester`)
    }
  }

  // Update assignments to match
  const { data: assignments } = await supabase
    .from('assignments')
    .select('*, subject_groups!inner(subjects!inner(code))')
    .eq('subject_groups.subjects.code', 'GDVG44')

  for (const assignment of assignments || []) {
    const { error } = await supabase
      .from('assignments')
      .update({
        semester_id: firstSemester.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignment.id)

    if (error) {
      console.error(`Error updating assignment ${assignment.id}:`, error)
    } else {
      console.log(`✅ Updated assignment ${assignment.id} to first semester`)
    }
  }

  console.log('\n✅ Fix completed!')
}

fixGDVG44Semester()