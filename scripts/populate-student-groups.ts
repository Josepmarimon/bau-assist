import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function populateStudentGroups() {
  console.log('🚀 Starting to populate student groups...')

  // Define all student groups based on the pattern from subject_groups
  const studentGroups = [
    // First year - Design
    { name: 'GR1-M1', year: 1, shift: 'mati', max_students: 30 },
    { name: 'GR1-M2', year: 1, shift: 'mati', max_students: 30 },
    { name: 'GR1-M3', year: 1, shift: 'mati', max_students: 30 },
    { name: 'GR1-M4', year: 1, shift: 'mati', max_students: 30 },
    { name: 'GR1-M5', year: 1, shift: 'mati', max_students: 30 },
    { name: 'GR1-T1', year: 1, shift: 'tarda', max_students: 30 },
    { name: 'GR1-T2', year: 1, shift: 'tarda', max_students: 30 },
    
    // First year - Fine Arts
    { name: 'GB1-M1', year: 1, shift: 'mati', max_students: 30 },
    { name: 'GB1-T1', year: 1, shift: 'tarda', max_students: 30 },
    
    // Second year - Design
    { name: 'GR2-M1', year: 2, shift: 'mati', max_students: 30 },
    { name: 'GR2-M2', year: 2, shift: 'mati', max_students: 30 },
    { name: 'GR2-M3', year: 2, shift: 'mati', max_students: 30 },
    { name: 'GR2-M4', year: 2, shift: 'mati', max_students: 30 },
    { name: 'GR2-M5', year: 2, shift: 'mati', max_students: 30 },
    { name: 'GR2-T1', year: 2, shift: 'tarda', max_students: 30 },
    { name: 'GR2-T2', year: 2, shift: 'tarda', max_students: 30 },
    
    // Second year - Fine Arts
    { name: 'GB2-M1', year: 2, shift: 'mati', max_students: 30 },
    { name: 'GB2-T1', year: 2, shift: 'tarda', max_students: 30 },
    
    // Third year - Design (only itineraris)
    { name: 'GR3-Am', year: 3, shift: 'mati', max_students: 20, itinerari: 'Audiovisual' },
    { name: 'GR3-At', year: 3, shift: 'tarda', max_students: 20, itinerari: 'Audiovisual' },
    { name: 'GR3-Gm1', year: 3, shift: 'mati', max_students: 20, itinerari: 'Gràfic' },
    { name: 'GR3-Gm2', year: 3, shift: 'mati', max_students: 20, itinerari: 'Gràfic' },
    { name: 'GR3-Gt', year: 3, shift: 'tarda', max_students: 20, itinerari: 'Gràfic' },
    { name: 'GR3-Im', year: 3, shift: 'mati', max_students: 20, itinerari: 'Interiors' },
    { name: 'GR3-It', year: 3, shift: 'tarda', max_students: 20, itinerari: 'Interiors' },
    { name: 'GR3-Mm', year: 3, shift: 'mati', max_students: 20, itinerari: 'Moda' },
    { name: 'GR3-Mt', year: 3, shift: 'tarda', max_students: 20, itinerari: 'Moda' },
    
    // Third year - Fine Arts
    { name: 'GB3-M1', year: 3, shift: 'mati', max_students: 30 },
    { name: 'GB3-T1', year: 3, shift: 'tarda', max_students: 30 },
    
    // Fourth year - Design (only itineraris)
    { name: 'GR4-Am', year: 4, shift: 'mati', max_students: 20, itinerari: 'Audiovisual' },
    { name: 'GR4-At', year: 4, shift: 'tarda', max_students: 20, itinerari: 'Audiovisual' },
    { name: 'GR4-Gm1', year: 4, shift: 'mati', max_students: 20, itinerari: 'Gràfic' },
    { name: 'GR4-Gm2', year: 4, shift: 'mati', max_students: 20, itinerari: 'Gràfic' },
    { name: 'GR4-Gt', year: 4, shift: 'tarda', max_students: 20, itinerari: 'Gràfic' },
    { name: 'GR4-Im', year: 4, shift: 'mati', max_students: 20, itinerari: 'Interiors' },
    { name: 'GR4-It', year: 4, shift: 'tarda', max_students: 20, itinerari: 'Interiors' },
    { name: 'GR4-Mm', year: 4, shift: 'mati', max_students: 20, itinerari: 'Moda' },
    { name: 'GR4-Mt', year: 4, shift: 'tarda', max_students: 20, itinerari: 'Moda' },
    
    // Fourth year - Fine Arts
    { name: 'GB4-M1', year: 4, shift: 'mati', max_students: 30 },
    { name: 'GB4-T1', year: 4, shift: 'tarda', max_students: 30 },
  ]

  // First, check if groups already exist
  const { data: existingGroups } = await supabase
    .from('student_groups')
    .select('name')
  
  const existingNames = new Set(existingGroups?.map(g => g.name) || [])
  
  // Insert all groups
  for (const group of studentGroups) {
    if (existingNames.has(group.name)) {
      console.log(`⏭️  Group ${group.name} already exists, skipping...`)
      continue
    }
    
    const { error } = await supabase
      .from('student_groups')
      .insert({
        name: group.name,
        year: group.year,
        shift: group.shift,
        max_students: group.max_students,
        code: group.name,
        itinerari: group.itinerari || null
      })

    if (error) {
      console.error(`❌ Error inserting group ${group.name}:`, error)
    } else {
      console.log(`✅ Inserted group ${group.name}`)
    }
  }

  console.log('✨ Finished populating student groups!')
}

populateStudentGroups().catch(console.error)