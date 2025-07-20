import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createMissingTeachers() {
  console.log('👨‍🏫 CREANT PROFESSORS QUE FALTEN')
  console.log('================================\n')
  
  const missingTeachers = [
    { name: 'Mariana Morcurill', email: 'mariana.morcurill@bau.cat', department: 'EINES' },
    { name: 'Irena Visa', email: 'irena.visa@bau.cat', department: 'EINES' },
    { name: 'María Isabel del Río Sánchez', email: 'isabel.delrio@bau.cat', department: 'EINES' },
    { name: 'Lúa Coderch', email: 'lua.coderch@bau.cat', department: 'BELLES ARTS' },
    { name: 'Michael Lawton', email: 'michael.lawton@bau.cat', department: 'BELLES ARTS' },
    // Professors addicionals que poden faltar
    { name: 'Ferran Mitjavila', email: 'ferran.mitjavila@bau.cat', department: 'EINES' },
    { name: 'Íngrid Pardo Porta', email: 'ingrid.pardo@bau.cat', department: 'EINES' },
    { name: 'Marta Malé-Alemany', email: 'marta.male@bau.cat', department: 'EINES' },
    { name: 'Rasmus Nilausen', email: 'rasmus.nilausen@bau.cat', department: 'BELLES ARTS' },
    { name: 'David Ortiz', email: 'david.ortiz@bau.cat', department: 'BELLES ARTS' },
    { name: 'Ariadna Guiteras', email: 'ariadna.guiteras@bau.cat', department: 'BELLES ARTS' },
    { name: 'Oriol Vilapuig', email: 'oriol.vilapuig@bau.cat', department: 'BELLES ARTS' },
    { name: 'Federica Matelli', email: 'federica.matelli@bau.cat', department: 'BELLES ARTS' },
    { name: 'Núria Inés Hernández', email: 'nuria.ines@bau.cat', department: 'BELLES ARTS' },
    { name: 'Jonathan Millán', email: 'jonathan.millan@bau.cat', department: 'BELLES ARTS' },
    { name: 'Ludovica Carbotta', email: 'ludovica.carbotta@bau.cat', department: 'BELLES ARTS' },
    { name: 'Julieta Dentone', email: 'julieta.dentone@bau.cat', department: 'BELLES ARTS' },
    { name: 'Mariona Moncunill', email: 'mariona.moncunill@bau.cat', department: 'BELLES ARTS' },
    { name: 'Agustín Ortiz Herrera', email: 'agustin.ortiz@bau.cat', department: 'BELLES ARTS' },
    { name: 'Regina Gimenez', email: 'regina.gimenez@bau.cat', department: 'BELLES ARTS' },
    { name: 'Pep Vidal', email: 'pep.vidal@bau.cat', department: 'BELLES ARTS' },
    { name: 'Núria Gómez Gabriel', email: 'nuria.gomez@bau.cat', department: 'BELLES ARTS' },
    { name: 'Eulàlia Rovira', email: 'eulalia.rovira@bau.cat', department: 'BELLES ARTS' },
    { name: 'Luz Broto', email: 'luz.broto@bau.cat', department: 'BELLES ARTS' },
    { name: 'Paula Bruno', email: 'paula.bruno@bau.cat', department: 'BELLES ARTS' },
    { name: 'Quim Packard', email: 'quim.packard@bau.cat', department: 'BELLES ARTS' },
    { name: 'Lara Fluxà', email: 'lara.fluxa@bau.cat', department: 'BELLES ARTS' },
    { name: 'Jaron Rowan', email: 'jaron.rowan@bau.cat', department: 'BELLES ARTS' },
    { name: 'Silvia Zayas', email: 'silvia.zayas@bau.cat', department: 'BELLES ARTS' }
  ]
  
  let created = 0
  let errors = 0
  
  for (const teacher of missingTeachers) {
    try {
      // Primer comprovar si existeix
      const { data: existing } = await supabase
        .from('teachers')
        .select('id')
        .eq('name', teacher.name)
        .single()
      
      if (existing) {
        console.log(`⏭️  Professor ja existeix: ${teacher.name}`)
        continue
      }
      
      // Crear el professor
      const { error } = await supabase
        .from('teachers')
        .insert({
          name: teacher.name,
          email: teacher.email,
          department: teacher.department,
          status: 'active'
        })
      
      if (error) {
        console.error(`❌ Error creant ${teacher.name}:`, error)
        errors++
      } else {
        console.log(`✅ Creat: ${teacher.name}`)
        created++
      }
    } catch (err) {
      console.error(`❌ Error processant ${teacher.name}:`, err)
      errors++
    }
  }
  
  console.log('\n================================')
  console.log(`📊 Resum: ${created} professors creats, ${errors} errors`)
}

// Executar
createMissingTeachers().catch(console.error)