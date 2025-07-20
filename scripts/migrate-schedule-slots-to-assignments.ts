import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function migrateToAssignments() {
  console.log('🚀 Migrant schedule_slots a assignments...')
  
  try {
    // Get all schedule slots with their relationships
    const { data: scheduleSlots, error: slotsError } = await supabase
      .from('schedule_slots')
      .select(`
        *,
        student_groups (*),
        subjects (*),
        schedule_slot_teachers (teacher_id),
        schedule_slot_classrooms (classroom_id)
      `)
    
    if (slotsError) {
      console.error('Error fetching schedule slots:', slotsError)
      return
    }
    
    console.log(`📊 Trobats ${scheduleSlots?.length || 0} schedule slots`)
    
    // Get current academic year and semesters
    const { data: academicYear } = await supabase
      .from('academic_years')
      .select('id')
      .eq('is_current', true)
      .single()
    
    if (!academicYear) {
      // Create academic year if not exists
      const { data: newYear } = await supabase
        .from('academic_years')
        .insert({
          name: '2025-2026',
          start_date: '2025-09-01',
          end_date: '2026-07-31',
          is_current: true
        })
        .select()
        .single()
      
      if (newYear) {
        // Create semesters
        await supabase.from('semesters').insert([
          {
            academic_year_id: newYear.id,
            name: 'Primer Semestre',
            number: 1,
            start_date: '2025-09-01',
            end_date: '2026-01-31'
          },
          {
            academic_year_id: newYear.id,
            name: 'Segon Semestre',
            number: 2,
            start_date: '2026-02-01',
            end_date: '2026-07-31'
          }
        ])
      }
    }
    
    // Get semesters
    const { data: semesters } = await supabase
      .from('semesters')
      .select('*')
      .order('number')
    
    if (!semesters || semesters.length === 0) {
      console.error('No semesters found')
      return
    }
    
    // Get time slots
    const { data: timeSlots } = await supabase
      .from('time_slots')
      .select('*')
    
    const timeSlotMap = new Map()
    timeSlots?.forEach(slot => {
      const key = `${slot.day_of_week}-${slot.start_time}-${slot.end_time}`
      timeSlotMap.set(key, slot.id)
    })
    
    // Create subject groups if needed
    const subjectGroupMap = new Map()
    
    let migrated = 0
    let errors = 0
    
    for (const slot of scheduleSlots || []) {
      try {
        // Get or create subject group
        let subjectGroupKey = `${slot.subject_id}-${slot.semester}-${slot.student_groups?.name}`
        let subjectGroupId = subjectGroupMap.get(subjectGroupKey)
        
        if (!subjectGroupId) {
          const { data: existingGroup } = await supabase
            .from('subject_groups')
            .select('id')
            .eq('subject_id', slot.subject_id)
            .eq('semester_id', semesters[slot.semester - 1].id)
            .eq('group_code', slot.student_groups?.name || 'General')
            .single()
          
          if (existingGroup) {
            subjectGroupId = existingGroup.id
          } else {
            const { data: newGroup } = await supabase
              .from('subject_groups')
              .insert({
                subject_id: slot.subject_id,
                semester_id: semesters[slot.semester - 1].id,
                group_type: 'teoria',
                group_code: slot.student_groups?.name || 'General',
                max_students: 30
              })
              .select()
              .single()
            
            if (newGroup) {
              subjectGroupId = newGroup.id
            }
          }
          
          if (subjectGroupId) {
            subjectGroupMap.set(subjectGroupKey, subjectGroupId)
          }
        }
        
        // Get time slot id
        const timeSlotKey = `${slot.day_of_week}-${slot.start_time}-${slot.end_time}`
        const timeSlotId = timeSlotMap.get(timeSlotKey)
        
        // Get teacher and classroom
        const teacherId = slot.schedule_slot_teachers?.[0]?.teacher_id
        const classroomId = slot.schedule_slot_classrooms?.[0]?.classroom_id
        
        if (subjectGroupId && timeSlotId) {
          // Check if assignment already exists
          const { data: existing } = await supabase
            .from('assignments')
            .select('id')
            .eq('semester_id', semesters[slot.semester - 1].id)
            .eq('subject_id', slot.subject_id)
            .eq('student_group_id', slot.student_group_id)
            .eq('time_slot_id', timeSlotId)
            .single()
          
          if (!existing) {
            // Create assignment
            const { error: assignmentError } = await supabase
              .from('assignments')
              .insert({
                semester_id: semesters[slot.semester - 1].id,
                subject_id: slot.subject_id,
                subject_group_id: subjectGroupId,
                teacher_id: teacherId,
                classroom_id: classroomId,
                time_slot_id: timeSlotId,
                student_group_id: slot.student_group_id,
                hours_per_week: 4,
                color: '#3B82F6'
              })
            
            if (assignmentError) {
              console.error(`Error creating assignment for ${slot.subjects?.name}:`, assignmentError.message)
              errors++
            } else {
              migrated++
              if (migrated % 10 === 0) {
                console.log(`   ✅ Migrats ${migrated} horaris...`)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error processing slot:', error)
        errors++
      }
    }
    
    console.log('\n✅ Migració completada!')
    console.log(`   📊 Total migrats: ${migrated}`)
    console.log(`   ❌ Total errors: ${errors}`)
    
  } catch (error) {
    console.error('Error during migration:', error)
  }
}

// Execute migration
migrateToAssignments().catch(console.error)