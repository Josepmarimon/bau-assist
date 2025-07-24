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
      .eq('subject_group_id', studentGroupId)

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
            software!inner(name)
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
              .map(ms => (ms.software && typeof ms.software === 'object' && 'name' in ms.software ? ms.software.name : null) || 'Software desconegut')
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
              .map(ms => (ms.software && typeof ms.software === 'object' && 'name' in ms.software ? ms.software.name : null) || 'Software desconegut')
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

export async function validateProfileClassroomAssignment(
  profileId: string,
  classroomId: string,
  timeSlotId?: string,
  weekNumbers?: number[],
  semesterId?: string
): Promise<ValidationResult> {
  const supabase = createClient()
  const errors: string[] = []
  const warnings: string[] = []

  try {
    // 1. Get profile with its requirements
    const { data: profile } = await supabase
      .from('subject_group_profiles')
      .select(`
        id,
        name,
        subject_group_profile_software (
          software_id,
          is_required,
          software!inner(name)
        ),
        subject_group_profile_equipment (
          equipment_type_id,
          quantity,
          equipment_types!inner(name)
        ),
        subject_group_profile_members (
          subject_groups (
            id,
            group_code,
            max_students
          )
        )
      `)
      .eq('id', profileId)
      .single()

    if (!profile) {
      errors.push('No s\'ha pogut obtenir la informació del perfil')
      return { isValid: false, errors, warnings }
    }

    // 2. Check software requirements
    if (profile.subject_group_profile_software && profile.subject_group_profile_software.length > 0) {
      const { data: classroomSoftware } = await supabase
        .from('software_classrooms')
        .select('software_id')
        .eq('classroom_id', classroomId)

      const classroomSoftwareIds = new Set(classroomSoftware?.map(cs => cs.software_id) || [])
      
      // Check required software
      const missingSoftware = profile.subject_group_profile_software
        .filter(ps => ps.is_required && !classroomSoftwareIds.has(ps.software_id))

      if (missingSoftware.length > 0) {
        const softwareNames = missingSoftware
          .map(ms => {
            const software = ms.software as any
            if (Array.isArray(software)) {
              return software[0]?.name || 'Software desconegut'
            }
            return software?.name || 'Software desconegut'
          })
          .join(', ')
        errors.push(
          `L'aula no té el software obligatori per al perfil "${profile.name}": ${softwareNames}`
        )
      }

      // Check optional software
      const missingOptional = profile.subject_group_profile_software
        .filter(ps => !ps.is_required && !classroomSoftwareIds.has(ps.software_id))

      if (missingOptional.length > 0) {
        const softwareNames = missingOptional
          .map(ms => {
            const software = ms.software as any
            if (Array.isArray(software)) {
              return software[0]?.name || 'Software desconegut'
            }
            return software?.name || 'Software desconegut'
          })
          .join(', ')
        warnings.push(
          `L'aula no té el software recomanat per al perfil "${profile.name}": ${softwareNames}`
        )
      }
    }

    // 3. Check equipment requirements
    if (profile.subject_group_profile_equipment && profile.subject_group_profile_equipment.length > 0) {
      const { data: classroomEquipment } = await supabase
        .from('classroom_equipment')
        .select('equipment_type_id, quantity')
        .eq('classroom_id', classroomId)

      const classroomEquipmentMap = new Map(
        classroomEquipment?.map(ce => [ce.equipment_type_id, ce.quantity]) || []
      )

      const missingEquipment = profile.subject_group_profile_equipment
        .filter(pe => {
          const classroomQuantity = classroomEquipmentMap.get(pe.equipment_type_id) || 0
          return classroomQuantity < pe.quantity
        })

      if (missingEquipment.length > 0) {
        const equipmentDetails = missingEquipment
          .map(me => {
            const classroomQuantity = classroomEquipmentMap.get(me.equipment_type_id) || 0
            const equipmentTypes = me.equipment_types as any
            let typeName = 'Equipament desconegut'
            if (Array.isArray(equipmentTypes)) {
              typeName = equipmentTypes[0]?.name || 'Equipament desconegut'
            } else if (equipmentTypes) {
              typeName = equipmentTypes.name || 'Equipament desconegut'
            }
            return `${typeName} (necessari: ${me.quantity}, disponible: ${classroomQuantity})`
          })
          .join(', ')
        errors.push(
          `L'aula no té prou equipament per al perfil "${profile.name}": ${equipmentDetails}`
        )
      }
    }

    // 4. Check classroom capacity vs largest group in profile
    const { data: classroom } = await supabase
      .from('classrooms')
      .select('capacity')
      .eq('id', classroomId)
      .single()

    if (classroom && profile.subject_group_profile_members) {
      const maxCapacity = Math.max(
        ...profile.subject_group_profile_members
          .map(m => {
            const subjectGroups = m.subject_groups as any
            if (subjectGroups) {
              return subjectGroups.max_students || 0
            }
            return 0
          })
      )

      if (maxCapacity > 0 && classroom.capacity < maxCapacity) {
        warnings.push(
          `La capacitat de l'aula (${classroom.capacity}) és inferior al grup més gran del perfil (${maxCapacity} estudiants)`
        )
      }
    }

    // 5. Check for time slot conflicts if provided
    if (timeSlotId && weekNumbers && weekNumbers.length > 0) {
      // Check regular assignment conflicts
      const { data: regularConflicts } = await supabase
        .rpc('check_classroom_week_conflicts', {
          p_classroom_id: classroomId,
          p_time_slot_id: timeSlotId,
          p_week_numbers: weekNumbers,
          p_exclude_assignment_id: null,
          p_semester_id: semesterId || null
        })
      
      if (regularConflicts && regularConflicts.length > 0) {
        const conflict = regularConflicts[0]
        errors.push(
          `L'aula ja està assignada a ${conflict.subject_name} (${conflict.group_code}) les setmanes: ${conflict.conflicting_weeks.join(', ')}`
        )
      }

      // Check profile assignment conflicts
      const { data: profileConflicts } = await supabase
        .rpc('check_profile_classroom_conflicts', {
          p_classroom_id: classroomId,
          p_time_slot_id: timeSlotId,
          p_week_numbers: weekNumbers,
          p_semester_id: semesterId || null,
          p_exclude_profile_assignment_id: null
        })
      
      if (profileConflicts && profileConflicts.length > 0) {
        const conflict = profileConflicts[0]
        errors.push(
          `L'aula ja està assignada al perfil ${conflict.profile_name} les setmanes: ${conflict.conflicting_weeks.join(', ')}`
        )
      }

      // Check if any group in the profile has teacher conflicts
      if (profile.subject_group_profile_members) {
        for (const member of profile.subject_group_profile_members) {
          const subjectGroups = member.subject_groups as any
          const subjectGroup = Array.isArray(subjectGroups) ? subjectGroups[0] : subjectGroups
          
          if (subjectGroup?.id) {
            const { data: teacherConflicts } = await supabase
              .rpc('check_subject_group_teacher_conflicts', {
                p_subject_group_id: subjectGroup.id,
                p_time_slot_id: timeSlotId,
                p_semester_id: semesterId || null,
                p_exclude_assignment_id: null
              })
            
            if (teacherConflicts && teacherConflicts.length > 0) {
              const conflict = teacherConflicts[0]
              errors.push(
                `El professor ${conflict.teacher_name} del grup ${subjectGroup.group_code} ja té classe de ${conflict.conflicting_subject} (${conflict.conflicting_group}) en aquest horari`
              )
            }
          }
        }
      }
    }

  } catch (error) {
    console.error('Error validating profile classroom assignment:', error)
    errors.push('Error al validar l\'assignació de l\'aula per al perfil')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}