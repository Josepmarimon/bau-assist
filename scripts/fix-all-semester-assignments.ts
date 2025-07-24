import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixAllSemesterAssignments() {
  console.log('🔧 Fixing all incorrect semester assignments...\n')

  // Get the correct semesters for 2025-2026
  const { data: semesters } = await supabase
    .from('semesters')
    .select(`
      *,
      academic_year_id,
      academic_years!inner (
        name
      )
    `)
    .filter('academic_years.name', 'eq', '2025-2026')
    .order('number')

  if (!semesters || semesters.length !== 2) {
    console.error('❌ Could not find both semesters for 2025-2026')
    return
  }

  const firstSemesterId = semesters.find(s => s.number === 1)?.id
  const secondSemesterId = semesters.find(s => s.number === 2)?.id

  console.log('📅 2025-2026 Semesters:')
  console.log(`  - First: ${semesters[0].name} (${firstSemesterId})`)
  console.log(`  - Second: ${semesters[1].name} (${secondSemesterId})`)
  console.log()

  // Get all subjects with their groups
  const { data: subjects } = await supabase
    .from('subjects')
    .select(`
      id,
      code,
      name,
      semester,
      subject_groups (
        id,
        group_code,
        semester_id
      )
    `)
    .not('subject_groups', 'is', null)

  let totalUpdated = 0
  let totalErrors = 0

  // Process each subject
  for (const subject of subjects || []) {
    const updates = []

    for (const group of subject.subject_groups || []) {
      let correctSemesterId = null

      // Determine correct semester based on subject configuration
      if (subject.semester === '1r') {
        correctSemesterId = firstSemesterId
      } else if (subject.semester === '2n') {
        correctSemesterId = secondSemesterId
      } else if (subject.semester === '1r i 2n' || subject.semester === 'Anual') {
        // For annual subjects, keep current assignment if it's valid
        if (group.semester_id === firstSemesterId || group.semester_id === secondSemesterId) {
          continue // Already correct
        }
        // Otherwise assign to first semester as default
        correctSemesterId = firstSemesterId
      }

      // Check if update is needed
      if (correctSemesterId && group.semester_id !== correctSemesterId) {
        updates.push({
          groupId: group.id,
          groupCode: group.group_code,
          currentSemesterId: group.semester_id,
          correctSemesterId: correctSemesterId
        })
      }
    }

    // Apply updates if needed
    if (updates.length > 0) {
      console.log(`\n📚 ${subject.code} - ${subject.name} (${subject.semester})`)
      
      for (const update of updates) {
        const { error } = await supabase
          .from('subject_groups')
          .update({
            semester_id: update.correctSemesterId,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.groupId)

        if (error) {
          console.error(`  ❌ Error updating ${update.groupCode}:`, error.message)
          totalErrors++
        } else {
          console.log(`  ✅ Updated ${update.groupCode}`)
          totalUpdated++
        }
      }
    }
  }

  console.log('\n📊 Summary:')
  console.log(`  - Total groups updated: ${totalUpdated}`)
  console.log(`  - Total errors: ${totalErrors}`)

  // Verify a few examples
  console.log('\n🔍 Verification (sample):')
  const { data: verifyGroups } = await supabase
    .from('subject_groups')
    .select(`
      group_code,
      subjects (
        code,
        name,
        semester
      ),
      semesters (
        name
      )
    `)
    .in('group_code', ['GR3-Gm1', 'GR1-M1', 'GB2-M1'])
    .limit(10)

  verifyGroups?.forEach(g => {
    console.log(`  - ${g.group_code}: ${g.subjects?.[0]?.name} (${g.subjects?.[0]?.semester}) → ${g.semesters?.[0]?.name}`)
  })

  console.log('\n✨ Fix completed!')
}

// Add confirmation prompt
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})

console.log('⚠️  This will update all subject group semester assignments for 2025-2026.')
console.log('   It will:')
console.log('   - Assign 1st semester subjects to "Primer Semestre 2025-2026"')
console.log('   - Assign 2nd semester subjects to "Segon Semestre 2025-2026"')
console.log('   - Keep annual subjects in their current semester (or assign to 1st if invalid)')
console.log()

readline.question('Do you want to continue? (yes/no): ', (answer: string) => {
  if (answer.toLowerCase() === 'yes' || answer.toLowerCase() === 'y') {
    fixAllSemesterAssignments()
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