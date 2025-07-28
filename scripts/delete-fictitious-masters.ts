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

async function deleteFictitiousMasters() {
  console.log('Starting deletion of fictitious master and postgraduate assignments...')

  try {
    // First, let's see what we have
    const { data: existingSchedules, error: fetchError } = await supabase
      .from('master_schedules')
      .select(`
        id,
        subject_name,
        day_of_week,
        start_time,
        end_time,
        programs!inner(code, name, type),
        classrooms!inner(name),
        teachers(first_name, last_name)
      `)
      .in('programs.type', ['master', 'postgrau'])

    if (fetchError) {
      console.error('Error fetching schedules:', fetchError)
      return
    }

    console.log(`Found ${existingSchedules?.length || 0} master/postgrau schedules to delete`)
    
    if (existingSchedules && existingSchedules.length > 0) {
      console.log('\nSchedules to be deleted:')
      existingSchedules.forEach(schedule => {
        console.log(`- ${(schedule.programs as any).code} - ${schedule.subject_name} - ${(schedule.classrooms as any).name}`)
      })
    }

    // Get program IDs for masters and postgraus
    const { data: masterPrograms } = await supabase
      .from('programs')
      .select('id')
      .in('type', ['master', 'postgrau'])

    const masterProgramIds = masterPrograms?.map(p => p.id) || []

    // Delete master_schedules for masters and postgraus
    if (masterProgramIds.length > 0) {
      const { data: deletedData, error: deleteSchedulesError } = await supabase
        .from('master_schedules')
        .delete()
        .in('program_id', masterProgramIds)
        .select()

      if (deleteSchedulesError) {
        console.error('Error deleting master schedules:', deleteSchedulesError)
      } else {
        console.log(`\n✓ Deleted ${deletedData?.length || 0} master schedule entries`)
      }
    }

    // Get subject IDs for masters/postgraus
    const { data: masterSubjects } = await supabase
      .from('subjects')
      .select('id')
      .in('program_level', ['master', 'postgrau'])

    const masterSubjectIds = masterSubjects?.map(s => s.id) || []

    if (masterSubjectIds.length > 0) {
      // Delete subject groups
      const { error: deleteGroupsError, count: groupsDeleted } = await supabase
        .from('subject_groups')
        .delete()
        .in('subject_id', masterSubjectIds)

      if (deleteGroupsError) {
        console.error('Error deleting subject groups:', deleteGroupsError)
      } else {
        console.log(`✓ Deleted ${groupsDeleted || 0} subject groups`)
      }

      // Delete classroom assignments
      const { data: subjectGroups } = await supabase
        .from('subject_groups')
        .select('id')
        .in('subject_id', masterSubjectIds)

      const subjectGroupIds = subjectGroups?.map(sg => sg.id) || []

      if (subjectGroupIds.length > 0) {
        const { error: deleteAssignmentsError, count: assignmentsDeleted } = await supabase
          .from('classroom_assignments')
          .delete()
          .in('subject_group_id', subjectGroupIds)

        if (deleteAssignmentsError) {
          console.error('Error deleting classroom assignments:', deleteAssignmentsError)
        } else {
          console.log(`✓ Deleted ${assignmentsDeleted || 0} classroom assignments`)
        }

        // Delete profile classroom assignments
        const { data: profiles } = await supabase
          .from('subject_group_profiles')
          .select('id')
          .in('subject_group_id', subjectGroupIds)

        const profileIds = profiles?.map(p => p.id) || []

        if (profileIds.length > 0) {
          const { error: deleteProfileAssignmentsError, count: profileAssignmentsDeleted } = await supabase
            .from('profile_classroom_assignments')
            .delete()
            .in('profile_id', profileIds)

          if (deleteProfileAssignmentsError) {
            console.error('Error deleting profile assignments:', deleteProfileAssignmentsError)
          } else {
            console.log(`✓ Deleted ${profileAssignmentsDeleted || 0} profile classroom assignments`)
          }
        }

        // Delete subject group profiles
        const { error: deleteProfilesError, count: profilesDeleted } = await supabase
          .from('subject_group_profiles')
          .delete()
          .in('subject_group_id', subjectGroupIds)

        if (deleteProfilesError) {
          console.error('Error deleting profiles:', deleteProfilesError)
        } else {
          console.log(`✓ Deleted ${profilesDeleted || 0} subject group profiles`)
        }
      }
    }

    console.log('\n✅ Deletion of fictitious master and postgraduate assignments completed!')
    
  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

deleteFictitiousMasters()