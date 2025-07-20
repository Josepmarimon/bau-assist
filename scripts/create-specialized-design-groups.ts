import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createSpecializedDesignGroups() {
  console.log('🎨 CREANT GRUPS ESPECIALITZATS DE DISSENY')
  console.log('=========================================\n')
  
  const specializedGroups = [
    // 3r curs - Gràfic i Comunicació Visual
    { name: '3r Matí Gm1', year: 3, shift: 'mati', max_students: 30 },
    { name: '3r Matí Gm2', year: 3, shift: 'mati', max_students: 30 },
    { name: '3r Tarda Gt', year: 3, shift: 'tarda', max_students: 30 },
    
    // 3r curs - Audiovisual
    { name: '3r Matí Am', year: 3, shift: 'mati', max_students: 30 },
    { name: '3r Tarda At', year: 3, shift: 'tarda', max_students: 30 },
    
    // 3r curs - Moda
    { name: '3r Matí Mm', year: 3, shift: 'mati', max_students: 30 },
    { name: '3r Tarda Mt', year: 3, shift: 'tarda', max_students: 30 },
    
    // 3r curs - Interiors
    { name: '3r Matí Im', year: 3, shift: 'mati', max_students: 30 },
    { name: '3r Tarda It', year: 3, shift: 'tarda', max_students: 30 },
    
    // 4t curs - Gràfic i Comunicació Visual
    { name: '4t Matí Gm1', year: 4, shift: 'mati', max_students: 30 },
    { name: '4t Matí Gm2', year: 4, shift: 'mati', max_students: 30 },
    { name: '4t Tarda Gt', year: 4, shift: 'tarda', max_students: 30 },
    
    // 4t curs - Audiovisual
    { name: '4t Matí Am', year: 4, shift: 'mati', max_students: 30 },
    { name: '4t Tarda At', year: 4, shift: 'tarda', max_students: 30 },
    
    // 4t curs - Moda
    { name: '4t Matí Mm', year: 4, shift: 'mati', max_students: 30 },
    { name: '4t Tarda Mt', year: 4, shift: 'tarda', max_students: 30 },
    
    // 4t curs - Interiors
    { name: '4t Matí Im', year: 4, shift: 'mati', max_students: 30 },
    
    // 2n curs - Groups especialitzats que també falten
    { name: '2n Matí Gm1', year: 2, shift: 'mati', max_students: 30 },
    { name: '2n Matí Gm2', year: 2, shift: 'mati', max_students: 30 },
    { name: '2n Tarda Gt', year: 2, shift: 'tarda', max_students: 30 },
    { name: '2n Matí Am', year: 2, shift: 'mati', max_students: 30 },
    { name: '2n Matí Mm', year: 2, shift: 'mati', max_students: 30 },
    { name: '2n Tarda Mt', year: 2, shift: 'tarda', max_students: 30 },
    { name: '2n Matí Im', year: 2, shift: 'mati', max_students: 30 },
    { name: '2n Tarda It', year: 2, shift: 'tarda', max_students: 30 }
  ]
  
  let created = 0
  let errors = 0
  
  for (const group of specializedGroups) {
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
  
  console.log('\n=========================================')
  console.log(`📊 Resum: ${created} grups creats, ${errors} errors`)
}

// Executar
createSpecializedDesignGroups().catch(console.error)