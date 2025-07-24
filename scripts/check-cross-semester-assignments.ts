import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkCrossSemesterAssignments() {
  console.log('Checking for cross-semester assignments...\n')
  
  // Get all assignments with their semester and subject group details
  const { data: assignments, error } = await supabase
    .from('assignments')
    .select(`
      id,
      semester_id,
      semesters!semester_id (
        name,
        academic_years (
          name
        )
      ),
      subject_groups!subject_group_id (
        id,
        group_code,
        semester_id,
        subjects (
          name,
          code
        )
      )
    `)
    .order('subject_groups(group_code)')
    
  if (error) {
    console.error('Error fetching assignments:', error)
    return
  }
  
  // Check for mismatches
  let mismatches = []
  for (const assignment of assignments || []) {
    if (assignment.subject_groups && assignment.subject_groups.length > 0 && assignment.semester_id !== assignment.subject_groups[0].semester_id) {
      mismatches.push({
        assignment_id: assignment.id,
        assignment_semester: assignment.semesters?.[0]?.name,
        group_code: assignment.subject_groups[0].group_code,
        group_semester_id: assignment.subject_groups[0].semester_id,
        subject_name: assignment.subject_groups[0].subjects?.[0]?.name,
        subject_code: assignment.subject_groups[0].subjects?.[0]?.code
      })
    }
  }
  
  if (mismatches.length > 0) {
    console.log(`Found ${mismatches.length} assignments with semester mismatches:\n`)
    mismatches.forEach(m => {
      console.log(`- Assignment ${m.assignment_id}:`)
      console.log(`  Subject: ${m.subject_name} (${m.subject_code})`)
      console.log(`  Group: ${m.group_code}`)
      console.log(`  Assignment semester: ${m.assignment_semester}`)
      console.log(`  Group's expected semester: ${m.group_semester_id}`)
      console.log('')
    })
  } else {
    console.log('No cross-semester assignment issues found.')
  }
  
  // Now specifically check for GR3-At assignments
  console.log('\n\nChecking GR3-At assignments specifically:')
  const { data: gr3Assignments, error: gr3Error } = await supabase
    .from('assignments')
    .select(`
      id,
      semester_id,
      semesters!semester_id (
        name
      ),
      subject_groups!subject_group_id (
        group_code,
        subjects (
          name
        )
      ),
      time_slots (
        day_of_week,
        start_time,
        end_time
      )
    `)
    .eq('subject_groups.group_code', 'GR3-At')
    
  if (gr3Error) {
    console.error('Error fetching GR3-At assignments:', gr3Error)
    return
  }
  
  console.log(`\nFound ${gr3Assignments?.length || 0} assignments for GR3-At:`)
  gr3Assignments?.forEach(a => {
    console.log(`- ${a.subject_groups?.[0]?.subjects?.[0]?.name}`)
    console.log(`  Semester: ${a.semesters?.[0]?.name}`)
    console.log(`  Time: ${a.time_slots?.[0]?.day_of_week ? ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'][a.time_slots[0].day_of_week] : 'N/A'} ${a.time_slots?.[0]?.start_time || 'N/A'}`)
  })
}

checkCrossSemesterAssignments()