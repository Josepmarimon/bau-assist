import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function createAllSubjectGroups() {
  console.log('🚀 Creant grups per a totes les assignatures...')
  
  // Get all subjects
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .order('year')
    .order('name')
  
  console.log(`📚 Trobades ${subjects?.length || 0} assignatures`)
  
  // Get all assignments to understand which groups exist
  const { data: assignments } = await supabase
    .from('assignments')
    .select(`
      *,
      student_group:student_groups(*),
      subject:subjects(*)
    `)
  
  // Get semesters
  const { data: semesters } = await supabase
    .from('semesters')
    .select('*')
    .order('number')
  
  if (!semesters || semesters.length < 2) {
    console.error('❌ No hi ha prou semestres')
    return
  }
  
  // Group assignments by subject to find unique groups
  const subjectGroupsMap = new Map()
  
  assignments?.forEach(assignment => {
    if (!assignment.subject_id || !assignment.student_group) return
    
    const key = assignment.subject_id
    if (!subjectGroupsMap.has(key)) {
      subjectGroupsMap.set(key, new Set())
    }
    
    subjectGroupsMap.get(key).add({
      groupName: assignment.student_group.name,
      groupCode: assignment.student_group.name,
      year: assignment.student_group.year,
      shift: assignment.student_group.shift,
      semester: assignment.semester_id ? 
        (semesters.find(s => s.id === assignment.semester_id)?.number || 1) : 1
    })
  })
  
  let created = 0
  let errors = 0
  
  // For each subject, create groups based on assignments
  for (const subject of subjects || []) {
    const existingGroups = subjectGroupsMap.get(subject.id)
    
    if (!existingGroups || existingGroups.size === 0) {
      console.log(`⚠️  ${subject.name} (${subject.year}º) - No té assignacions`)
      continue
    }
    
    console.log(`\n📖 ${subject.name} (${subject.year}º)`)
    
    // Check existing subject groups
    const { data: currentGroups } = await supabase
      .from('subject_groups')
      .select('*')
      .eq('subject_id', subject.id)
    
    const existingGroupCodes = new Set(currentGroups?.map(g => g.group_code) || [])
    
    // Create missing groups
    for (const groupInfo of existingGroups) {
      if (existingGroupCodes.has(groupInfo.groupCode)) {
        console.log(`   ✓ Grup ${groupInfo.groupCode} ja existeix`)
        continue
      }
      
      // Determine group type based on name
      let groupType = 'teoria'
      if (groupInfo.groupCode.includes('Pràctica') || groupInfo.groupCode.includes('P')) {
        groupType = 'practica'
      } else if (groupInfo.groupCode.includes('Seminari') || groupInfo.groupCode.includes('S')) {
        groupType = 'seminari'
      } else if (groupInfo.groupCode.includes('Lab') || groupInfo.groupCode.includes('L')) {
        groupType = 'laboratori'
      }
      
      // Determine semester (many subjects are in both semesters)
      const semesterIds = []
      if (subject.semester === 'Anual' || subject.semester === '1r i 2n') {
        semesterIds.push(semesters[0].id, semesters[1].id)
      } else if (subject.semester === '1r') {
        semesterIds.push(semesters[0].id)
      } else if (subject.semester === '2n') {
        semesterIds.push(semesters[1].id)
      } else {
        // Default: both semesters
        semesterIds.push(semesters[0].id, semesters[1].id)
      }
      
      for (const semesterId of semesterIds) {
        const { error } = await supabase
          .from('subject_groups')
          .insert({
            subject_id: subject.id,
            semester_id: semesterId,
            group_type: groupType,
            group_code: groupInfo.groupCode,
            max_students: 30
          })
        
        if (error) {
          if (!error.message.includes('duplicate')) {
            console.error(`   ❌ Error creant grup ${groupInfo.groupCode}:`, error.message)
            errors++
          }
        } else {
          console.log(`   ✅ Creat grup ${groupInfo.groupCode}`)
          created++
        }
      }
    }
  }
  
  console.log('\n📊 Resum:')
  console.log(`   ✅ Grups creats: ${created}`)
  console.log(`   ❌ Errors: ${errors}`)
  
  // Verify results for a few subjects
  console.log('\n🔍 Verificant alguns exemples:')
  
  const exampleSubjects = [
    'Fonaments del Disseny I',
    'Projectes de Disseny Gràfic I',
    'Història del Disseny',
    'Projectes Finals'
  ]
  
  for (const subjectName of exampleSubjects) {
    const { data: subject } = await supabase
      .from('subjects')
      .select('*')
      .ilike('name', `%${subjectName}%`)
      .single()
    
    if (subject) {
      const { data: groups } = await supabase
        .from('subject_groups')
        .select('*')
        .eq('subject_id', subject.id)
      
      console.log(`\n${subject.name}: ${groups?.length || 0} grups`)
      if (groups) {
        console.log(`   Grups: ${groups.map(g => g.group_code).join(', ')}`)
      }
    }
  }
}

createAllSubjectGroups().catch(console.error)