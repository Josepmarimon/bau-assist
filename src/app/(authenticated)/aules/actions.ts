'use server'

import { createClient } from '@/lib/supabase/server'

export async function getClassroomOccupancyData(classroomId: string) {
  const supabase = await createClient()

  // Get schedule slots for this classroom with all related data (OLD SYSTEM)
  const { data: scheduleSlots, error: scheduleSlotsError } = await supabase
    .from('schedule_slot_classrooms')
    .select(`
      schedule_slot_id,
      schedule_slots!inner (
        id,
        day_of_week,
        start_time,
        end_time,
        semester,
        subjects (name),
        student_groups (name),
        schedule_slot_teachers (
          teachers (first_name, last_name)
        )
      )
    `)
    .eq('classroom_id', classroomId)

  if (scheduleSlotsError) {
    console.error('Error fetching schedule slots:', scheduleSlotsError)
  }
  
  // Get assignments for this classroom (NEW SYSTEM)
  const { data: assignmentData, error: assignmentsError } = await supabase
    .from('assignment_classrooms')
    .select(`
      id,
      is_full_semester,
      week_range_type,
      assignment_classroom_weeks (
        week_number
      ),
      assignments (
        id,
        semester_id,
        time_slot_id,
        time_slots (
          day_of_week,
          start_time,
          end_time
        ),
        subject_groups (
          group_code,
          subjects (
            name
          )
        ),
        student_groups (
          name
        ),
        teachers (
          first_name,
          last_name
        )
      )
    `)
    .eq('classroom_id', classroomId)
    
  if (assignmentsError) {
    console.error('Error fetching assignments:', assignmentsError)
  }
  

  // Get current academic year
  const { data: currentAcademicYear } = await supabase
    .from('academic_years')
    .select('id, name')
    .eq('is_current', true)
    .single()
  
  // Get semesters for current academic year only
  const { data: semesters } = await supabase
    .from('semesters')
    .select('id, name, number')
    .eq('academic_year_id', currentAcademicYear?.id)
    .order('number')
  
  const occupancyData = []

  for (const semester of semesters || []) {
    // Filter OLD SYSTEM slots by semester
    const semesterSlots = scheduleSlots?.filter(slot => 
      slot.schedule_slots && 'semester' in slot.schedule_slots && slot.schedule_slots.semester === semester.number
    ) || []
    
    // Filter NEW SYSTEM assignments by semester
    const semesterAssignments = assignmentData?.filter(assignment => {
      // assignments is a single object, not an array
      return assignment.assignments && 'semester_id' in assignment.assignments && assignment.assignments.semester_id === semester.id
    }) || []

    // Generate all hourly time slots
    const timeSlots = generateHourlyTimeSlots()
    
    // Process schedule slots to find assignments
    const scheduleAssignments: any[] = []
    
    // Process OLD SYSTEM slots
    semesterSlots.forEach(slot => {
      const scheduleSlot = slot.schedule_slots
      
      const teachers: any[] = scheduleSlot && 'schedule_slot_teachers' in scheduleSlot ? (scheduleSlot.schedule_slot_teachers as any[]) : []
      let teacherName = 'No assignat'
      if (teachers.length > 0 && teachers[0].teachers) {
        const teacher = teachers[0].teachers
        teacherName = `${teacher.first_name} ${teacher.last_name}`
      }
      
      scheduleAssignments.push({
        day_of_week: scheduleSlot && 'day_of_week' in scheduleSlot ? scheduleSlot.day_of_week : 0,
        start_time: scheduleSlot && 'start_time' in scheduleSlot ? scheduleSlot.start_time : '',
        end_time: scheduleSlot && 'end_time' in scheduleSlot ? scheduleSlot.end_time : '',
        assignment: {
          subjectName: scheduleSlot && typeof scheduleSlot === 'object' && 'subjects' in scheduleSlot && scheduleSlot.subjects && typeof scheduleSlot.subjects === 'object' && 'name' in scheduleSlot.subjects ? scheduleSlot.subjects.name : 'Unknown',
          teacherName: teacherName,
          groupCode: scheduleSlot && typeof scheduleSlot === 'object' && 'student_groups' in scheduleSlot && scheduleSlot.student_groups && typeof scheduleSlot.student_groups === 'object' && 'name' in scheduleSlot.student_groups ? scheduleSlot.student_groups.name : ''
        },
        weeks: Array.from({length: 15}, (_, i) => i + 1) // Old system: always all weeks
      })
    })
    
    // Process NEW SYSTEM assignments
    semesterAssignments.forEach(assignmentClassroom => {
      const assignment = assignmentClassroom.assignments
      
      if (!assignment || !('time_slots' in assignment) || !assignment.time_slots) {
        return
      }
      
      let teacherName = 'No assignat'
      if (assignment && 'teachers' in assignment && assignment.teachers && typeof assignment.teachers === 'object' && 'first_name' in assignment.teachers && 'last_name' in assignment.teachers) {
        teacherName = `${assignment.teachers.first_name} ${assignment.teachers.last_name}`
      }
      
      // Determine which weeks this assignment is active
      let weeks: number[] = []
      if (assignmentClassroom.is_full_semester) {
        weeks = Array.from({length: 15}, (_, i) => i + 1)
      } else {
        weeks = assignmentClassroom.assignment_classroom_weeks?.map(w => w.week_number) || []
      }
      
      scheduleAssignments.push({
        day_of_week: assignment.time_slots && typeof assignment.time_slots === 'object' && 'day_of_week' in assignment.time_slots ? assignment.time_slots.day_of_week : 0,
        start_time: assignment.time_slots && typeof assignment.time_slots === 'object' && 'start_time' in assignment.time_slots ? assignment.time_slots.start_time : '',
        end_time: assignment.time_slots && typeof assignment.time_slots === 'object' && 'end_time' in assignment.time_slots ? assignment.time_slots.end_time : '',
        assignment: {
          subjectName: assignment && 'subject_groups' in assignment && assignment.subject_groups && typeof assignment.subject_groups === 'object' && 'subjects' in assignment.subject_groups && assignment.subject_groups.subjects && typeof assignment.subject_groups.subjects === 'object' && 'name' in assignment.subject_groups.subjects ? assignment.subject_groups.subjects.name : 'Unknown',
          teacherName: teacherName,
          groupCode: (assignment && 'subject_groups' in assignment && assignment.subject_groups && typeof assignment.subject_groups === 'object' && 'group_code' in assignment.subject_groups ? assignment.subject_groups.group_code : '') || 
                     (assignment && 'student_groups' in assignment && assignment.student_groups && typeof assignment.student_groups === 'object' && 'name' in assignment.student_groups ? assignment.student_groups.name : '') || ''
        },
        weeks: weeks
      })
    })

    // Calculate occupancy for each hourly time slot
    const timeSlotOccupancy = timeSlots.map(hourlySlot => {
      // Find if any schedule assignment occupies this hourly slot
      const assignment = scheduleAssignments.find(schedule => 
        isHourlySlotOccupied(schedule, hourlySlot)
      )
      
      return {
        timeSlotId: `${hourlySlot.dayOfWeek}-${hourlySlot.startTime}-${hourlySlot.endTime}`,
        dayOfWeek: hourlySlot.dayOfWeek,
        startTime: hourlySlot.startTime,
        endTime: hourlySlot.endTime,
        isOccupied: !!assignment,
        assignment: assignment?.assignment
      }
    })

    // Calculate occupancy percentages
    const morningSlots = timeSlotOccupancy.filter(slot => slot.startTime < '14:00:00')
    const afternoonSlots = timeSlotOccupancy.filter(slot => slot.startTime >= '14:00:00')
    
    const morningOccupied = morningSlots.filter(slot => slot.isOccupied).length
    const afternoonOccupied = afternoonSlots.filter(slot => slot.isOccupied).length
    const totalOccupied = timeSlotOccupancy.filter(slot => slot.isOccupied).length
    
    const morningOccupancy = morningSlots.length > 0 
      ? Math.round((morningOccupied / morningSlots.length) * 100)
      : 0
    
    const afternoonOccupancy = afternoonSlots.length > 0
      ? Math.round((afternoonOccupied / afternoonSlots.length) * 100)
      : 0
    
    const totalOccupancy = timeSlotOccupancy.length > 0
      ? Math.round((totalOccupied / timeSlotOccupancy.length) * 100)
      : 0

    occupancyData.push({
      semesterId: semester.id,
      semesterName: semester.name,
      classroomOccupancy: {
        classroomId,
        morningOccupancy,
        afternoonOccupancy,
        totalOccupancy,
        timeSlots: timeSlotOccupancy
      }
    })
  }

  return occupancyData
}

export async function getAllClassroomsOccupancyData() {
  const supabase = await createClient()
  
  const { data: classrooms, error } = await supabase
    .from('classrooms')
    .select('id, code, name')
    .order('code', { ascending: true })
  
  if (error || !classrooms) {
    console.error('Error fetching classrooms:', error)
    return []
  }
  
  const occupancyPromises = classrooms.map(async classroom => {
    const data = await getClassroomOccupancyData(classroom.id)
    return {
      classroomId: classroom.id,
      classroomCode: classroom.code,
      classroomName: classroom.name,
      semesters: data || []
    }
  })
  
  return Promise.all(occupancyPromises)
}

// Helper function to generate hourly time slots
function generateHourlyTimeSlots() {
  const slots = []
  const days = [1, 2, 3, 4, 5] // Monday to Friday
  
  // Generate hourly slots from 8:00 to 21:00
  for (const day of days) {
    for (let hour = 8; hour <= 20; hour++) {
      const startTime = `${hour.toString().padStart(2, '0')}:00:00`
      const endTime = `${(hour + 1).toString().padStart(2, '0')}:00:00`
      
      slots.push({
        dayOfWeek: day,
        startTime: startTime,
        endTime: endTime
      })
    }
  }
  
  return slots
}

// Check if a schedule slot occupies a specific hourly slot
function isHourlySlotOccupied(scheduleSlot: any, hourlySlot: any): boolean {
  // Convert times to comparable format (minutes since midnight)
  const toMinutes = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    return hours * 60 + minutes
  }
  
  const scheduleStart = toMinutes(scheduleSlot.start_time)
  const scheduleEnd = toMinutes(scheduleSlot.end_time)
  const hourlyStart = toMinutes(hourlySlot.startTime)
  const hourlyEnd = toMinutes(hourlySlot.endTime)
  
  // Check if the hourly slot overlaps with the schedule slot
  return scheduleSlot.day_of_week === hourlySlot.dayOfWeek &&
         hourlyStart >= scheduleStart && 
         hourlyEnd <= scheduleEnd
}