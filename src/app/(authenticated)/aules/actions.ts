'use server'

import { createClient } from '@/lib/supabase/server'

export async function getClassroomOccupancyData(classroomId: string) {
  const supabase = await createClient()

  // Get schedule slots for this classroom with all related data
  const { data: scheduleSlots, error } = await supabase
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

  if (error) {
    console.error('Error fetching schedule slots:', error)
    return null
  }

  // Transform data into occupancy format
  const semesters = [
    { id: '1', name: 'Semestre 1', number: 1 },
    { id: '2', name: 'Semestre 2', number: 2 }
  ]

  const occupancyData = []

  for (const semester of semesters) {
    const semesterSlots = scheduleSlots?.filter(slot => 
      slot.schedule_slots.semester === semester.number
    ) || []

    // Generate all hourly time slots
    const timeSlots = generateHourlyTimeSlots()
    
    // Process schedule slots to find assignments
    const scheduleAssignments: any[] = []
    
    semesterSlots.forEach(slot => {
      const scheduleSlot = slot.schedule_slots
      
      const teachers = scheduleSlot.schedule_slot_teachers || []
      let teacherName = 'No assignat'
      if (teachers.length > 0 && teachers[0].teachers) {
        const teacher = teachers[0].teachers
        teacherName = `${teacher.first_name} ${teacher.last_name}`
      }
      
      scheduleAssignments.push({
        day_of_week: scheduleSlot.day_of_week,
        start_time: scheduleSlot.start_time,
        end_time: scheduleSlot.end_time,
        assignment: {
          subjectName: scheduleSlot.subjects?.name || 'Unknown',
          teacherName: teacherName,
          groupCode: scheduleSlot.student_groups?.name || ''
        }
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
      semesterName: `Semestre ${semester.number}`,
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