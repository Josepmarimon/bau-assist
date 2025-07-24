import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixMismatchedAssignments() {
  console.log('🔍 Finding assignments with mismatched semesters...\n')

  // Get all assignments with their subject groups
  const { data: assignments } = await supabase
    .from('assignments')
    .select(`
      id,
      semester_id,
      subject_group_id,
      semesters (
        name
      ),
      subject_groups (
        id,
        group_code,
        semester_id,
        semesters:semester_id (
          name
        ),
        subjects (
          name,
          semester
        )
      )
    `)

  if (!assignments) {
    console.log('No assignments found')
    return
  }

  // Find mismatches
  const mismatched = assignments.filter(a => 
    a.semester_id !== a.subject_groups?.[0]?.semester_id
  )

  console.log(`Found ${mismatched.length} assignments with mismatched semesters\n`)

  if (mismatched.length === 0) {
    console.log('✅ All assignments have matching semesters!')
    return
  }

  // Group by type of mismatch
  let fixCount = 0
  
  for (const assignment of mismatched) {
    console.log(`\nAssignment ${assignment.id}:`)
    console.log(`- Subject: ${assignment.subject_groups?.[0]?.subjects?.[0]?.name}`)
    console.log(`- Group: ${assignment.subject_groups?.[0]?.group_code}`)
    console.log(`- Assignment semester: ${assignment.semesters?.[0]?.name}`)
    console.log(`- Subject group semester: ${assignment.subject_groups?.[0]?.semesters?.[0]?.name}`)
    
    // Fix by updating assignment to match subject group semester
    const { error } = await supabase
      .from('assignments')
      .update({
        semester_id: assignment.subject_groups?.[0]?.semester_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', assignment.id)

    if (error) {
      console.error(`❌ Error fixing assignment ${assignment.id}:`, error.message)
    } else {
      console.log(`✅ Fixed assignment to match subject group semester`)
      fixCount++
    }
  }

  console.log(`\n📊 Summary: Fixed ${fixCount} out of ${mismatched.length} mismatched assignments`)
}

// Add confirmation prompt
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log('⚠️  This will fix all assignments where the assignment semester doesn\'t match the subject group semester.')
console.log('   The assignment will be updated to use the subject group\'s semester.')
console.log()

readline.question('Do you want to continue? (yes/no): ', (answer: string) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    fixMismatchedAssignments()
      .then(() => process.exit(0))
      .catch(err => {
        console.error('Error:', err)
        process.exit(1)
      })
  } else {
    console.log('❌ Operation cancelled')
    process.exit(0)
  }
})