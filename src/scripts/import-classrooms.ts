import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as csv from 'csv-parse/sync'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.join(process.cwd(), '.env') })

// Supabase configuration
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function importClassrooms() {
  console.log('🚀 Starting classroom import...')

  try {
    // Read CSV file
    const csvPath = path.join(process.cwd(), 'csv', 'Aules-Grid view.csv')
    const fileContent = fs.readFileSync(csvPath, 'utf8')
    
    const records = csv.parse(fileContent, {
      columns: true,
      delimiter: ',',
      skip_empty_lines: true,
      bom: true
    })

    console.log(`📊 Found ${records.length} classroom records`)

    // Get building IDs
    const { data: buildings } = await supabase
      .from('buildings')
      .select('id, name')
    
    const buildingMap = new Map(
      buildings?.map(b => [b.name, b.id]) || []
    )

    // Process each classroom
    const classrooms = []
    const seenCodes = new Set<string>()
    
    for (const record of records) {
      const buildingName = record.Edifici
      const buildingId = buildingMap.get(buildingName)
      
      if (!buildingId) {
        console.warn(`⚠️ Building not found: ${buildingName}`)
        continue
      }

      // Skip duplicates
      if (seenCodes.has(record.Name)) {
        console.warn(`⚠️ Duplicate classroom code: ${record.Name}`)
        continue
      }
      seenCodes.add(record.Name)

      // Determine classroom type
      let type = 'aula'
      if (record['Tipus aula']) {
        const tipusAula = record['Tipus aula'].toLowerCase()
        if (tipusAula.includes('informàtica')) type = 'informatica'
        else if (tipusAula.includes('taller')) type = 'taller'
        else if (tipusAula.includes('projectes')) type = 'projectes'
        else if (tipusAula.includes('teòrica')) type = 'teorica'
        else if (tipusAula.includes('polivalent')) type = 'polivalent'
      }

      // Extract floor from classroom code
      let floor = 0
      const floorMatch = record.Name.match(/\.(\d)\./)
      if (floorMatch) {
        floor = parseInt(floorMatch[1])
      } else if (record.Name.includes('.E.')) {
        floor = -1 // Basement/underground
      }

      // Determine capacity based on type
      let capacity = 30
      if (type === 'taller') capacity = 20
      else if (type === 'informatica') capacity = 25
      else if (type === 'teorica') capacity = 40
      else if (type === 'polivalent') capacity = 50

      classrooms.push({
        code: record.Name,
        name: record.Name,
        building_id: buildingId,
        type: type,
        floor: floor,
        capacity: capacity,
        has_computers: type === 'informatica',
        is_available: true
      })
    }

    // Clear existing classrooms
    await supabase.from('classrooms').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Insert classrooms
    console.log(`📚 Inserting ${classrooms.length} classrooms...`)
    const { error } = await supabase
      .from('classrooms')
      .insert(classrooms)

    if (error) throw error

    console.log('✅ Classroom import completed successfully!')
    
    // Show summary by building
    const summary = new Map<string, number>()
    for (const classroom of classrooms) {
      const building = Array.from(buildingMap.entries())
        .find(([_, id]) => id === classroom.building_id)?.[0] || 'Unknown'
      summary.set(building, (summary.get(building) || 0) + 1)
    }
    
    console.log('\n📊 Summary by building:')
    summary.forEach((count, building) => {
      console.log(`  ${building}: ${count} classrooms`)
    })

  } catch (error) {
    console.error('❌ Error during import:', error)
  }
}

// Execute import
importClassrooms()