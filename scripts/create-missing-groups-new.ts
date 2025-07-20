import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const missingGroups = [
  // 2n Tarda
  { name: '2n Tarda T1', year: 2, shift: 'tarda', max_students: 30 },
  { name: '2n Tarda T2', year: 2, shift: 'tarda', max_students: 30 },
  // Mencions 2n
  { name: '2n Matí Gm1', year: 2, shift: 'mati', max_students: 30 },
  { name: '2n Matí Gm2', year: 2, shift: 'mati', max_students: 30 },
  // Mencions 3r
  { name: '3r Matí Gm2', year: 3, shift: 'mati', max_students: 30 },
  // Mencions 4t
  { name: '4t Matí Gm2', year: 4, shift: 'mati', max_students: 30 },
]

async function createGroups() {
  console.log('🚀 Creant grups que falten...')
  
  for (const group of missingGroups) {
    try {
      // Check if group exists
      const { data: existing } = await supabase
        .from('student_groups')
        .select('id')
        .eq('name', group.name)
        .single()
      
      if (existing) {
        console.log(`✅ Grup ${group.name} ja existeix`)
        continue
      }
      
      // Create group
      const { data, error } = await supabase
        .from('student_groups')
        .insert(group)
        .select()
        .single()
      
      if (error) {
        console.error(`❌ Error creant ${group.name}:`, error)
      } else {
        console.log(`✅ Creat grup ${group.name}`)
      }
    } catch (error) {
      console.error(`❌ Error processant ${group.name}:`, error)
    }
  }
  
  console.log('\n✅ Procés completat!')
}

createGroups().catch(console.error)