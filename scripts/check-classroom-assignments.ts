import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

async function checkAssignments() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Get total schedule slots
  const { count: totalSlots } = await supabase
    .from('schedule_slots')
    .select('*', { count: 'exact', head: true })

  // Get slots with classroom assignments
  const { data: slotsWithClassrooms } = await supabase
    .from('schedule_slot_classrooms')
    .select('schedule_slot_id')

  const assignedSlots = new Set(slotsWithClassrooms?.map(s => s.schedule_slot_id) || [])
  const assignedCount = assignedSlots.size

  // Get unassigned slots details
  const { data: allSlots } = await supabase
    .from('schedule_slots')
    .select(`
      id,
      subject_id,
      student_group_id,
      semester,
      subjects(name),
      student_groups(name)
    `)

  const unassignedSlots = allSlots?.filter(slot => !assignedSlots.has(slot.id)) || []

  console.log('\n📊 CLASSROOM ASSIGNMENT STATUS')
  console.log('================================')
  console.log(`Total schedule slots: ${totalSlots}`)
  console.log(`Slots with classrooms: ${assignedCount}`)
  console.log(`Slots without classrooms: ${totalSlots! - assignedCount}`)
  console.log(`Percentage assigned: ${((assignedCount / totalSlots!) * 100).toFixed(1)}%`)

  // Debug: check the structure
  if (unassignedSlots.length > 0) {
    console.log('\nDebug - First unassigned slot structure:', JSON.stringify(unassignedSlots[0], null, 2))
  }

  // Group unassigned by subject type
  const tutoriesCount = unassignedSlots.filter(s => s.subjects?.name?.toLowerCase().includes('tutori')).length
  const optativesCount = unassignedSlots.filter(s => s.subjects?.name?.toLowerCase().includes('optativ')).length
  const othersCount = unassignedSlots.length - tutoriesCount - optativesCount

  console.log('\n🔍 UNASSIGNED SLOTS BREAKDOWN:')
  console.log(`- Tutories: ${tutoriesCount}`)
  console.log(`- Optatives: ${optativesCount}`)
  console.log(`- Other subjects: ${othersCount}`)

  // Show some examples of unassigned slots
  console.log('\n📋 EXAMPLES OF UNASSIGNED SLOTS:')
  const examples = unassignedSlots
    .filter(s => !s.subjects?.name?.toLowerCase().includes('tutori'))
    .slice(0, 10)
  
  examples.forEach(slot => {
    console.log(`- ${slot.subjects?.name} (${slot.student_groups?.name}) - Semester ${slot.semester}`)
  })
}

checkAssignments().catch(console.error)