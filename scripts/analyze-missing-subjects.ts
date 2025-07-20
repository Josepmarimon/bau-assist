import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function analyzeMissingSubjects() {
  console.log('📚 ANÀLISI D\'ASSIGNATURES QUE FALTEN')
  console.log('====================================\n')
  
  // Assignatures trobades als horaris de 3r i 4t de Disseny
  const subjectsFromSchedules = [
    // 3r curs
    'Projectes de Disseny Gràfic i Comunicació Visual I',
    'Projectes de Disseny Gràfic i Comunicació Visual II',
    'Ecoedició',
    'Editorial',
    'Experimental Type',
    'Direcció d\'Art',
    'Optativitat',
    
    // 4t curs
    'Projectes de Disseny Gràfic i Comunicació Visual III',
    'Projectes de Disseny Gràfic i Comunicació Visual IV',
    'Packaging',
    'Disseny d\'Identitat Visual',
    'Treball Final de Grau',
    'Metodologies del Disseny'
  ]
  
  console.log('🔍 Comprovant assignatures dels horaris...\n')
  
  const missing = []
  const existing = []
  
  for (const subjectName of subjectsFromSchedules) {
    const { data } = await supabase
      .from('subjects')
      .select('id, code, name')
      .ilike('name', `%${subjectName}%`)
      .single()
    
    if (data) {
      existing.push({ name: subjectName, found: data })
    } else {
      missing.push(subjectName)
    }
  }
  
  console.log('✅ ASSIGNATURES QUE JA EXISTEIXEN:')
  console.log('==================================')
  existing.forEach(s => {
    console.log(`- "${s.name}" → ${s.found.code}: ${s.found.name}`)
  })
  
  console.log('\n❌ ASSIGNATURES QUE FALTEN CREAR:')
  console.log('=================================')
  missing.forEach(s => {
    console.log(`- ${s}`)
  })
  
  console.log(`\n📊 Resum: ${existing.length} existeixen, ${missing.length} falten`)
  
  // Comprovar també assignatures de Disseny existents
  console.log('\n📚 ASSIGNATURES DE DISSENY EXISTENTS (3r i 4t):')
  console.log('================================================')
  
  const { data: designSubjects } = await supabase
    .from('subjects')
    .select('code, name, year, type')
    .in('year', [3, 4])
    .eq('department', 'EINES')
    .order('year')
    .order('name')
  
  designSubjects?.forEach(s => {
    console.log(`- ${s.year}r: ${s.code} - ${s.name} (${s.type})`)
  })
}

analyzeMissingSubjects()