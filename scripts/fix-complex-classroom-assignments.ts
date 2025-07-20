import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

async function fixComplexClassroomAssignments() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔧 FIXING COMPLEX CLASSROOM ASSIGNMENTS')
  console.log('======================================\n')

  // Get all classrooms for mapping
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('id, code')

  const classroomMap = new Map<string, string>()
  classrooms?.forEach(c => {
    classroomMap.set(c.code, c.id)
    // Also map without dots
    classroomMap.set(c.code.replace(/\./g, ''), c.id)
  })

  // Specific fixes based on the JSON data
  const fixes = [
    {
      subject: 'Tipografia II',
      group: '3r Gràfic Tarda (3 Gt)',
      semester: 2,
      day: 1,
      classrooms: ['P.0.5/0.7'] // Primary classroom only
    }
  ]

  let fixed = 0
  let errors = 0

  for (const fix of fixes) {
    console.log(`\n📚 Fixing ${fix.subject} - ${fix.group}...`)

    // Find the schedule slot
    const { data: slot } = await supabase
      .from('schedule_slots')
      .select(`
        id,
        subjects!inner(name),
        student_groups!inner(name)
      `)
      .eq('subjects.name', fix.subject)
      .eq('student_groups.name', fix.group)
      .eq('semester', fix.semester)
      .eq('day_of_week', fix.day)
      .single()

    if (!slot) {
      console.log('   ❌ Schedule slot not found')
      errors++
      continue
    }

    // Remove existing classroom assignments
    await supabase
      .from('schedule_slot_classrooms')
      .delete()
      .eq('schedule_slot_id', slot.id)

    // Add new classroom assignments
    for (const classroomCode of fix.classrooms) {
      const classroomId = classroomMap.get(classroomCode)
      
      if (!classroomId) {
        console.log(`   ⚠️  Classroom not found: ${classroomCode}`)
        continue
      }

      const { error } = await supabase
        .from('schedule_slot_classrooms')
        .insert({
          schedule_slot_id: slot.id,
          classroom_id: classroomId
        })

      if (error) {
        console.log(`   ❌ Error assigning classroom: ${error.message}`)
        errors++
      } else {
        console.log(`   ✅ Assigned classroom ${classroomCode}`)
        fixed++
      }
    }
  }

  // Also, let's check for any slots without classrooms and try to fix them from JSON
  console.log('\n🔍 Looking for slots without classrooms...')
  
  const { data: unassignedSlots } = await supabase
    .from('schedule_slots')
    .select(`
      id,
      day_of_week,
      start_time,
      semester,
      subjects(name),
      student_groups(name)
    `)
    .is('id', 'not.in', `(select schedule_slot_id from schedule_slot_classrooms)`)
    .limit(10)

  console.log(`\nFound ${unassignedSlots?.length || 0} unassigned slots:`)
  unassignedSlots?.forEach(slot => {
    console.log(`  - ${slot.subjects?.name} (${slot.student_groups?.name}) - Day ${slot.day_of_week}, ${slot.start_time}`)
  })

  console.log('\n📊 SUMMARY')
  console.log('===========')
  console.log(`✅ Fixed: ${fixed} assignments`)
  console.log(`❌ Errors: ${errors}`)

  // Final check
  const { count: totalSlots } = await supabase
    .from('schedule_slots')
    .select('*', { count: 'exact', head: true })

  const { count: slotsWithClassrooms } = await supabase
    .from('schedule_slot_classrooms')
    .select('*', { count: 'exact', head: true })

  console.log('\n📊 FINAL STATUS')
  console.log('===============')
  console.log(`Total schedule slots: ${totalSlots}`)
  console.log(`Slots with classrooms: ${slotsWithClassrooms}`)
  console.log(`Percentage with classrooms: ${totalSlots ? ((slotsWithClassrooms! / totalSlots) * 100).toFixed(1) : 0}%`)
}

fixComplexClassroomAssignments().catch(console.error)