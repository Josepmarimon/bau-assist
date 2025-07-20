import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function checkAudiovisualSubjects() {
  // Search for subjects containing "Audiovisual"
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .ilike('name', '%Audiovisual%')
    .order('year', { ascending: true })
    .order('name', { ascending: true })

  console.log(`Found ${subjects?.length || 0} Audiovisual subjects:`)
  
  for (const subject of subjects || []) {
    console.log(`\n${subject.name} (${subject.code}) - Year ${subject.year}`)
    
    // Check subject groups
    const { data: groups } = await supabase
      .from('subject_groups')
      .select('*')
      .eq('subject_id', subject.id)
    
    console.log(`  Subject Groups: ${groups?.length || 0}`)
    if (groups && groups.length > 0) {
      console.log(`  Groups:`, groups.map(g => g.group_code).join(', '))
    }
    
    // Check assignments
    const { data: assignments } = await supabase
      .from('assignments')
      .select(`
        *,
        student_group:student_groups(name)
      `)
      .eq('subject_id', subject.id)
      .limit(5)
    
    console.log(`  Assignments: ${assignments?.length || 0}`)
    if (assignments && assignments.length > 0) {
      console.log(`  Student Groups:`, assignments.map(a => a.student_group?.name).join(', '))
    }
  }
  
  // Also check for subjects with similar variations
  console.log('\n\nChecking other possible variations:')
  const variations = ['Disseny Audiovisual', 'Disseny d\'Audiovisual', 'Projectes Audiovisual']
  
  for (const variation of variations) {
    const { data } = await supabase
      .from('subjects')
      .select('name, code, year')
      .ilike('name', `%${variation}%`)
    
    if (data && data.length > 0) {
      console.log(`\nFound with "${variation}":`)
      data.forEach(s => console.log(`  - ${s.name} (${s.code}) - Year ${s.year}`))
    }
  }
}

checkAudiovisualSubjects().catch(console.error)