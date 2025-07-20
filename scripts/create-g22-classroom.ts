import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createG22Classroom() {
  console.log('🏫 CREANT AULA G.2.2')
  console.log('====================\n')
  
  const classroom = {
    code: 'G.2.2',
    name: 'G.2.2',
    capacity: 30,
    type: 'teorica',
    building: 'Edifici G',
    floor: 2,
    is_available: true
  }
  
  try {
    // Primer comprovar si existeix
    const { data: existingClassroom } = await supabase
      .from('classrooms')
      .select('id, code, name')
      .eq('code', classroom.code)
      .single()
    
    if (existingClassroom) {
      console.log(`⏭️  Aula ja existeix: ${classroom.code} - ${existingClassroom.name}`)
      return
    }
    
    // Crear l'aula
    const { error } = await supabase
      .from('classrooms')
      .insert(classroom)
    
    if (error) {
      console.error(`❌ Error creant ${classroom.code}:`, error)
    } else {
      console.log(`✅ Creada: ${classroom.code} - ${classroom.name}`)
      console.log(`   📍 Tipus: ${classroom.type}`)
      console.log(`   🏢 Edifici: ${classroom.building}, Planta ${classroom.floor}`)
      console.log(`   👥 Capacitat: ${classroom.capacity} persones`)
    }
  } catch (err) {
    console.error(`❌ Error processant ${classroom.code}:`, err)
  }
}

// Executar
createG22Classroom().catch(console.error)