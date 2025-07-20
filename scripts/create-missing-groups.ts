import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createMissingGroups() {
  console.log('🏫 CREANT GRUPS QUE FALTEN')
  console.log('==========================\n')
  
  // Grups de Disseny que necessitem crear
  const missingGroups = [
    // 2n curs - Matí
    { name: '2n Matí M1', year: 2, shift: 'mati', max_students: 30 },
    { name: '2n Matí M2', year: 2, shift: 'mati', max_students: 30 },
    { name: '2n Matí M3', year: 2, shift: 'mati', max_students: 30 },
    { name: '2n Matí M4', year: 2, shift: 'mati', max_students: 30 },
    { name: '2n Matí M5', year: 2, shift: 'mati', max_students: 30 },
    { name: '2n Matí M6', year: 2, shift: 'mati', max_students: 30 },
    { name: '2n Matí M7', year: 2, shift: 'mati', max_students: 30 },
    { name: '2n Matí M8', year: 2, shift: 'mati', max_students: 30 },
    { name: '2n Matí M9', year: 2, shift: 'mati', max_students: 30 },
    // 2n curs - Tarda
    { name: '2n Tarda T1', year: 2, shift: 'tarda', max_students: 30 },
    { name: '2n Tarda T2', year: 2, shift: 'tarda', max_students: 30 },
    { name: '2n Tarda T3', year: 2, shift: 'tarda', max_students: 30 },
    { name: '2n Tarda T4', year: 2, shift: 'tarda', max_students: 30 },
    { name: '2n Tarda T5', year: 2, shift: 'tarda', max_students: 30 },
    { name: '2n Tarda T6', year: 2, shift: 'tarda', max_students: 30 },
    
    // 3r curs - Matí
    { name: '3r Matí M1', year: 3, shift: 'mati', max_students: 30 },
    { name: '3r Matí M2', year: 3, shift: 'mati', max_students: 30 },
    { name: '3r Matí M3', year: 3, shift: 'mati', max_students: 30 },
    { name: '3r Matí M4', year: 3, shift: 'mati', max_students: 30 },
    { name: '3r Matí M5', year: 3, shift: 'mati', max_students: 30 },
    // 3r curs - Tarda
    { name: '3r Tarda T1', year: 3, shift: 'tarda', max_students: 30 },
    { name: '3r Tarda T2', year: 3, shift: 'tarda', max_students: 30 },
    { name: '3r Tarda T3', year: 3, shift: 'tarda', max_students: 30 },
    { name: '3r Tarda T4', year: 3, shift: 'tarda', max_students: 30 },
    
    // 4t curs - Matí
    { name: '4t Matí M1', year: 4, shift: 'mati', max_students: 30 },
    { name: '4t Matí M2', year: 4, shift: 'mati', max_students: 30 },
    { name: '4t Matí M3', year: 4, shift: 'mati', max_students: 30 },
    { name: '4t Matí M4', year: 4, shift: 'mati', max_students: 30 },
    { name: '4t Matí M5', year: 4, shift: 'mati', max_students: 30 },
    // 4t curs - Tarda
    { name: '4t Tarda T1', year: 4, shift: 'tarda', max_students: 30 },
    { name: '4t Tarda T2', year: 4, shift: 'tarda', max_students: 30 },
    { name: '4t Tarda T3', year: 4, shift: 'tarda', max_students: 30 }
  ]
  
  let created = 0
  let errors = 0
  
  for (const group of missingGroups) {
    try {
      // Primer comprovar si existeix
      const { data: existing } = await supabase
        .from('student_groups')
        .select('id')
        .eq('name', group.name)
        .single()
      
      if (existing) {
        console.log(`⏭️  Grup ja existeix: ${group.name}`)
        continue
      }
      
      // Crear el grup
      const { error } = await supabase
        .from('student_groups')
        .insert({
          name: group.name,
          year: group.year,
          shift: group.shift,
          max_students: group.max_students
        })
      
      if (error) {
        console.error(`❌ Error creant ${group.name}:`, error)
        errors++
      } else {
        console.log(`✅ Creat: ${group.name}`)
        created++
      }
    } catch (err) {
      console.error(`❌ Error processant ${group.name}:`, err)
      errors++
    }
  }
  
  console.log('\n==========================')
  console.log(`📊 Resum: ${created} grups creats, ${errors} errors`)
}

// Executar
createMissingGroups().catch(console.error)