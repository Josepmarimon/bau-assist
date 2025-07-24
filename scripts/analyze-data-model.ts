import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function analyzeDataModel() {
  console.log('🔍 Analyzing the data model to understand the relationships...\n')

  // 1. Understanding student groups
  console.log('1️⃣ STUDENT GROUPS (grups d\'estudiants):')
  console.log('These are the actual student cohorts, like GR4-Gm1\n')
  
  const { data: studentGroups } = await supabase
    .from('student_groups')
    .select('*')
    .eq('code', 'GR4-Gm1')
    .single()
    
  console.log('Example - GR4-Gm1:')
  console.log('- Name:', studentGroups?.name)
  console.log('- Year:', studentGroups?.year)
  console.log('- Specialization:', studentGroups?.specialization)
  console.log('- Max students:', studentGroups?.max_students)
  console.log('NOTE: Student groups do NOT have semester information!')

  // 2. Understanding subjects
  console.log('\n\n2️⃣ SUBJECTS (assignatures):')
  console.log('These are the courses/subjects with their semester configuration\n')
  
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .in('code', ['GDVG44', 'GDVG34'])
    .order('code')
    
  subjects?.forEach(subject => {
    console.log(`${subject.code} - ${subject.name}:`)
    console.log(`- Semester configuration: ${subject.semester}`)
    console.log(`- Year: ${subject.year}`)
    console.log()
  })

  // 3. Understanding subject groups
  console.log('3️⃣ SUBJECT GROUPS:')
  console.log('These link a SUBJECT to a STUDENT GROUP for a specific SEMESTER\n')
  
  const { data: subjectGroups } = await supabase
    .from('subject_groups')
    .select(`
      *,
      subjects (
        code,
        name,
        semester
      ),
      semesters (
        name
      )
    `)
    .eq('group_code', 'GR4-Gm1')
    .limit(5)
    
  console.log('Subject groups for GR4-Gm1:')
  subjectGroups?.forEach(sg => {
    console.log(`- ${sg.subjects?.name} (${sg.subjects?.code})`)
    console.log(`  Subject semester config: ${sg.subjects?.semester}`)
    console.log(`  Assigned to semester: ${sg.semesters?.name}`)
    console.log()
  })

  // 4. Check specific case: GR4-Gm1 subjects by semester
  console.log('4️⃣ ANALYSIS: What subjects does GR4-Gm1 have in each semester?\n')
  
  const { data: allSubjectGroups } = await supabase
    .from('subject_groups')
    .select(`
      *,
      subjects (
        code,
        name,
        semester,
        year
      ),
      semesters (
        name,
        number
      )
    `)
    .eq('group_code', 'GR4-Gm1')
    .order('semesters(number)')
    
  const bySemester = {
    first: [] as any[],
    second: [] as any[]
  }
  
  allSubjectGroups?.forEach(sg => {
    if (sg.semesters?.name.includes('Primer')) {
      bySemester.first.push(sg)
    } else if (sg.semesters?.name.includes('Segon')) {
      bySemester.second.push(sg)
    }
  })
  
  console.log('FIRST SEMESTER subjects for GR4-Gm1:')
  bySemester.first.forEach(sg => {
    console.log(`- ${sg.subjects?.name} (config: ${sg.subjects?.semester})`)
  })
  
  console.log('\nSECOND SEMESTER subjects for GR4-Gm1:')
  bySemester.second.forEach(sg => {
    console.log(`- ${sg.subjects?.name} (config: ${sg.subjects?.semester})`)
  })

  // 5. Verify if there are mismatches
  console.log('\n\n5️⃣ CHECKING FOR MISMATCHES:')
  
  const mismatches = allSubjectGroups?.filter(sg => {
    const subjectSemester = sg.subjects?.semester
    const assignedSemester = sg.semesters?.name
    
    if (subjectSemester === '1r' && assignedSemester?.includes('Segon')) return true
    if (subjectSemester === '2n' && assignedSemester?.includes('Primer')) return true
    return false
  })
  
  if (mismatches && mismatches.length > 0) {
    console.log(`\n⚠️  Found ${mismatches.length} subject groups with incorrect semester assignments:`)
    mismatches.forEach(m => {
      console.log(`- ${m.subjects?.name} (${m.subjects?.semester}) assigned to ${m.semesters?.name}`)
    })
  } else {
    console.log('✅ All subject groups have correct semester assignments')
  }
}

analyzeDataModel()