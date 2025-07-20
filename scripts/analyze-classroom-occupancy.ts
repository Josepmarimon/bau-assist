import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function analyzeClassroomOccupancy() {
  console.log('🏫 ANÀLISI D\'OCUPACIÓ D\'AULES')
  console.log('================================\n')

  // Get all classrooms
  const { data: classrooms, error: classroomError } = await supabase
    .from('classrooms')
    .select('id, code, name')
    .order('code')

  if (classroomError) {
    console.error('Error fetching classrooms:', classroomError)
    return
  }

  // Get all schedule slots grouped by classroom
  const { data: scheduleSlots, error: slotsError } = await supabase
    .from('schedule_slot_classrooms')
    .select(`
      classroom_id,
      classrooms!inner(code, name),
      schedule_slots!inner(
        semester,
        day_of_week,
        start_time,
        end_time,
        subjects(name),
        student_groups(name)
      )
    `)

  if (slotsError) {
    console.error('Error fetching schedule slots:', slotsError)
    return
  }

  // Count occupancy by classroom
  const occupancyByClassroom = new Map<string, {
    code: string
    name: string
    totalSlots: number
    semester1Slots: number
    semester2Slots: number
    morningSlots: number
    afternoonSlots: number
  }>()

  // Initialize all classrooms
  classrooms?.forEach(classroom => {
    occupancyByClassroom.set(classroom.id, {
      code: classroom.code,
      name: classroom.name,
      totalSlots: 0,
      semester1Slots: 0,
      semester2Slots: 0,
      morningSlots: 0,
      afternoonSlots: 0
    })
  })

  // Count slots
  scheduleSlots?.forEach(slot => {
    const classroomData = occupancyByClassroom.get(slot.classroom_id)
    if (classroomData && slot.schedule_slots && Array.isArray(slot.schedule_slots) && slot.schedule_slots.length > 0) {
      classroomData.totalSlots++
      
      const scheduleSlot = slot.schedule_slots[0]
      if (scheduleSlot.semester === 1) {
        classroomData.semester1Slots++
      } else {
        classroomData.semester2Slots++
      }

      const startHour = parseInt(scheduleSlot.start_time.split(':')[0])
      if (startHour < 14) {
        classroomData.morningSlots++
      } else {
        classroomData.afternoonSlots++
      }
    }
  })

  // Sort by total slots and display
  const sortedClassrooms = Array.from(occupancyByClassroom.values())
    .sort((a, b) => b.totalSlots - a.totalSlots)

  console.log('📊 TOP 20 AULES AMB MÉS OCUPACIÓ:\n')
  sortedClassrooms.slice(0, 20).forEach((classroom, index) => {
    console.log(`${index + 1}. ${classroom.code} - ${classroom.name}`)
    console.log(`   📈 Total: ${classroom.totalSlots} slots`)
    console.log(`   📅 Semestre 1: ${classroom.semester1Slots}, Semestre 2: ${classroom.semester2Slots}`)
    console.log(`   🌅 Matí: ${classroom.morningSlots}, 🌆 Tarda: ${classroom.afternoonSlots}`)
    console.log()
  })

  console.log('\n📊 AULES SENSE OCUPACIÓ:\n')
  const emptyClassrooms = sortedClassrooms.filter(c => c.totalSlots === 0)
  console.log(`Total: ${emptyClassrooms.length} aules`)
  console.log(emptyClassrooms.map(c => c.code).join(', '))

  // Summary statistics
  console.log('\n📊 RESUM GENERAL:')
  console.log('==================')
  console.log(`Total aules: ${classrooms?.length || 0}`)
  console.log(`Aules amb horaris: ${sortedClassrooms.filter(c => c.totalSlots > 0).length}`)
  console.log(`Aules sense horaris: ${emptyClassrooms.length}`)
  
  const totalSlots = sortedClassrooms.reduce((sum, c) => sum + c.totalSlots, 0)
  console.log(`\nTotal slots assignats: ${totalSlots}`)
  
  // Check which groups have schedules
  console.log('\n📚 GRUPS AMB HORARIS:')
  console.log('====================')
  
  const { data: groupsWithSchedules } = await supabase
    .from('schedule_slots')
    .select('student_groups!inner(name, year, shift)')
    .order('student_groups(year)', { ascending: true })
    .order('student_groups(name)', { ascending: true })

  const uniqueGroups = new Set<string>()
  groupsWithSchedules?.forEach(slot => {
    if (slot.student_groups && Array.isArray(slot.student_groups) && slot.student_groups.length > 0) {
      const group = slot.student_groups[0]
      uniqueGroups.add(`${group.name} (${group.year}º any, ${group.shift})`)
    }
  })

  Array.from(uniqueGroups).forEach(group => {
    console.log(`✅ ${group}`)
  })
}

analyzeClassroomOccupancy().catch(console.error)