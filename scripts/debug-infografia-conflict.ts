import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function debugInfografiaConflict() {
  console.log('🔍 Debugging Infografia I assignment to P.1.4')
  console.log('=========================================\n')

  try {
    // 1. Find Infografia I and II subjects
    const { data: subjects } = await supabase
      .from('subjects')
      .select('*')
      .ilike('name', '%Infografia%')
      .order('name')
    
    console.log('📚 Infografia subjects found:')
    subjects?.forEach(s => {
      console.log(`  - ${s.name} (${s.code}) - ID: ${s.id}`)
    })

    // 2. Find P.1.4 classroom
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('*')
      .eq('code', 'P.1.4')
      .single()
    
    console.log(`\n🏫 Classroom P.1.4: ${classroom?.name} - ID: ${classroom?.id}`)

    // 3. Find semesters
    const { data: semesters } = await supabase
      .from('semesters')
      .select(`
        *,
        academic_years (*)
      `)
      .order('academic_years(name)', { ascending: false })
      .order('number')
    
    console.log('\n📅 Semesters:')
    semesters?.forEach(s => {
      console.log(`  - ${s.academic_years?.name} - ${s.name} (ID: ${s.id})`)
    })

    // 4. Find Wednesday morning time slot
    const { data: timeSlot } = await supabase
      .from('time_slots')
      .select('*')
      .eq('day_of_week', 3) // Wednesday
      .eq('start_time', '09:00:00')
      .eq('end_time', '14:30:00')
      .single()
    
    console.log(`\n⏰ Wednesday morning time slot: ${timeSlot?.id}`)

    if (!classroom || !timeSlot) {
      console.error('❌ Could not find classroom or time slot')
      return
    }

    // 5. Check all assignments for P.1.4 on Wednesday morning
    console.log('\n📋 All assignments for P.1.4 on Wednesday morning:')
    const { data: assignments } = await supabase
      .from('assignments')
      .select(`
        *,
        subject_groups (
          *,
          subjects (*)
        ),
        semesters (*),
        assignment_classrooms (
          *,
          assignment_classroom_weeks (*)
        )
      `)
      .eq('time_slot_id', timeSlot.id)
      .eq('assignment_classrooms.classroom_id', classroom.id)
    
    assignments?.forEach(a => {
      const subject = a.subject_groups?.subjects
      console.log(`\n  Assignment ID: ${a.id}`)
      console.log(`  Subject: ${subject?.name} (${subject?.code})`)
      console.log(`  Group: ${a.subject_groups?.group_code}`)
      console.log(`  Semester: ${a.semesters?.name} (ID: ${a.semester_id})`)
      console.log(`  Assignment Classrooms:`, a.assignment_classrooms)
    })

    // 6. Test the conflict check function for 1st semester
    const firstSemester = semesters?.find(s => s.number === 1)
    if (firstSemester) {
      console.log(`\n🔍 Testing conflict check for 1st semester (${firstSemester.id}):`)
      
      const { data: conflicts, error } = await supabase
        .rpc('check_classroom_week_conflicts', {
          p_classroom_id: classroom.id,
          p_time_slot_id: timeSlot.id,
          p_week_numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
          p_exclude_assignment_id: null,
          p_semester_id: firstSemester.id
        })
      
      if (error) {
        console.error('  Error:', error)
      } else if (conflicts && conflicts.length > 0) {
        console.log('  Conflicts found:')
        conflicts.forEach(c => {
          console.log(`    - ${c.subject_name} (${c.group_code}) - Weeks: ${c.conflicting_weeks.join(', ')}`)
        })
      } else {
        console.log('  ✅ No conflicts found')
      }
    }

    // 7. Test without semester filter
    console.log('\n🔍 Testing conflict check WITHOUT semester filter:')
    const { data: allConflicts, error: allError } = await supabase
      .rpc('check_classroom_week_conflicts', {
        p_classroom_id: classroom.id,
        p_time_slot_id: timeSlot.id,
        p_week_numbers: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15],
        p_exclude_assignment_id: null,
        p_semester_id: null
      })
    
    if (allError) {
      console.error('  Error:', allError)
    } else if (allConflicts && allConflicts.length > 0) {
      console.log('  Conflicts found:')
      allConflicts.forEach(c => {
        console.log(`    - ${c.subject_name} (${c.group_code}) - Weeks: ${c.conflicting_weeks.join(', ')}`)
      })
    } else {
      console.log('  No conflicts found')
    }

    // 8. Check subject groups for Infografia I
    const infografiaI = subjects?.find(s => s.name === 'Infografia I')
    if (infografiaI) {
      console.log(`\n📊 Subject groups for Infografia I:`)
      const { data: subjectGroups } = await supabase
        .from('subject_groups')
        .select(`
          *,
          semesters (*)
        `)
        .eq('subject_id', infografiaI.id)
      
      subjectGroups?.forEach(sg => {
        console.log(`  - ${sg.group_code} - Semester: ${sg.semesters?.name} (ID: ${sg.semester_id})`)
      })
    }

  } catch (error) {
    console.error('Error:', error)
  }
}

debugInfografiaConflict()