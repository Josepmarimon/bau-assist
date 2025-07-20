import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Special mappings for non-standard classroom names
const SPECIAL_MAPPINGS: Record<string, string> = {
  'Sala Carolines': 'SALA_CAROLINES',
  'Portàtils': 'PORTATILS',
  'Pt.2': 'P.2.2',
  'G.4': 'G.0.4',
  '0.7': 'P.0.7',
  'P0.5/0.7': 'P.0.5/0.7',
  'P0.5/O.7': 'P.0.5/0.7',
  'P1.7 + P0.10': 'P.1.7',  // Take first classroom
  'P.0.2/G.4': 'P.0.2',      // Take first classroom
  'G.2.2': 'G.2.2',
  'G2.2': 'G.2.2',
  'L1.4': 'L.1.4',  // This might need to be created
  'Im1 G0.4': 'G.0.4',
  'Im2 G0.2': 'G.0.2',
  'P0.1': 'P.0.1'   // This might need to be created
}

// Function to normalize classroom code
function normalizeClassroomCode(code: string): string[] {
  if (!code) return []
  
  // First check special mappings
  if (SPECIAL_MAPPINGS[code]) {
    return [SPECIAL_MAPPINGS[code]]
  }
  
  // Remove parenthetical notes and clean up
  let cleaned = code
    .replace(/\([^)]+\)/g, '') // Remove (5 sessions), etc.
    .replace(/\s*\+\s*portàtils/gi, '') // Remove "+ portàtils"
    .replace(/\s*,?\s*portàtils/gi, '')  // Remove ", portàtils"
    .trim()
  
  // Split by common separators
  const parts = cleaned.split(/[,\/+]/).map(p => p.trim()).filter(p => p)
  
  // Process each part
  return parts.map(part => {
    // Check special mappings again for each part
    if (SPECIAL_MAPPINGS[part]) {
      return SPECIAL_MAPPINGS[part]
    }
    
    // Add dots to standard classroom codes (P0.2 → P.0.2)
    return part.replace(/^([PLGM])(\d+)\./, '$1.$2.')
  }).filter(p => p && p.length > 0)
}

async function fixClassroomMappings() {
  console.log('🔧 FIXING CLASSROOM MAPPINGS')
  console.log('============================\n')

  // Clear existing assignments first
  console.log('Clearing existing classroom assignments...')
  await supabase.from('schedule_slot_classrooms').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // Get all classrooms for mapping
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('id, code')

  const classroomMap = new Map<string, string>()
  classrooms?.forEach(c => {
    classroomMap.set(c.code, c.id)
  })

  console.log(`📚 Found ${classrooms?.length || 0} classrooms in database\n`)

  // Read the JSON data
  const jsonData = JSON.parse(
    readFileSync('/Users/josepmarimon/Documents/github/bau-assist/data/all_schedules_data.json', 'utf-8')
  )

  let totalProcessed = 0
  let totalAssigned = 0
  let totalSkipped = 0
  let totalErrors = 0
  const unmappedClassrooms = new Set<string>()

  // Process each schedule
  for (const schedule of jsonData.schedules) {
    const groupName = schedule.group
    
    // Get student group
    const { data: studentGroup } = await supabase
      .from('student_groups')
      .select('id')
      .eq('name', groupName)
      .single()

    if (!studentGroup) {
      console.log(`❌ Student group not found: ${groupName}`)
      continue
    }

    // Process each class
    for (const classData of schedule.classes) {
      if (!classData.classroom) continue
      
      totalProcessed++

      // Find the subject
      let { data: subject } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', classData.subject)
        .single()

      if (!subject) {
        // Try with ilike
        const { data: subjectAlt } = await supabase
          .from('subjects')
          .select('id')
          .ilike('name', `%${classData.subject}%`)
          .single()
        
        if (!subjectAlt) continue
        subject = { id: subjectAlt.id }
      }

      // Find the schedule slot
      const { data: scheduleSlot } = await supabase
        .from('schedule_slots')
        .select('id')
        .eq('subject_id', subject.id)
        .eq('student_group_id', studentGroup.id)
        .eq('day_of_week', classData.day)
        .eq('start_time', classData.start_time + ':00')
        .eq('semester', classData.semester)
        .single()

      if (!scheduleSlot) {
        totalSkipped++
        continue
      }

      // Normalize and assign classrooms
      const normalizedCodes = normalizeClassroomCode(classData.classroom)
      let assigned = false

      for (const normalizedCode of normalizedCodes) {
        const classroomId = classroomMap.get(normalizedCode)
        
        if (!classroomId) {
          unmappedClassrooms.add(`${classData.classroom} → ${normalizedCode}`)
          continue
        }

        // Assign the classroom
        const { error } = await supabase
          .from('schedule_slot_classrooms')
          .insert({
            schedule_slot_id: scheduleSlot.id,
            classroom_id: classroomId
          })

        if (!error) {
          assigned = true
          if (classData.classroom !== normalizedCode) {
            console.log(`✅ Mapped: ${classData.classroom} → ${normalizedCode}`)
          }
        } else if (!error.message.includes('duplicate')) {
          console.log(`❌ Error assigning ${normalizedCode}: ${error.message}`)
          totalErrors++
        }
      }

      if (assigned) {
        totalAssigned++
      }
    }
  }

  console.log('\n📊 SUMMARY')
  console.log('===========')
  console.log(`✅ Successfully assigned: ${totalAssigned}`)
  console.log(`⏭️  Skipped (no slot found): ${totalSkipped}`)
  console.log(`❌ Errors: ${totalErrors}`)
  console.log(`📋 Total processed: ${totalProcessed}`)

  if (unmappedClassrooms.size > 0) {
    console.log('\n⚠️  UNMAPPED CLASSROOMS:')
    Array.from(unmappedClassrooms).sort().forEach(c => {
      console.log(`   ${c}`)
    })
  }

  // Final status
  const { count: totalSlots } = await supabase
    .from('schedule_slots')
    .select('*', { count: 'exact', head: true })

  const { data: uniqueSlots } = await supabase
    .from('schedule_slot_classrooms')
    .select('schedule_slot_id')
    
  const uniqueSlotIds = new Set(uniqueSlots?.map(s => s.schedule_slot_id) || [])

  console.log('\n📊 FINAL DATABASE STATUS')
  console.log('========================')
  console.log(`Total schedule slots: ${totalSlots}`)
  console.log(`Slots with classrooms: ${uniqueSlotIds.size}`)
  console.log(`Percentage with classrooms: ${totalSlots ? ((uniqueSlotIds.size / totalSlots) * 100).toFixed(1) : 0}%`)
}

fixClassroomMappings().catch(console.error)