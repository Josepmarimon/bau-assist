import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkMissingClassrooms() {
  console.log('🔍 COMPROVANT AULES QUE PODRIEN EXISTIR')
  console.log('========================================\n')
  
  // Aules que potser existeixen amb format diferent
  const classroomsToCheck = [
    { search: 'P.1.9', alternativeName: 'P1.9' },
    { search: 'P.1.16', alternativeName: 'P1.16' },
    { search: 'P.1.17', alternativeName: 'P1.17' },
    { search: 'P.1.19', alternativeName: 'P1.19' },
    { search: 'G.2.2', alternativeName: 'G2.2' },
    { search: 'P.0.1', alternativeName: 'P0.1 / PO.1' },
  ]
  
  for (const classroom of classroomsToCheck) {
    const { data } = await supabase
      .from('classrooms')
      .select('code, name')
      .eq('code', classroom.search)
      .single()
    
    if (data) {
      console.log(`✅ ${classroom.search} EXISTEIX: ${data.name}`)
    } else {
      console.log(`❌ ${classroom.search} NO existeix (apareix com ${classroom.alternativeName} als horaris)`)
    }
  }
  
  // Comprovar aules amb format alternatiu
  console.log('\n🔍 AULES AMB FORMATS SIMILARS:')
  console.log('==============================')
  
  const { data: pClassrooms } = await supabase
    .from('classrooms')
    .select('code, name')
    .or('code.like.P.0.%,code.like.P.1.%,code.like.P.2.%')
    .order('code')
  
  console.log('\nAules tipus P.X.X disponibles:')
  pClassrooms?.forEach(c => {
    console.log(`- ${c.code}: ${c.name}`)
  })
}

checkMissingClassrooms()