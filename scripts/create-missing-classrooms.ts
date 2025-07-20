import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createMissingClassrooms() {
  console.log('🏗️ CREATING MISSING CLASSROOMS')
  console.log('==============================\n')

  const missingClassrooms = [
    {
      code: 'SALA_CAROLINES',
      name: 'Sala Carolines',
      building: 'Edifici Principal',
      floor: 0,
      capacity: 50,
      type: 'polivalent',
      equipment: ['Projector', 'Sound system'],
      is_available: true
    },
    {
      code: 'P.0.2',
      name: 'P.0.2',
      building: 'Edifici Pujades',
      floor: 0,
      capacity: 40,
      type: 'aula',
      equipment: ['Projector', 'Whiteboard'],
      is_available: true
    },
    {
      code: 'P.1.9',
      name: 'P.1.9',
      building: 'Edifici Pujades',
      floor: 1,
      capacity: 30,
      type: 'aula',
      equipment: ['Projector', 'Whiteboard'],
      is_available: true
    },
    {
      code: 'P.1.16',
      name: 'P.1.16',
      building: 'Edifici Pujades',
      floor: 1,
      capacity: 30,
      type: 'aula',
      equipment: ['Projector', 'Whiteboard'],
      is_available: true
    },
    {
      code: 'G.0.3',
      name: 'G.0.3',
      building: 'Edifici Glòries',
      floor: 0,
      capacity: 30,
      type: 'taller',
      equipment: [],
      is_available: true
    },
    {
      code: 'PORTATILS',
      name: 'Aula amb portàtils',
      building: 'Mòbil',
      floor: 0,
      capacity: 20,
      type: 'informatica',
      equipment: ['Laptops', 'Wifi'],
      is_available: true
    },
    {
      code: 'P.0.5',
      name: 'P.0.5',
      building: 'Edifici Pujades',
      floor: 0,
      capacity: 30,
      type: 'aula',
      equipment: ['Projector', 'Whiteboard'],
      is_available: true
    },
    {
      code: 'P.0.7',
      name: 'P.0.7',
      building: 'Edifici Pujades',
      floor: 0,
      capacity: 30,
      type: 'aula',
      equipment: ['Projector', 'Whiteboard'],
      is_available: true
    }
  ]

  let created = 0
  let errors = 0

  for (const classroom of missingClassrooms) {
    // Check if already exists
    const { data: existing } = await supabase
      .from('classrooms')
      .select('id')
      .eq('code', classroom.code)
      .single()

    if (existing) {
      console.log(`⏭️  Classroom ${classroom.code} already exists`)
      continue
    }

    // Create the classroom
    const { error } = await supabase
      .from('classrooms')
      .insert(classroom)

    if (error) {
      console.log(`❌ Error creating ${classroom.code}: ${error.message}`)
      errors++
    } else {
      console.log(`✅ Created classroom ${classroom.code} - ${classroom.name}`)
      created++
    }
  }

  console.log('\n📊 SUMMARY')
  console.log('===========')
  console.log(`✅ Created: ${created} classrooms`)
  console.log(`❌ Errors: ${errors}`)

  // Show total classrooms
  const { count } = await supabase
    .from('classrooms')
    .select('*', { count: 'exact', head: true })

  console.log(`\nTotal classrooms in database: ${count}`)
}

createMissingClassrooms().catch(console.error)