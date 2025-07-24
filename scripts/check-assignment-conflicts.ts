import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkAssignmentConflicts() {
  console.log('🔍 Checking assignment conflicts for P.1.12...\n')

  // First, let's find the classroom ID for P.1.12
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('*')
    .eq('name', 'P.1.12')
    .single()

  console.log('Classroom P.1.12:', classroom?.id)

  // Get all assignments for P.1.12
  const { data: assignments } = await supabase
    .from('assignments')
    .select(`
      *,
      subject_groups (
        *,
        subjects (
          code,
          name,
          semester
        ),
        semesters (
          name,
          start_date,
          end_date
        )
      ),
      time_slots (
        day_of_week,
        start_time,
        end_time
      ),
      assignment_classrooms!inner (
        classroom_id,
        classrooms (
          name,
          building
        )
      )
    `)
    .eq('assignment_classrooms.classroom_id', classroom?.id)

  console.log(`\nFound ${assignments?.length} assignments for P.1.12:\n`)

  assignments?.forEach(assignment => {
    const subject = assignment.subject_groups?.subjects
    const semester = assignment.subject_groups?.semesters
    const timeSlot = assignment.time_slots
    
    console.log(`Assignment ID: ${assignment.id}`)
    console.log(`Subject: ${subject?.name} (${subject?.code})`)
    console.log(`Subject semester: ${subject?.semester}`)
    console.log(`Assigned to semester: ${semester?.name}`)
    console.log(`Time: ${getDayName(timeSlot?.day_of_week)} ${timeSlot?.start_time} - ${timeSlot?.end_time}`)
    console.log(`Group: ${assignment.subject_groups?.group_code}`)
    console.log('---')
  })

  // Check specifically for Tècniques Infogràfiques I
  console.log('\n🔍 Checking Tècniques Infogràfiques I assignments:')
  
  const { data: tecniquesI } = await supabase
    .from('subjects')
    .select(`
      *,
      subject_groups (
        *,
        semesters (
          name
        )
      )
    `)
    .eq('name', 'Tècniques Infogràfiques I')
    .single()

  console.log(`\nTècniques Infogràfiques I:`)
  console.log(`- Code: ${tecniquesI?.code}`)
  console.log(`- Semester: ${tecniquesI?.semester}`)
  console.log(`- Groups:`)
  tecniquesI?.subject_groups?.forEach((group: any) => {
    console.log(`  - ${group.group_code}: ${group.semesters?.name}`)
  })

  // Check Tècniques Infogràfiques II
  console.log('\n🔍 Checking Tècniques Infogràfiques II:')
  
  const { data: tecniquesII } = await supabase
    .from('subjects')
    .select(`
      *,
      subject_groups (
        *,
        semesters (
          name
        )
      )
    `)
    .eq('name', 'Tècniques Infogràfiques II')
    .single()

  console.log(`\nTècniques Infogràfiques II:`)
  console.log(`- Code: ${tecniquesII?.code}`)
  console.log(`- Semester: ${tecniquesII?.semester}`)
  console.log(`- Groups:`)
  tecniquesII?.subject_groups?.forEach((group: any) => {
    console.log(`  - ${group.group_code}: ${group.semesters?.name}`)
  })
}

function getDayName(day: number): string {
  const days = ['', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']
  return days[day] || `Day ${day}`
}

checkAssignmentConflicts()