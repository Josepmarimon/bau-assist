import { getClassroomOccupancyData } from '../src/app/(authenticated)/aules/actions'

async function testOccupancy() {
  console.log('🧪 TESTING OCCUPANCY ACTION')
  console.log('==========================\n')

  // Find P.0.5/0.7 classroom ID
  const classroomCode = 'P.0.5/0.7'
  
  // We need to get the classroom ID first
  // For testing, let's use the ID we found earlier
  const classroomId = '63345da0-46a9-4c2d-b76d-6b4123f9152e'
  
  console.log(`Testing occupancy for classroom: ${classroomCode}`)
  console.log(`Classroom ID: ${classroomId}\n`)

  try {
    const occupancyData = await getClassroomOccupancyData(classroomId)
    
    if (!occupancyData) {
      console.log('❌ No occupancy data returned')
      return
    }

    console.log(`✅ Got ${occupancyData.length} semesters of data\n`)

    // Check each semester
    occupancyData.forEach(semester => {
      console.log(`\n📅 ${semester.semesterName}`)
      console.log('-------------------')
      
      const occupancy = semester.classroomOccupancy
      console.log(`Morning occupancy: ${occupancy.morningOccupancy}%`)
      console.log(`Afternoon occupancy: ${occupancy.afternoonOccupancy}%`)
      console.log(`Total occupancy: ${occupancy.totalOccupancy}%`)
      
      // Show occupied slots
      const occupiedSlots = occupancy.timeSlots.filter(s => s.isOccupied)
      console.log(`\nOccupied slots: ${occupiedSlots.length}`)
      
      occupiedSlots.forEach(slot => {
        const dayNames = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
        console.log(`\n  ${dayNames[slot.dayOfWeek]} ${slot.startTime} - ${slot.endTime}`)
        if (slot.assignment) {
          console.log(`    Subject: ${slot.assignment.subjectName}`)
          console.log(`    Group: ${slot.assignment.groupCode}`)
          console.log(`    Teacher: ${slot.assignment.teacherName}`)
        }
      })
    })
  } catch (error) {
    console.error('❌ Error:', error)
  }
}

// Run the test
testOccupancy()