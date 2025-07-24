import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAssignmentSemester() {
  console.log('🔍 Checking the problematic assignment...\n')

  // Get the specific assignment
  const { data: assignment } = await supabase
    .from('assignments')
    .select(`
      *,
      semester_id,
      semesters (
        name,
        academic_years (
          name
        )
      ),
      subject_groups (
        group_code,
        semester_id,
        semesters:semester_id (
          name
        ),
        subjects (
          name,
          code,
          semester
        )
      )
    `)
    .eq('id', 'f7e767dd-1cd1-4897-99d4-87c903ecb88f')
    .single()

  if (assignment) {
    console.log('Assignment details:')
    console.log('- Assignment ID:', assignment.id)
    console.log('- Assignment semester ID:', assignment.semester_id)
    console.log('- Assignment semester:', assignment.semesters?.name)
    console.log('\nSubject details:')
    console.log('- Subject:', assignment.subject_groups?.subjects?.name)
    console.log('- Subject code:', assignment.subject_groups?.subjects?.code)
    console.log('- Subject semester config:', assignment.subject_groups?.subjects?.semester)
    console.log('\nSubject group details:')
    console.log('- Group code:', assignment.subject_groups?.group_code)
    console.log('- Group semester ID:', assignment.subject_groups?.semester_id)
    console.log('- Group semester:', assignment.subject_groups?.semesters?.name)

    // Check if assignment semester matches subject group semester
    if (assignment.semester_id !== assignment.subject_groups?.semester_id) {
      console.log('\n⚠️  WARNING: Assignment semester does not match subject group semester!')
      console.log('This could cause conflicts across different semesters.')
    }

    // If it's assigned to wrong semester, fix it
    if (assignment.semesters?.name?.includes('Segon') && 
        assignment.subject_groups?.subjects?.semester === '1r') {
      console.log('\n❌ ERROR: First semester subject assigned to second semester!')
      
      // Get correct first semester ID
      const { data: firstSemester } = await supabase
        .from('semesters')
        .select('*')
        .eq('name', 'Primer Semestre 2025-2026')
        .single()

      if (firstSemester) {
        console.log('\n🔧 Fixing assignment to correct semester...')
        const { error } = await supabase
          .from('assignments')
          .update({ 
            semester_id: firstSemester.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', assignment.id)

        if (error) {
          console.error('Error updating assignment:', error)
        } else {
          console.log('✅ Assignment updated to correct semester!')
        }
      }
    }
  }
}

checkAssignmentSemester()