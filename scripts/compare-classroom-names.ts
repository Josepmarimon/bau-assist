import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'

dotenv.config()

async function compareClassroomNames() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔍 COMPARING CLASSROOM NOMENCLATURE')
  console.log('===================================\n')

  // Get classrooms from database
  const { data: dbClassrooms } = await supabase
    .from('classrooms')
    .select('code')
    .order('code')

  const dbCodes = new Set(dbClassrooms?.map(c => c.code) || [])
  
  // Get classrooms from JSON
  const jsonData = JSON.parse(
    readFileSync('/Users/josepmarimon/Documents/github/bau-assist/data/all_schedules_data.json', 'utf-8')
  )

  const jsonClassrooms = new Set<string>()
  
  for (const schedule of jsonData.schedules) {
    for (const classData of schedule.classes) {
      if (classData.classroom && classData.classroom !== null) {
        // Handle multiple classrooms separated by commas or slashes
        const classrooms = classData.classroom
          .split(/[,\/]/)
          .map((c: string) => c.trim())
          .filter((c: string) => c && !c.includes('(') && !c.includes('+'))
        
        classrooms.forEach((c: string) => jsonClassrooms.add(c))
      }
    }
  }

  console.log('📚 DATABASE CLASSROOMS (sample):')
  console.log('--------------------------------')
  Array.from(dbCodes).slice(0, 20).forEach(code => {
    console.log(`  ${code}`)
  })

  console.log('\n📄 JSON CLASSROOMS (sample):')
  console.log('----------------------------')
  Array.from(jsonClassrooms).sort().slice(0, 20).forEach(code => {
    console.log(`  ${code}`)
  })

  // Find mismatches
  console.log('\n❌ JSON CLASSROOMS NOT IN DATABASE:')
  console.log('------------------------------------')
  const notInDb = Array.from(jsonClassrooms).filter(code => !dbCodes.has(code))
  notInDb.forEach(code => {
    // Check if there's a version with dots
    const withDots = code.replace(/([A-Za-z])(\d)/, '$1.$2')
    const inDbWithDots = dbCodes.has(withDots)
    console.log(`  ${code}${inDbWithDots ? ` → ${withDots} ✓ (exists with dots)` : ' ❌'}`)
  })

  // Create mapping suggestions
  console.log('\n🔄 SUGGESTED MAPPINGS:')
  console.log('----------------------')
  const mappings: Record<string, string> = {}
  
  notInDb.forEach(jsonCode => {
    // Try different transformations
    const attempts = [
      jsonCode.replace(/([A-Za-z])(\d)/, '$1.$2'), // Add dots: P0.2 → P.0.2
      jsonCode.toUpperCase(),
      jsonCode.replace(/([A-Za-z])(\d)/, '$1.$2').toUpperCase(),
      jsonCode.replace(/\s+/g, '_'), // Spaces to underscores
    ]
    
    for (const attempt of attempts) {
      if (dbCodes.has(attempt)) {
        mappings[jsonCode] = attempt
        console.log(`  "${jsonCode}" → "${attempt}"`)
        break
      }
    }
  })

  console.log('\n📊 SUMMARY:')
  console.log('-----------')
  console.log(`Total DB classrooms: ${dbCodes.size}`)
  console.log(`Total JSON classrooms: ${jsonClassrooms.size}`)
  console.log(`Missing in DB: ${notInDb.length}`)
  console.log(`Can be mapped: ${Object.keys(mappings).length}`)
}

compareClassroomNames().catch(console.error)