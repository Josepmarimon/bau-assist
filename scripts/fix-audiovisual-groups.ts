import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fixAudiovisualGroups() {
  console.log('🔧 Fixing Audiovisual subject groups...\n')
  
  // Get semesters
  const { data: semesters } = await supabase
    .from('semesters')
    .select('*')
    .order('number')
  
  if (!semesters || semesters.length < 2) {
    console.error('❌ No semesters found')
    return
  }
  
  // Define subjects that need groups
  const subjectsToFix = [
    { name: 'Projectes de Disseny Audiovisual I', code: 'GDVA33', year: 3 },
    { name: 'Projectes de Disseny Audiovisual II', code: 'GDVA83', year: 3 },
    { name: 'Taller d\'Audiovisual I', code: 'GDVA43', year: 3 },
    { name: 'Taller d\'Audiovisual II', code: 'GDVA93', year: 3 },
    { name: 'Cultura Audiovisual I', code: 'GDVA23', year: 3 }
  ]
  
  // Student groups for audiovisual (based on year 4 pattern)
  const audiovisualGroups = [
    { code: '3r Matí Am', shift: 'Matí' },
    { code: '3r Tarda At', shift: 'Tarda' }
  ]
  
  for (const subjectInfo of subjectsToFix) {
    // Find the subject
    const { data: subject } = await supabase
      .from('subjects')
      .select('*')
      .eq('code', subjectInfo.code)
      .single()
    
    if (!subject) {
      console.log(`⚠️  Subject ${subjectInfo.name} (${subjectInfo.code}) not found`)
      continue
    }
    
    console.log(`\n📚 ${subject.name} (${subject.code})`)
    
    // Check existing groups
    const { data: existingGroups } = await supabase
      .from('subject_groups')
      .select('*')
      .eq('subject_id', subject.id)
    
    if (existingGroups && existingGroups.length > 0) {
      console.log(`   ✓ Already has ${existingGroups.length} groups`)
      continue
    }
    
    // Determine which semester(s)
    let semesterIds = []
    if (subject.name.includes(' I')) {
      semesterIds = [semesters[0].id] // First semester
    } else if (subject.name.includes(' II')) {
      semesterIds = [semesters[1].id] // Second semester
    } else {
      semesterIds = [semesters[0].id, semesters[1].id] // Both semesters
    }
    
    // Create groups
    let created = 0
    for (const groupInfo of audiovisualGroups) {
      for (const semesterId of semesterIds) {
        const { error } = await supabase
          .from('subject_groups')
          .insert({
            subject_id: subject.id,
            semester_id: semesterId,
            group_type: subject.name.includes('Projectes') ? 'teoria' : 'practica',
            group_code: groupInfo.code,
            max_students: 30
          })
        
        if (error) {
          console.error(`   ❌ Error creating group ${groupInfo.code}:`, error.message)
        } else {
          console.log(`   ✅ Created group ${groupInfo.code}`)
          created++
        }
      }
    }
    
    console.log(`   📊 Created ${created} groups total`)
  }
  
  // Also check for missing assignments
  console.log('\n\n🔍 Checking if assignments need to be created...')
  
  // Get all audiovisual student groups
  const { data: studentGroups } = await supabase
    .from('student_groups')
    .select('*')
    .or('name.eq.3r Matí Am,name.eq.3r Tarda At')
  
  console.log(`Found ${studentGroups?.length || 0} audiovisual student groups`)
  
  // For each subject, check if assignments exist
  for (const subjectInfo of subjectsToFix) {
    const { data: subject } = await supabase
      .from('subjects')
      .select('*')
      .eq('code', subjectInfo.code)
      .single()
    
    if (!subject) continue
    
    const { data: assignments } = await supabase
      .from('assignments')
      .select('*')
      .eq('subject_id', subject.id)
    
    if (!assignments || assignments.length === 0) {
      console.log(`\n⚠️  ${subject.name} has no assignments. Run the assignment import script to create them.`)
    }
  }
}

fixAudiovisualGroups().catch(console.error)