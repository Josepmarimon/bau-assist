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

async function add2ndYearSpecializedGroups() {
  console.log('🚀 Checking for 2nd year specialized groups...')

  // Define 2nd year specialized groups based on subject_groups data
  const specializedGroups2ndYear = [
    // Audiovisual
    { name: 'GR2-Am', year: 2, shift: 'mati', max_students: 25, itinerari: 'Audiovisual' },
    { name: 'GR2-At', year: 2, shift: 'tarda', max_students: 25, itinerari: 'Audiovisual' },
    
    // Gràfic
    { name: 'GR2-Gm1', year: 2, shift: 'mati', max_students: 25, itinerari: 'Gràfic' },
    { name: 'GR2-Gm2', year: 2, shift: 'mati', max_students: 25, itinerari: 'Gràfic' },
    { name: 'GR2-Gt', year: 2, shift: 'tarda', max_students: 25, itinerari: 'Gràfic' },
    
    // Interiors
    { name: 'GR2-Im', year: 2, shift: 'mati', max_students: 25, itinerari: 'Interiors' },
    { name: 'GR2-It', year: 2, shift: 'tarda', max_students: 25, itinerari: 'Interiors' },
    
    // Moda
    { name: 'GR2-Mm', year: 2, shift: 'mati', max_students: 25, itinerari: 'Moda' },
    { name: 'GR2-Mt', year: 2, shift: 'tarda', max_students: 25, itinerari: 'Moda' },
  ]

  try {
    // Check which groups already exist
    const { data: existingGroups } = await supabase
      .from('student_groups')
      .select('name')
      .in('name', specializedGroups2ndYear.map(g => g.name))
    
    const existingNames = new Set(existingGroups?.map(g => g.name) || [])
    
    // Filter out groups that already exist
    const groupsToAdd = specializedGroups2ndYear.filter(g => !existingNames.has(g.name))
    
    if (groupsToAdd.length === 0) {
      console.log('✅ All 2nd year specialized groups already exist')
      return
    }

    console.log(`📝 Adding ${groupsToAdd.length} new 2nd year specialized groups...`)
    
    // Insert the new groups
    for (const group of groupsToAdd) {
      const { error } = await supabase
        .from('student_groups')
        .insert({
          name: group.name,
          code: group.name,
          year: group.year,
          shift: group.shift,
          max_students: group.max_students,
          itinerari: group.itinerari
        })

      if (error) {
        console.error(`❌ Error inserting group ${group.name}:`, error)
      } else {
        console.log(`✅ Added group ${group.name} (${group.itinerari})`)
      }
    }

    console.log('✨ Finished adding 2nd year specialized groups!')
    
  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

add2ndYearSpecializedGroups()