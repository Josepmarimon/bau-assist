import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function analyzeImportStatus() {
  console.log('📊 ANÀLISI DETALLADA DE L\'ESTAT DE LA IMPORTACIÓ')
  console.log('================================================\n')
  
  // Expected groups from the schedules
  const expectedGroups = {
    'Disseny 1r': ['1r Matí M1', '1r Matí M2', '1r Matí M3', '1r Matí M4', '1r Matí M5', '1r Tarda T1', '1r Tarda T2'],
    'Disseny 2n': ['2n Matí M1', '2n Matí M2', '2n Matí M3', '2n Matí M4', '2n Matí M5', '2n Tarda T1', '2n Tarda T2'],
    'Disseny 3r': ['3r Matí Gm1', '3r Matí Gm2', '3r Matí Im', '3r Matí Am', '3r Matí Mm', '3r Tarda Gt', '3r Tarda It', '3r Tarda At', '3r Tarda Mt'],
    'Disseny 4t': ['4t Matí Gm1', '4t Matí Im', '4t Matí Am', '4t Matí Mm', '4t Tarda Gt', '4t Tarda It', '4t Tarda At', '4t Tarda Mt'],
    'Belles Arts 1r': ['1r BA Matí M1'],
    'Belles Arts 2n': ['2n BA Matí M1'],
    'Belles Arts 3r': ['3r BA Matí M1'],
    'Belles Arts 4t': ['4t BA Matí M1']
  }
  
  // Count schedules from the import script
  const scheduleCounts: { [key: string]: number } = {
    '1r Matí M1': 12, '1r Matí M2': 12, '1r Matí M3': 12, '1r Matí M4': 12, '1r Matí M5': 12,
    '1r Tarda T1': 12, '1r Tarda T2': 12,
    '2n Matí M3': 10, '2n Matí M4': 10, '2n Matí M5': 10,
    '2n Tarda T1': 10, '2n Tarda T2': 10,
    '3r Matí Gm1': 14,
    '4t Matí Gm1': 12,
    '1r BA Matí M1': 10,
    '2n BA Matí M1': 10,
    '3r BA Matí M1': 4,
    '4t BA Matí M1': 4
  }
  
  console.log('🎯 GRUPS ESPERATS vs IMPORTATS')
  console.log('==============================\n')
  
  for (const [course, groups] of Object.entries(expectedGroups)) {
    console.log(`\n${course}:`)
    
    for (const groupName of groups) {
      const { data: group } = await supabase
        .from('student_groups')
        .select('id')
        .eq('name', groupName)
        .single()
      
      if (!group) {
        console.log(`  ❌ ${groupName} - NO EXISTEIX A LA BD`)
        continue
      }
      
      const { count } = await supabase
        .from('schedule_slots')
        .select('*', { count: 'exact', head: true })
        .eq('student_group_id', group.id)
      
      const expected = scheduleCounts[groupName] || 0
      
      if (count && count > 0) {
        if (count === expected) {
          console.log(`  ✅ ${groupName} - ${count} slots (correcte)`)
        } else {
          console.log(`  ⚠️  ${groupName} - ${count} slots (esperats: ${expected})`)
        }
      } else {
        console.log(`  ❌ ${groupName} - SENSE HORARI (esperats: ${expected} slots)`)
      }
    }
  }
  
  // Check for duplicates
  console.log('\n\n🔍 COMPROVACIÓ DE DUPLICATS')
  console.log('============================\n')
  
  const { data: allSlots } = await supabase
    .from('schedule_slots')
    .select(`
      id,
      student_group_id,
      day_of_week,
      start_time,
      semester,
      academic_year,
      student_groups(name)
    `)
    .order('student_group_id')
    .order('semester')
    .order('day_of_week')
    .order('start_time')
  
  if (allSlots) {
    const duplicateKey: Record<string, number> = {}
    
    for (const slot of allSlots) {
      const key = `${slot.student_group_id}-${slot.day_of_week}-${slot.start_time}-${slot.semester}-${slot.academic_year}`
      duplicateKey[key] = (duplicateKey[key] || 0) + 1
    }
    
    const duplicates = Object.entries(duplicateKey).filter(([_, count]) => count > 1)
    
    if (duplicates.length > 0) {
      console.log(`❌ Trobats ${duplicates.length} duplicats!`)
      duplicates.forEach(([key, count]) => {
        console.log(`  - ${key}: ${count} entrades`)
      })
    } else {
      console.log('✅ No s\'han trobat duplicats')
    }
  }
  
  // Summary of what's missing
  console.log('\n\n📋 RESUM DE GRUPS PENDENTS D\'IMPORTAR')
  console.log('======================================\n')
  
  const missingGroups: string[] = []
  
  for (const [_, groups] of Object.entries(expectedGroups)) {
    for (const groupName of groups) {
      if (!scheduleCounts[groupName]) {
        missingGroups.push(groupName)
      }
    }
  }
  
  if (missingGroups.length > 0) {
    console.log('Grups que apareixen als horaris però NO s\'han importat:')
    missingGroups.forEach(g => console.log(`  - ${g}`))
    
    // Check if these groups exist in DB
    console.log('\n🔍 Comprovant si aquests grups existeixen a la BD:')
    for (const groupName of missingGroups) {
      const { data } = await supabase
        .from('student_groups')
        .select('id, name')
        .eq('name', groupName)
        .single()
      
      if (data) {
        console.log(`  ✅ ${groupName} - existeix (ID: ${data.id})`)
      } else {
        console.log(`  ❌ ${groupName} - NO existeix`)
      }
    }
  } else {
    console.log('✅ Tots els grups esperats han estat processats')
  }
}

// Execute
analyzeImportStatus().catch(console.error)