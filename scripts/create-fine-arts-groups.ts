import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createFineArtsGroups() {
  console.log('🎨 CREANT GRUPS DE BELLES ARTS')
  console.log('==============================\n')
  
  const fineArtsGroups = [
    // 1r curs
    { name: '1r BA Matí M1', year: 1, shift: 'mati', max_students: 60 },
    // 2n curs
    { name: '2n BA Matí M1', year: 2, shift: 'mati', max_students: 60 },
    // 3r curs
    { name: '3r BA Matí M1', year: 3, shift: 'mati', max_students: 60 },
    { name: '3r BA Tarda T1', year: 3, shift: 'tarda', max_students: 60 },
    // 4t curs
    { name: '4t BA Matí M1', year: 4, shift: 'mati', max_students: 60 },
    { name: '4t BA Tarda T1', year: 4, shift: 'tarda', max_students: 60 }
  ]
  
  let created = 0
  let errors = 0
  
  for (const group of fineArtsGroups) {
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
  
  console.log('\n==============================')
  console.log(`📊 Resum: ${created} grups creats, ${errors} errors`)
}

// Executar
createFineArtsGroups().catch(console.error)