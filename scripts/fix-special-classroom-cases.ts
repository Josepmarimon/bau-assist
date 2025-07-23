import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixSpecialClassroomCases() {
  console.log('🔧 FIXING SPECIAL CLASSROOM CASES')
  console.log('=================================\n')

  // Mapping of special cases
  const specialMappings: Record<string, string> = {
    'Sala Carolines': 'SALA_CAROLINES',
    'Portàtils': 'PORTATILS',
    'P2.1 + portàtils': 'P.2.1',
    'P2.2 + portàtils': 'P.2.2',
    'P2.2+portàtils': 'P.2.2',
    'Pt.2': 'P.2.2',
    'Pt.2 + portàtils': 'P.2.2',
    'Pt.2+ Portàtils': 'P.2.2',
    'Im1 G0.4': 'G.0.4',
    'Im2 G0.2': 'G.0.2',
    'G.4': 'G.0.4',
    '0.7': 'P.0.7'
  }

  // Get all schedule slots without classrooms
  const { data: unassignedSlots } = await supabase
    .from('schedule_slots')
    .select(`
      id,
      subjects(name),
      student_groups(name)
    `)
    .not('id', 'in', '(select schedule_slot_id from schedule_slot_classrooms)')

  console.log(`Found ${unassignedSlots?.length || 0} slots without classrooms\n`)

  // Get classrooms map
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('id, code')

  const classroomMap = new Map<string, string>()
  classrooms?.forEach(c => {
    classroomMap.set(c.code, c.id)
  })

  let fixed = 0
  let notFixed = 0

  // For unassigned slots, check the JSON data
  const { readFileSync } = await import('fs')
  const jsonData = JSON.parse(
    readFileSync('/Users/josepmarimon/Documents/github/bau-assist/data/all_schedules_data.json', 'utf-8')
  )

  for (const schedule of jsonData.schedules) {
    for (const classData of schedule.classes) {
      if (!classData.classroom) continue

      // Check if this class needs fixing
      const needsFix = Object.keys(specialMappings).some(key => 
        classData.classroom.includes(key)
      )

      if (needsFix) {
        // Find matching unassigned slot
        const slot = unassignedSlots?.find(s => {
          const subjectName = s.subjects && 'name' in s.subjects ? s.subjects.name : ''
          const groupName = s.student_groups && 'name' in s.student_groups ? s.student_groups.name : ''
          return subjectName === classData.subject && groupName === schedule.group
        })

        if (slot) {
          // Find the right classroom code
          let targetCode = ''
          for (const [special, mapped] of Object.entries(specialMappings)) {
            if (classData.classroom.includes(special)) {
              targetCode = mapped
              break
            }
          }

          const classroomId = classroomMap.get(targetCode)
          if (classroomId) {
            const { error } = await supabase
              .from('schedule_slot_classrooms')
              .insert({
                schedule_slot_id: slot.id,
                classroom_id: classroomId
              })

            if (!error) {
              console.log(`✅ Fixed: ${classData.subject} (${schedule.group}) -> ${targetCode}`)
              fixed++
            }
          } else {
            notFixed++
          }
        }
      }
    }
  }

  console.log('\n📊 SUMMARY')
  console.log('===========')
  console.log(`✅ Fixed: ${fixed} assignments`)
  console.log(`❌ Could not fix: ${notFixed}`)

  // Final status
  const { count: totalSlots } = await supabase
    .from('schedule_slots')
    .select('*', { count: 'exact', head: true })

  const { data: uniqueSlots } = await supabase
    .from('schedule_slot_classrooms')
    .select('schedule_slot_id')
    
  const uniqueSlotIds = new Set(uniqueSlots?.map(s => s.schedule_slot_id) || [])

  console.log('\n📊 FINAL STATUS')
  console.log('===============')
  console.log(`Total schedule slots: ${totalSlots}`)
  console.log(`Slots with classrooms: ${uniqueSlotIds.size}`)
  console.log(`Percentage with classrooms: ${totalSlots ? ((uniqueSlotIds.size / totalSlots) * 100).toFixed(1) : 0}%`)
}

fixSpecialClassroomCases().catch(console.error)