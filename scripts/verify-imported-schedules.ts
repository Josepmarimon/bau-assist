import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyImportedSchedules() {
  console.log('🔍 VERIFICANT HORARIS IMPORTATS')
  console.log('================================\n')
  
  // Get all student groups
  const { data: groups } = await supabase
    .from('student_groups')
    .select('id, name, year, shift')
    .order('year', { ascending: true })
    .order('shift', { ascending: true })
    .order('name', { ascending: true })
  
  if (!groups) {
    console.error('❌ No s\'han pogut obtenir els grups')
    return
  }
  
  let totalSlots = 0
  let groupsWithSchedules = 0
  let groupsWithoutSchedules = 0
  
  for (const group of groups) {
    const { data: slots, count } = await supabase
      .from('schedule_slots')
      .select(`
        id,
        day_of_week,
        start_time,
        end_time,
        semester,
        subjects(name),
        schedule_slot_teachers(teachers(first_name, last_name)),
        schedule_slot_classrooms(classrooms(code))
      `, { count: 'exact' })
      .eq('student_group_id', group.id)
      .order('semester', { ascending: true })
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true })
    
    if (count && count > 0) {
      groupsWithSchedules++
      totalSlots += count
      console.log(`\n✅ ${group.name} (${group.year}r any, ${group.shift})`)
      console.log(`   📊 Total slots: ${count}`)
      
      // Show first few slots as example
      if (slots && slots.length > 0) {
        console.log('   📅 Exemples:')
        const examples = slots.slice(0, 3)
        for (const slot of examples) {
          const subject = (slot as any).subjects?.name || 'Sense assignatura'
          const teachers = (slot as any).schedule_slot_teachers
            ?.map((st: any) => `${st.teachers.first_name} ${st.teachers.last_name}`)
            .join(', ') || 'Sense professor'
          const classrooms = (slot as any).schedule_slot_classrooms
            ?.map((sc: any) => sc.classrooms.code)
            .join(', ') || 'Sense aula'
          
          console.log(`      - Dia ${slot.day_of_week}, ${slot.start_time}-${slot.end_time}, Sem ${slot.semester}`)
          console.log(`        ${subject} | ${teachers} | ${classrooms}`)
        }
        if (slots.length > 3) {
          console.log(`      ... i ${slots.length - 3} més`)
        }
      }
    } else {
      groupsWithoutSchedules++
      console.log(`\n❌ ${group.name} (${group.year}r any, ${group.shift}) - SENSE HORARI`)
    }
  }
  
  console.log('\n\n📊 RESUM FINAL')
  console.log('===============')
  console.log(`✅ Grups amb horari: ${groupsWithSchedules}`)
  console.log(`❌ Grups sense horari: ${groupsWithoutSchedules}`)
  console.log(`📚 Total slots importats: ${totalSlots}`)
  
  // Check for specific courses
  console.log('\n\n🎨 VERIFICACIÓ PER TIPUS DE CURS')
  console.log('===================================')
  
  const courseTypes = [
    { name: 'Disseny', yearPrefix: ['1n', '2n', '3r', '4t'] },
    { name: 'Belles Arts', yearPrefix: ['BA'] }
  ]
  
  for (const courseType of courseTypes) {
    console.log(`\n${courseType.name}:`)
    for (const prefix of courseType.yearPrefix) {
      const courseGroups = groups.filter(g => 
        g.name.includes(prefix) || 
        (courseType.name === 'Belles Arts' && g.name.startsWith('BA'))
      )
      const withSchedule = await Promise.all(
        courseGroups.map(async (g) => {
          const { count } = await supabase
            .from('schedule_slots')
            .select('*', { count: 'exact', head: true })
            .eq('student_group_id', g.id)
          return count && count > 0
        })
      )
      const scheduledCount = withSchedule.filter(Boolean).length
      console.log(`  ${prefix}: ${scheduledCount}/${courseGroups.length} grups amb horari`)
    }
  }
}

// Execute
verifyImportedSchedules().catch(console.error)