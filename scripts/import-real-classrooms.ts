import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse/sync'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface ClassroomData {
  name: string
  building: string
  type: string
  subjects: string[]
  masters: string[]
}

async function importClassrooms() {
  try {
    console.log('Starting real classrooms import...')

    // Read CSV file
    const csvPath = path.join(__dirname, '../csv/Aules-Grid view.csv')
    const csvContent = fs.readFileSync(csvPath, 'utf-8')

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      bom: true
    })

    console.log(`Found ${records.length} classrooms to import`)

    // Buildings are stored as strings in the classrooms table

    // Delete existing classrooms to avoid duplicates
    console.log('Clearing existing classrooms...')
    await supabase.from('classrooms').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Process classrooms
    const classrooms = []
    for (const record of records) {
      if (!record.Name) continue

      const building = record.Edifici || 'Unknown'

      // Determine classroom type - must match CHECK constraint: 'teoria', 'taller', 'informatica', 'polivalent', 'projectes', 'seminari'
      let type = 'polivalent' // default
      if (record['Tipus aula']) {
        const tipusAula = record['Tipus aula'].toLowerCase()
        if (tipusAula.includes('taller')) type = 'taller'
        else if (tipusAula.includes('teòrica') || tipusAula.includes('teorica')) type = 'teoria'
        else if (tipusAula.includes('projectes')) type = 'projectes'
        else if (tipusAula.includes('seminari')) type = 'seminari'
        else if (tipusAula.includes('polivalent')) type = 'polivalent'
      }
      
      // Special cases based on room name
      if (record.Name.toLowerCase().includes('taller')) type = 'taller'
      if (record.Name.includes('G.2.1') && record.Assignatures?.includes('Eines Informàtiques')) type = 'informatica'

      // Parse capacity from name if possible
      let capacity = 30 // default
      const nameMatch = record.Name.match(/\d+/)
      if (nameMatch) {
        const num = parseInt(nameMatch[0])
        if (num < 10) {
          // Likely a room number, use default capacity based on type
          capacity = type === 'teoria' ? 60 : 30
        }
      }

      // Create equipment array based on type and name
      const equipment = []
      if (record.Name.toLowerCase().includes('taller')) {
        equipment.push('Work tables', 'Tool storage')
      }
      if (record.Name.toLowerCase().includes('escultura')) {
        equipment.push('Sculpture tools', 'Clay workspace')
      }
      if (record.Name.toLowerCase().includes('ceramica') || record.Name.toLowerCase().includes('ceràmica')) {
        equipment.push('Pottery wheels', 'Kiln')
      }
      if (record.Name.toLowerCase().includes('metall')) {
        equipment.push('Metalworking tools', 'Welding equipment')
      }
      if (record.Name.toLowerCase().includes('plató')) {
        equipment.push('Photography lights', 'Green screen', 'Camera equipment')
      }
      if (record.Name.toLowerCase().includes('audio')) {
        equipment.push('Recording equipment', 'Mixing console', 'Acoustic treatment')
      }
      if (type === 'teoria' || type === 'polivalent') {
        equipment.push('Projector', 'Whiteboard', 'Speakers')
      }

      // Extract floor from room name (e.g., G.0.1 -> floor 0, L.1.2 -> floor 1)
      let floor = 0
      const floorMatch = record.Name.match(/\.(\d)\./)
      if (floorMatch) {
        floor = parseInt(floorMatch[1])
      }

      classrooms.push({
        name: record.Name,
        code: record.Name.replace(/\s+/g, '_').replace(/[,]/g, '').toUpperCase(),
        building: building,
        floor: floor,
        capacity: capacity,
        type: type,
        equipment: equipment,
        is_available: true
      })
    }

    // Insert classrooms one by one to identify issues
    console.log(`Inserting ${classrooms.length} classrooms...`)
    let successCount = 0
    let errorCount = 0
    
    for (const classroom of classrooms) {
      const { data, error } = await supabase
        .from('classrooms')
        .insert(classroom)
        .select()
        .single()

      if (error) {
        console.error(`Error inserting classroom ${classroom.name}:`, error.message)
        errorCount++
        // Log the first few errors in detail
        if (errorCount <= 3) {
          console.error('Classroom data:', classroom)
        }
      } else {
        successCount++
      }
    }
    
    console.log(`Successfully imported ${successCount} classrooms, ${errorCount} errors`)

    // Log summary
    console.log('\nImport Summary:')
    console.log(`- Classrooms imported: ${classrooms.length}`)
    
    // Sample data
    console.log('\nSample classrooms:')
    classrooms.slice(0, 5).forEach(c => {
      console.log(`- ${c.name} (${c.code}) - ${c.type} - Capacity: ${c.capacity}`)
    })

  } catch (error) {
    console.error('Error importing classrooms:', error)
  }
}

// Run the import
importClassrooms()