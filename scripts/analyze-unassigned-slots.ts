import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

async function analyzeUnassignedSlots() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Get slots without classroom assignments
  const { data: slotsWithClassrooms } = await supabase
    .from('schedule_slot_classrooms')
    .select('schedule_slot_id')

  const assignedSlotIds = new Set(slotsWithClassrooms?.map(s => s.schedule_slot_id) || [])

  // Get all slots
  const { data: allSlots } = await supabase
    .from('schedule_slots')
    .select('*')
    .order('created_at', { ascending: false })

  const unassignedSlots = allSlots?.filter(slot => !assignedSlotIds.has(slot.id)) || []

  console.log(`\n📊 Found ${unassignedSlots.length} unassigned slots`)

  // Get details for the first few unassigned slots
  for (const slot of unassignedSlots.slice(0, 5)) {
    const { data: subject } = await supabase
      .from('subjects')
      .select('name')
      .eq('id', slot.subject_id)
      .single()

    const { data: group } = await supabase
      .from('student_groups')
      .select('name')
      .eq('id', slot.student_group_id)
      .single()

    console.log(`\n📍 Slot ID: ${slot.id}`)
    console.log(`   Subject: ${subject?.name || 'NOT FOUND'} (ID: ${slot.subject_id})`)
    console.log(`   Group: ${group?.name || 'NOT FOUND'} (ID: ${slot.student_group_id})`)
    console.log(`   Day: ${slot.day_of_week}, Time: ${slot.start_time} - ${slot.end_time}`)
    console.log(`   Semester: ${slot.semester}`)
  }

  // Check if these are from a specific import batch
  const recentSlot = unassignedSlots[0]
  if (recentSlot) {
    console.log(`\n⏰ Most recent unassigned slot created at: ${recentSlot.created_at}`)
  }

  // Check if subjects/groups exist for these slots
  const uniqueSubjectIds = [...new Set(unassignedSlots.map(s => s.subject_id))]
  const uniqueGroupIds = [...new Set(unassignedSlots.map(s => s.student_group_id))]

  const { count: subjectCount } = await supabase
    .from('subjects')
    .select('*', { count: 'exact', head: true })
    .in('id', uniqueSubjectIds)

  const { count: groupCount } = await supabase
    .from('student_groups')
    .select('*', { count: 'exact', head: true })
    .in('id', uniqueGroupIds)

  console.log(`\n🔍 Data integrity check:`)
  console.log(`   Unique subjects in unassigned slots: ${uniqueSubjectIds.length}`)
  console.log(`   Subjects found in database: ${subjectCount}`)
  console.log(`   Unique groups in unassigned slots: ${uniqueGroupIds.length}`)
  console.log(`   Groups found in database: ${groupCount}`)

  if (subjectCount !== uniqueSubjectIds.length || groupCount !== uniqueGroupIds.length) {
    console.log('\n⚠️  WARNING: Some subjects or groups referenced in schedule_slots don\'t exist!')
  }
}

analyzeUnassignedSlots().catch(console.error)