import { createClient } from '@/lib/supabase/client'

interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export async function validateClassroomAssignment(
  subjectId: string,
  studentGroupId: string,
  classroomId: string,
  timeSlotId?: string,
  weekNumbers?: number[],
  semesterId?: string
): Promise<ValidationResult> {
  const supabase = createClient()
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // 1. Check if this student group belongs to any subject group profile
    const { data: profileMembers } = await supabase
      .from('subject_group_profile_members')
      .select('profile_id')
      .eq('student_group_id', studentGroupId)

    let relevantProfiles: any[] = []
    
    if (profileMembers && profileMembers.length > 0) {
      // Get the profiles that belong to this subject
      const profileIds = profileMembers.map(pm => pm.profile_id)
      const { data: profiles } = await supabase
        .from('subject_group_profiles')
        .select('*')
        .in('id', profileIds)
        .eq('subject_id', subjectId)
      
      relevantProfiles = profiles || []
    }

    if (relevantProfiles.length === 0) {
      // No profile found, check general subject software requirements
      const { data: subjectSoftware } = await supabase
        .from('subject_software')
        .select('software_id, is_required')
        .eq('subject_id', subjectId)

      if (subjectSoftware && subjectSoftware.length > 0) {
        // Check if classroom has all required software
        const { data: classroomSoftware } = await supabase
          .from('software_classrooms')
          .select('software_id')
          .eq('classroom_id', classroomId)

        const classroomSoftwareIds = new Set(classroomSoftware?.map(cs => cs.software_id) || [])
        const missingSoftware = subjectSoftware
          .filter(ss => ss.is_required && !classroomSoftwareIds.has(ss.software_id))

        if (missingSoftware.length > 0) {
          errors.push(`L'aula no té el software obligatori per a aquesta assignatura`)
        }
      }
    } else {
      // Check software requirements from group profiles
      for (const groupProfile of relevantProfiles) {
        const { data: profileSoftware } = await supabase
          .from('subject_group_profile_software')
          .select(`
            software_id,
            is_required,
            software:software(name)
          `)
          .eq('profile_id', groupProfile.id)

        if (profileSoftware && profileSoftware.length > 0) {
          // Check if classroom has all required software for this profile
          const { data: classroomSoftware } = await supabase
            .from('software_classrooms')
            .select('software_id')
            .eq('classroom_id', classroomId)

          const classroomSoftwareIds = new Set(classroomSoftware?.map(cs => cs.software_id) || [])
          const missingSoftware = profileSoftware
            .filter(ps => ps.is_required && !classroomSoftwareIds.has(ps.software_id))

          if (missingSoftware.length > 0) {
            const softwareNames = missingSoftware
              .map(ms => ms.software?.name || 'Software desconegut')
              .join(', ')
            errors.push(
              `L'aula no té el software obligatori per al perfil "${groupProfile.name}": ${softwareNames}`
            )
          }

          // Check for optional software that's missing
          const missingOptional = profileSoftware
            .filter(ps => !ps.is_required && !classroomSoftwareIds.has(ps.software_id))

          if (missingOptional.length > 0) {
            const softwareNames = missingOptional
              .map(ms => ms.software?.name || 'Software desconegut')
              .join(', ')
            warnings.push(
              `L'aula no té el software recomanat per al perfil "${groupProfile.name}": ${softwareNames}`
            )
          }
        }
      }
    }

    // 2. Check classroom capacity vs group size
    const { data: studentGroup } = await supabase
      .from('student_groups')
      .select('max_students')
      .eq('id', studentGroupId)
      .single()

    const { data: classroom } = await supabase
      .from('classrooms')
      .select('capacity')
      .eq('id', classroomId)
      .single()

    if (studentGroup && classroom) {
      if (classroom.capacity < studentGroup.max_students) {
        warnings.push(
          `La capacitat de l'aula (${classroom.capacity}) és inferior al màxim d'estudiants del grup (${studentGroup.max_students})`
        )
      }
    }

    // 3. Check for time slot conflicts if provided
    if (timeSlotId && weekNumbers && weekNumbers.length > 0) {
      const { data: conflicts } = await supabase
        .rpc('check_classroom_week_conflicts', {
          p_classroom_id: classroomId,
          p_time_slot_id: timeSlotId,
          p_week_numbers: weekNumbers,
          p_exclude_assignment_id: null,
          p_semester_id: semesterId || null
        })
      
      if (conflicts && conflicts.length > 0) {
        const conflict = conflicts[0]
        errors.push(
          `L'aula ja està assignada a ${conflict.subject_name} (${conflict.group_code}) les setmanes: ${conflict.conflicting_weeks.join(', ')}`
        )
      }
    }

  } catch (error) {
    console.error('Error validating classroom assignment:', error)
    errors.push('Error al validar l\'assignació de l\'aula')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}