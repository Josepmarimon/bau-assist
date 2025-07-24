import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function revertSemesterChanges() {
  console.log('🔧 Reverting semester changes to match backup data...\n')

  // Read the differences file
  const differences = JSON.parse(
    fs.readFileSync('/Users/josepmarimon/Documents/github/bau-assist/semester-differences.json', 'utf-8')
  )

  let successCount = 0
  let errorCount = 0

  for (const diff of differences) {
    console.log(`\nReverting ${diff.code} - ${diff.name}:`)
    console.log(`  Current: ${diff.currentSemester} → Backup: ${diff.backupSemester}`)
    
    // Update the subject
    const { error } = await supabase
      .from('subjects')
      .update({
        semester: diff.backupSemester,
        updated_at: new Date().toISOString()
      })
      .eq('code', diff.code)

    if (error) {
      console.error(`  ❌ Error: ${error.message}`)
      errorCount++
    } else {
      console.log(`  ✅ Reverted successfully`)
      successCount++
      
      // Also update subject groups and assignments if needed
      await updateRelatedRecords(diff.code, diff.backupSemester)
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`- Successfully reverted: ${successCount}`)
  console.log(`- Errors: ${errorCount}`)
}

async function updateRelatedRecords(subjectCode: string, correctSemester: string) {
  // Get the subject
  const { data: subject } = await supabase
    .from('subjects')
    .select('id')
    .eq('code', subjectCode)
    .single()

  if (!subject) return

  // Determine which semester IDs to use
  const { data: semesters } = await supabase
    .from('semesters')
    .select('*')
    .in('name', ['Primer Semestre 2025-2026', 'Segon Semestre 2025-2026'])

  const firstSemesterId = semesters?.find(s => s.name.includes('Primer'))?.id
  const secondSemesterId = semesters?.find(s => s.name.includes('Segon'))?.id

  let targetSemesterId: string | null = null
  
  if (correctSemester === '1r') {
    targetSemesterId = firstSemesterId
  } else if (correctSemester === '2n') {
    targetSemesterId = secondSemesterId
  }
  // For '1r i 2n' or 'Anual', we don't update as they can be in either semester

  if (targetSemesterId && (correctSemester === '1r' || correctSemester === '2n')) {
    // Update subject groups
    const { data: groups } = await supabase
      .from('subject_groups')
      .select('id')
      .eq('subject_id', subject.id)

    for (const group of groups || []) {
      await supabase
        .from('subject_groups')
        .update({
          semester_id: targetSemesterId,
          updated_at: new Date().toISOString()
        })
        .eq('id', group.id)
    }

    // Update assignments
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id')
      .in('subject_group_id', (groups || []).map(g => g.id))

    for (const assignment of assignments || []) {
      await supabase
        .from('assignments')
        .update({
          semester_id: targetSemesterId,
          updated_at: new Date().toISOString()
        })
        .eq('id', assignment.id)
    }
  }
}

// Add confirmation
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log('⚠️  This will revert the following semester changes:')
console.log('- 4 subjects from 2n back to 1r')
console.log('- 1 subject from 1r back to 2n')
console.log('- 3 subjects back to their original semester configuration')
console.log()

readline.question('Do you want to continue? (yes/no): ', (answer: string) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    revertSemesterChanges()
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