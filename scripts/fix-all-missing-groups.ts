import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function fixAllMissingGroups() {
  console.log('🔍 Finding subjects with assignments but no groups...\n')
  
  // Get all subjects
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .order('year', { ascending: true })
    .order('name', { ascending: true })
  
  // Get semesters
  const { data: semesters } = await supabase
    .from('semesters')
    .select('*')
    .order('number')
  
  if (!semesters || semesters.length < 2) {
    console.error('❌ No semesters found')
    return
  }
  
  let subjectsWithIssues = []
  let totalFixed = 0
  
  for (const subject of subjects || []) {
    // Check if subject has groups
    const { data: groups } = await supabase
      .from('subject_groups')
      .select('*')
      .eq('subject_id', subject.id)
    
    // Check if subject has assignments
    const { data: assignments } = await supabase
      .from('assignments')
      .select(`
        *,
        student_group:student_groups(*)
      `)
      .eq('subject_id', subject.id)
      .limit(20)
    
    // If has assignments but no groups, we need to fix it
    if (assignments && assignments.length > 0 && (!groups || groups.length === 0)) {
      subjectsWithIssues.push({
        subject,
        assignmentCount: assignments.length,
        studentGroups: [...new Set(assignments.map(a => a.student_group))].filter(Boolean)
      })
    }
  }
  
  console.log(`Found ${subjectsWithIssues.length} subjects with assignments but no groups\n`)
  
  // Fix each subject
  for (const { subject, studentGroups } of subjectsWithIssues) {
    console.log(`\n📚 ${subject.name} (${subject.code}) - Year ${subject.year}`)
    console.log(`   Student groups with assignments: ${studentGroups.map(g => g.name).join(', ')}`)
    
    // Determine semester(s)
    let semesterIds = []
    if (subject.name.includes(' I') && !subject.name.includes(' II')) {
      semesterIds = [semesters[0].id]
    } else if (subject.name.includes(' II')) {
      semesterIds = [semesters[1].id]
    } else {
      // Both semesters for annual subjects
      semesterIds = [semesters[0].id, semesters[1].id]
    }
    
    // Create groups based on student groups
    let created = 0
    const uniqueGroupCodes = [...new Set(studentGroups.map(g => g.name))]
    
    for (const groupCode of uniqueGroupCodes) {
      // Determine group type based on subject name
      let groupType = 'teoria'
      if (subject.name.includes('Taller') || subject.name.includes('Pràctica')) {
        groupType = 'practica'
      } else if (subject.name.includes('Seminari')) {
        groupType = 'seminari'
      } else if (subject.name.includes('Laboratori')) {
        groupType = 'laboratori'
      }
      
      for (const semesterId of semesterIds) {
        const { error } = await supabase
          .from('subject_groups')
          .insert({
            subject_id: subject.id,
            semester_id: semesterId,
            group_type: groupType,
            group_code: groupCode,
            max_students: 30
          })
        
        if (error) {
          if (!error.message.includes('duplicate')) {
            console.error(`   ❌ Error creating group ${groupCode}:`, error.message)
          }
        } else {
          console.log(`   ✅ Created group ${groupCode}`)
          created++
        }
      }
    }
    
    console.log(`   📊 Created ${created} groups`)
    totalFixed += created
  }
  
  console.log(`\n\n✅ Total groups created: ${totalFixed}`)
  
  // Now check for subjects with no assignments and no groups (might need different handling)
  console.log('\n\n🔍 Checking subjects with no assignments and no groups...')
  
  let orphanSubjects = []
  for (const subject of subjects || []) {
    const { data: groups } = await supabase
      .from('subject_groups')
      .select('*')
      .eq('subject_id', subject.id)
    
    const { data: assignments } = await supabase
      .from('assignments')
      .select('*')
      .eq('subject_id', subject.id)
      .limit(1)
    
    if ((!groups || groups.length === 0) && (!assignments || assignments.length === 0)) {
      orphanSubjects.push(subject)
    }
  }
  
  if (orphanSubjects.length > 0) {
    console.log(`\nFound ${orphanSubjects.length} subjects with no groups and no assignments:`)
    orphanSubjects.forEach(s => {
      console.log(`  - ${s.name} (${s.code}) - Year ${s.year}`)
    })
    console.log('\nThese subjects may need manual review or data import from schedule images.')
  }
}

fixAllMissingGroups().catch(console.error)