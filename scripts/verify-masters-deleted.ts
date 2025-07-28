import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function verifyMastersDeleted() {
  console.log('Verifying deletion of master and postgraduate assignments...\n')

  // Check master_schedules
  const { data: masterSchedules, error: schedulesError } = await supabase
    .from('master_schedules')
    .select(`
      id,
      subject_name,
      programs!inner(code, name, type)
    `)
    .in('programs.type', ['master', 'postgrau'])

  if (schedulesError) {
    console.error('Error checking schedules:', schedulesError)
  } else {
    console.log(`Master schedules for masters/postgraus: ${masterSchedules?.length || 0}`)
    if (masterSchedules && masterSchedules.length > 0) {
      masterSchedules.forEach(s => console.log(`  - ${(s.programs as any).code}: ${s.subject_name}`))
    }
  }

  // Check subject groups
  const { data: subjectGroups, error: groupsError } = await supabase
    .from('subject_groups')
    .select(`
      id,
      group_code,
      subjects!inner(code, name, program_level)
    `)
    .in('subjects.program_level', ['master', 'postgrau'])

  if (groupsError) {
    console.error('Error checking subject groups:', groupsError)
  } else {
    console.log(`\nSubject groups for masters/postgraus: ${subjectGroups?.length || 0}`)
    if (subjectGroups && subjectGroups.length > 0) {
      subjectGroups.forEach(sg => console.log(`  - ${(sg.subjects as any).code}: ${sg.group_code}`))
    }
  }

  // Check classroom assignments
  const { data: classroomAssignments, error: assignmentsError } = await supabase
    .from('classroom_assignments')
    .select(`
      id,
      subject_groups!inner(
        group_code,
        subjects!inner(code, name, program_level)
      )
    `)
    .in('subject_groups.subjects.program_level', ['master', 'postgrau'])

  if (assignmentsError) {
    console.error('Error checking classroom assignments:', assignmentsError)
  } else {
    console.log(`\nClassroom assignments for masters/postgraus: ${classroomAssignments?.length || 0}`)
  }

  // Check if master/postgrau programs still exist
  const { data: programs, error: programsError } = await supabase
    .from('programs')
    .select('code, name, type')
    .in('type', ['master', 'postgrau'])

  if (programsError) {
    console.error('Error checking programs:', programsError)
  } else {
    console.log(`\nMaster/postgrau programs in database: ${programs?.length || 0}`)
    if (programs && programs.length > 0) {
      programs.forEach(p => console.log(`  - ${p.code}: ${p.name} (${p.type})`))
    }
  }

  // Check if master/postgrau subjects still exist
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('code, name, program_level')
    .in('program_level', ['master', 'postgrau'])

  if (subjectsError) {
    console.error('Error checking subjects:', subjectsError)
  } else {
    console.log(`\nMaster/postgrau subjects in database: ${subjects?.length || 0}`)
    if (subjects && subjects.length > 0) {
      console.log('  (First 5 subjects):')
      subjects.slice(0, 5).forEach(s => console.log(`  - ${s.code}: ${s.name}`))
      if (subjects.length > 5) {
        console.log(`  ... and ${subjects.length - 5} more`)
      }
    }
  }
}

verifyMastersDeleted()