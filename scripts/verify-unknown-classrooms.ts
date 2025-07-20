import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyUnknownClassrooms() {
  console.log('🔍 VERIFICANT AULES DESCONEGUDES AMB ELS MAPEJOS ACTUALS')
  console.log('========================================================\n')
  
  // Aules dels horaris que podrien no existir
  const classroomsFromSchedules = [
    'PO.2/O.4', 'PO.6', 'PO.8', 'PO.10', 'PO.11', 'PO.12',
    'GO.3', 'G2.2', 'G.2.2', 'PO.1', 'P1.9', 'P1.16', 'P1.17', 'P1.19',
    'PO.2/G4', 'PO.5/O.7', 'Pt.2+portàtils', 'G0.4', 'Sala Carolines'
  ]
  
  const mappings: Record<string, string> = {
    'PO.1': 'P.0.1',
    'PO.2': 'P.0.2',
    'PO.3': 'P.0.3',
    'PO.4': 'P.0.4',
    'PO.5': 'P.0.5',
    'PO.6': 'P.0.6',
    'PO.7': 'P.0.7',
    'PO.8': 'P.0.8',
    'PO.9': 'P.0.9',
    'PO.10': 'P.0.10',
    'PO.11': 'P.0.11',
    'PO.12': 'P.0.12',
    'PO.2/O.4': 'P.0.2/0.4',
    'PO.5/O.7': 'P.0.5/0.7',
    'GO.3': 'G.0.3_TALLER_D\'ESCULTURA_CERAMICA_METALL',
    'GO.4': 'G.0.4',
    'G2.2': 'G.2.2',
    'G.2.2': 'G.E.2',
    'G0.4': 'G.0.4',
    'P1.9': 'P.1.9',
    'P1.16': 'P.1.16',
    'P1.17': '', // No existeix
    'P1.19': '', // No existeix
    'PO.2/G4': '', // No existeix
    'Pt.2+portàtils': '', // No existeix
    'Sala Carolines': 'SALA_CAROLINES'
  }
  
  const notFound = []
  const found = []
  const notInDB = []
  
  for (const classroom of classroomsFromSchedules) {
    const mapped = mappings[classroom] || classroom
    
    if (!mapped) {
      notInDB.push(classroom)
      continue
    }
    
    const { data } = await supabase
      .from('classrooms')
      .select('code, name')
      .eq('code', mapped)
      .single()
    
    if (data) {
      found.push({ original: classroom, mapped: mapped, exists: data.name })
    } else {
      notFound.push({ original: classroom, mapped: mapped })
    }
  }
  
  console.log('✅ AULES TROBADES AMB MAPEIG:')
  found.forEach(c => {
    console.log(`  ${c.original} → ${c.mapped} (${c.exists})`)
  })
  
  console.log('\n❌ AULES NO TROBADES A LA BD (amb mapeig):')
  notFound.forEach(c => {
    console.log(`  ${c.original} → ${c.mapped}`)
  })
  
  console.log('\n⚠️  AULES MARCADES COM NO EXISTENTS:')
  notInDB.forEach(c => {
    console.log(`  ${c}`)
  })
  
  // Comprovar específicament P.0.11
  console.log('\n🔍 VERIFICANT P.0.11 ESPECÍFICAMENT:')
  const { data: p011 } = await supabase
    .from('classrooms')
    .select('*')
    .eq('code', 'P.0.11')
    .single()
  
  if (p011) {
    console.log('✅ P.0.11 existeix:', p011)
  } else {
    console.log('❌ P.0.11 NO existeix a la BD')
  }
}

verifyUnknownClassrooms()