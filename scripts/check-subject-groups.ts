import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkSubjectGroups() {
  // First, find the Fonaments del Disseny I subject
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .eq('year', 1)
    .order('name')

  console.log('All first year subjects:', subjects?.map(s => s.name))

  const subject = subjects?.find(s => s.name.includes('Fonaments del Disseny'))

  console.log('Subject:', subject)

  if (subject) {
    // Get subject groups
    const { data: groups } = await supabase
      .from('subject_groups')
      .select('*')
      .eq('subject_id', subject.id)
    
    console.log('\nSubject Groups found:', groups?.length || 0)
    console.log('Groups:', groups)
    
    // Get assignments for this subject
    const { data: assignments } = await supabase
      .from('assignments')
      .select(`
        *,
        student_group:student_groups(*),
        subject_group:subject_groups(*)
      `)
      .eq('subject_id', subject.id)
      .limit(20)
    
    console.log('\nAssignments found:', assignments?.length || 0)
    if (assignments && assignments.length > 0) {
      console.log('Sample assignments:', assignments.slice(0, 5).map(a => ({
        id: a.id,
        student_group: a.student_group?.name,
        subject_group: a.subject_group?.group_code
      })))
    }

    // Get student groups that might be related
    const { data: studentGroups } = await supabase
      .from('student_groups')
      .select('*')
      .eq('year', 1)
      .order('name')
    
    console.log('\nAll 1st year Student Groups:', studentGroups?.map(g => g.name))
  }
}

checkSubjectGroups().catch(console.error)