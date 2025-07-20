import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function analyzeClassrooms() {
  console.log('🏫 ANÀLISI D\'AULES')
  console.log('==================\n')
  
  // Get all classrooms
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('id, code, name, capacity')
    .order('code')
  
  // Get all classrooms that have schedule assignments
  const { data: usedClassrooms } = await supabase
    .from('schedule_slot_classrooms')
    .select('classroom_id')
  
  const usedClassroomIds = new Set(usedClassrooms?.map(uc => uc.classroom_id) || [])
  
  // Find unused classrooms
  const unusedClassrooms = classrooms?.filter(c => !usedClassroomIds.has(c.id)) || []
  
  console.log('📍 AULES SENSE CAP ASSIGNACIÓ:')
  console.log('==============================')
  unusedClassrooms.forEach(c => {
    console.log(`- ${c.code}: ${c.name} (capacitat: ${c.capacity})`)
  })
  
  console.log(`\n✅ Total: ${unusedClassrooms.length} aules sense assignacions`)
  console.log(`📊 Total aules al sistema: ${classrooms?.length || 0}`)
  console.log(`📅 Aules amb assignacions: ${(classrooms?.length || 0) - unusedClassrooms.length}`)
  
  // List of classrooms found in images that don't exist in DB
  const missingClassrooms = [
    'PO.2/O.4',
    'PO.6', 
    'PO.8',
    'PO.10',
    'PO.11',
    'PO.12',
    'GO.3',
    'G.2.2',
    'PO.1',
    'P1.9',
    'P1.16',
    'P1.17',
    'P1.19',
    'PO.2/G4',
    'PO.5/O.7',
    'Pt.2+portàtils',
    'G0.4',
    'Sala Carolines'
  ]
  
  console.log('\n❌ AULES TROBADES ALS HORARIS PERÒ NO EXISTEIXEN A LA BD:')
  console.log('=========================================================')
  missingClassrooms.forEach(code => {
    console.log(`- ${code}`)
  })
  console.log(`\n⚠️  Total: ${missingClassrooms.length} aules que falten crear`)
}

analyzeClassrooms()