import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyAssignmentsFinal() {
  console.log('🔍 Final verification of assignments...\n')

  // Get all assignments for GR4-Gm1 groups
  const { data: assignments } = await supabase
    .from('assignments')
    .select(`
      *,
      semesters (
        name
      ),
      subject_groups!inner (
        group_code,
        semester_id,
        subjects (
          name,
          code,
          semester
        )
      )
    `)
    .eq('subject_groups.group_code', 'GR4-Gm1')

  if (!assignments || assignments.length === 0) {
    console.log('No assignments found for GR4-Gm1')
    return
  }

  console.log(`Total assignments for GR4-Gm1: ${assignments.length}\n`)

  // Check for consistency
  let consistent = 0
  let inconsistent = 0

  assignments.forEach(a => {
    const subject = a.subject_groups?.subjects
    const subjectSemesterConfig = subject?.semester
    const assignmentSemester = a.semesters?.name
    
    let isCorrect = false
    
    if (subjectSemesterConfig === '1r' && assignmentSemester?.includes('Primer')) {
      isCorrect = true
    } else if (subjectSemesterConfig === '2n' && assignmentSemester?.includes('Segon')) {
      isCorrect = true
    } else if ((subjectSemesterConfig === '1r i 2n' || subjectSemesterConfig === 'Anual')) {
      isCorrect = true // Annual subjects can be in either semester
    }
    
    if (isCorrect) {
      consistent++
    } else {
      inconsistent++
      console.log(`❌ Inconsistent assignment:`)
      console.log(`   - Subject: ${subject?.name} (${subject?.code})`)
      console.log(`   - Subject config: ${subjectSemesterConfig}`)
      console.log(`   - Assignment semester: ${assignmentSemester}`)
      console.log()
    }
  })

  console.log(`\n📊 Summary:`)
  console.log(`- Consistent assignments: ${consistent}`)
  console.log(`- Inconsistent assignments: ${inconsistent}`)

  // Check specific case: Programació per Dissenyadors
  console.log('\n\n🔍 Specific check: Programació per Dissenyadors')
  
  const { data: progAssignments } = await supabase
    .from('assignments')
    .select(`
      *,
      semesters (
        name
      ),
      subject_groups!inner (
        group_code,
        semester_id,
        semesters:semester_id (
          name
        ),
        subjects!inner (
          name,
          code,
          semester
        )
      )
    `)
    .eq('subject_groups.subjects.code', 'GDVG44')
    .eq('subject_groups.group_code', 'GR4-Gm1')

  if (progAssignments && progAssignments.length > 0) {
    const a = progAssignments[0]
    console.log('Programació per Dissenyadors (GR4-Gm1):')
    console.log('- Subject semester config:', a.subject_groups?.subjects?.semester)
    console.log('- Subject group semester:', a.subject_groups?.semesters?.name)
    console.log('- Assignment semester:', a.semesters?.name)
    console.log('- All match?', 
      a.subject_groups?.subjects?.semester === '2n' && 
      a.semesters?.name?.includes('Segon') ? '✅' : '❌'
    )
  }
}

verifyAssignmentsFinal()