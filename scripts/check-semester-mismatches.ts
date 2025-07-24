import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSemesterMismatches() {
  console.log('Checking for semester assignment mismatches...\n')

  // Get all subjects with their groups and semester assignments
  const { data: subjects, error } = await supabase
    .from('subjects')
    .select(`
      id,
      code,
      name,
      semester,
      subject_groups (
        id,
        group_code,
        semester_id,
        semesters (
          name
        )
      )
    `)
    .not('subject_groups', 'is', null)
    .order('code')

  if (error) {
    console.error('Error fetching subjects:', error)
    return
  }

  // Get semester IDs for reference
  const { data: semesters } = await supabase
    .from('semesters')
    .select('id, name')

  const firstSemesterIds = semesters?.filter(s => s.name.includes('Primer')).map(s => s.id) || []
  const secondSemesterIds = semesters?.filter(s => s.name.includes('Segon')).map(s => s.id) || []

  console.log('First semester IDs:', firstSemesterIds)
  console.log('Second semester IDs:', secondSemesterIds)
  console.log()

  let mismatches = 0
  const mismatchedSubjects: any[] = []

  subjects?.forEach(subject => {
    if (subject.subject_groups && subject.subject_groups.length > 0) {
      subject.subject_groups.forEach((group: any) => {
        let expectedSemester = ''
        let actualSemester = group.semesters?.name || 'Unknown'
        let isMismatch = false

        // Check if subject semester matches group semester
        if (subject.semester === '1r' && !firstSemesterIds.includes(group.semester_id)) {
          expectedSemester = 'First semester'
          isMismatch = true
        } else if (subject.semester === '2n' && !secondSemesterIds.includes(group.semester_id)) {
          expectedSemester = 'Second semester'
          isMismatch = true
        } else if (subject.semester === '1r i 2n') {
          // Both semesters are valid
          isMismatch = false
        }

        if (isMismatch) {
          mismatches++
          mismatchedSubjects.push({
            subjectCode: subject.code,
            subjectName: subject.name,
            subjectSemester: subject.semester,
            groupCode: group.group_code,
            assignedSemester: actualSemester,
            expectedSemester: expectedSemester
          })
        }
      })
    }
  })

  console.log(`Found ${mismatches} semester mismatches:\n`)

  // Group by subject for better readability
  const groupedMismatches = mismatchedSubjects.reduce((acc, mismatch) => {
    const key = `${mismatch.subjectCode} - ${mismatch.subjectName}`
    if (!acc[key]) {
      acc[key] = {
        subjectSemester: mismatch.subjectSemester,
        groups: []
      }
    }
    acc[key].groups.push({
      groupCode: mismatch.groupCode,
      assignedSemester: mismatch.assignedSemester
    })
    return acc
  }, {} as any)

  Object.entries(groupedMismatches).forEach(([subject, data]: [string, any]) => {
    console.log(`${subject} (Semester: ${data.subjectSemester})`)
    data.groups.forEach((group: any) => {
      console.log(`  - Group ${group.groupCode}: ${group.assignedSemester}`)
    })
    console.log()
  })

  // Count by year
  const mismatchesByYear: any = {}
  mismatchedSubjects.forEach(m => {
    const year = m.subjectCode.substring(3, 4)
    mismatchesByYear[year] = (mismatchesByYear[year] || 0) + 1
  })

  console.log('Mismatches by year:')
  Object.entries(mismatchesByYear).sort().forEach(([year, count]) => {
    console.log(`  Year ${year}: ${count} mismatches`)
  })

  return mismatchedSubjects
}

checkSemesterMismatches()