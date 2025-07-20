import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkFirstYearSubjects() {
  // Get all first year subjects
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .eq('year', 1)
    .order('name')

  console.log('First year subjects:', subjects?.map(s => ({ id: s.id, name: s.name })))

  // Find Fonaments
  const fonaments = subjects?.find(s => s.name.toLowerCase().includes('fonament'))
  
  if (fonaments) {
    console.log('\nFonaments subject found:', fonaments)
    
    // Get subject groups
    const { data: groups } = await supabase
      .from('subject_groups')
      .select('*')
      .eq('subject_id', fonaments.id)
    
    console.log('\nSubject Groups:', groups)
    
    // If no groups, check assignments directly
    const { data: assignments } = await supabase
      .from('assignments')
      .select(`
        *,
        student_group:student_groups(*)
      `)
      .eq('subject_id', fonaments.id)
      .limit(10)
    
    console.log('\nAssignments:', assignments?.map(a => ({
      student_group: a.student_group?.name,
      subject_group_id: a.subject_group_id
    })))
  }

  // Check student groups
  const { data: studentGroups } = await supabase
    .from('student_groups')
    .select('*')
    .eq('year', 1)
    .order('name')
  
  console.log('\nAll 1st year Student Groups:', studentGroups?.map(g => g.name))
}

checkFirstYearSubjects().catch(console.error)