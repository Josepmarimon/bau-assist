import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMyChanges() {
  console.log('🔍 Reviewing what happened with the changes...\n')

  // Check the assignments I supposedly "fixed"
  const assignmentIds = [
    '330574ad-33f7-4403-9640-11a15f2726c3',
    '3ff8abcf-6805-43b0-8428-dfdb0b483ee2',
    '0dbbcec4-4fd2-45d8-ad67-0dec008525cd'
  ]

  console.log('Checking the assignments I modified:')
  
  for (const id of assignmentIds) {
    const { data: assignment } = await supabase
      .from('assignments')
      .select(`
        *,
        semesters (
          name
        ),
        subject_groups (
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
      .eq('id', id)
      .single()

    if (assignment) {
      console.log(`\nAssignment ${id}:`)
      console.log(`- Subject: ${assignment.subject_groups?.subjects?.name}`)
      console.log(`- Subject semester config: ${assignment.subject_groups?.subjects?.semester}`)
      console.log(`- Subject group semester: ${assignment.subject_groups?.semesters?.name}`)
      console.log(`- Assignment semester: ${assignment.semesters?.name}`)
      console.log(`- Match? ${assignment.semester_id === assignment.subject_groups?.semester_id ? '✅' : '❌'}`)
    }
  }

  // Now let's understand: For a 4th year student group (GR4-Gm1)
  // What assignments should they have?
  console.log('\n\n📚 Understanding assignments for GR4-Gm1:')
  
  const { data: assignments } = await supabase
    .from('assignments')
    .select(`
      *,
      semesters (
        name
      ),
      subject_groups (
        group_code,
        subjects (
          name,
          code,
          semester
        )
      ),
      time_slots (
        day_of_week,
        start_time,
        end_time
      )
    `)
    .eq('subject_groups.group_code', 'GR4-Gm1')
    .order('semesters(name)')

  // Group by semester
  const firstSem: any[] = []
  const secondSem: any[] = []
  
  assignments?.forEach(a => {
    if (a.semesters?.name.includes('Primer')) {
      firstSem.push(a)
    } else if (a.semesters?.name.includes('Segon')) {
      secondSem.push(a)
    }
  })

  console.log(`\nFirst semester assignments (${firstSem.length}):`)
  firstSem.forEach(a => {
    console.log(`- ${a.subject_groups?.subjects?.name} (${a.subject_groups?.subjects?.semester})`)
  })

  console.log(`\nSecond semester assignments (${secondSem.length}):`)
  secondSem.forEach(a => {
    console.log(`- ${a.subject_groups?.subjects?.name} (${a.subject_groups?.subjects?.semester})`)
  })
}

checkMyChanges()