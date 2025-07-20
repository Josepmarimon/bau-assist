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

async function importSoftware() {
  console.log('🚀 Starting software import...')

  try {
    // Read CSV file
    const csvPath = path.join(process.cwd(), 'csv', 'Software-Grid view.csv')
    const fileContent = fs.readFileSync(csvPath, 'utf8')
    
    const records = csv.parse(fileContent, {
      columns: true,
      delimiter: ',',
      skip_empty_lines: true,
      bom: true
    })

    console.log(`📊 Found ${records.length} software records`)

    // Process each software
    const softwareList = []
    const subjectRequirements = []
    
    for (const record of records) {
      const name = record.Name?.trim()
      if (!name) continue

      // Determine software type
      const type = record.Tipus?.toLowerCase() === 'opensource' ? 'opensource' : 'privatiu'
      
      // Parse operating systems
      let operatingSystems: string[] = []
      if (record['Sistema operatiu']) {
        operatingSystems = record['Sistema operatiu']
          .split(',')
          .map((os: string) => os.trim())
          .filter((os: string) => os !== '')
      }

      // Determine category
      let category = 'general'
      if (name.toLowerCase().includes('adobe')) category = 'disseny'
      else if (name.toLowerCase().includes('3d') || name.toLowerCase().includes('rhino') || 
               name.toLowerCase().includes('cinema') || name.toLowerCase().includes('blender')) category = '3d'
      else if (name.toLowerCase().includes('cad')) category = 'cad'
      else if (name.toLowerCase().includes('render')) category = 'render'
      else if (name.toLowerCase().includes('clo') || name.toLowerCase().includes('gerber')) category = 'moda'
      
      softwareList.push({
        name: name,
        type: type,
        operating_systems: operatingSystems,
        category: category,
        license_cost: type === 'privatiu' ? 500 : 0, // Default cost for proprietary
        max_installations: 30 // Default
      })
    }

    // Clear existing software
    await supabase.from('software').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Insert software
    console.log(`💾 Inserting ${softwareList.length} software entries...`)
    const { data: insertedSoftware, error } = await supabase
      .from('software')
      .insert(softwareList)
      .select()

    if (error) throw error

    // Now process subject requirements from the CSV
    console.log('🔗 Processing subject-software requirements...')
    
    // Get all subjects for mapping
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, name')
    
    const subjectMap = new Map(
      subjects?.map(s => [s.name, s.id]) || []
    )

    // Create software map
    const softwareMap = new Map(
      insertedSoftware?.map(s => [s.name, s.id]) || []
    )

    // Process requirements from CSV
    for (const record of records) {
      const softwareName = record.Name?.trim()
      const softwareId = softwareMap.get(softwareName)
      
      if (!softwareId) continue

      // Parse subject names from the Assignatures column
      const assignatures = record['Assignatures (from Perfil tècnic)']
      if (assignatures) {
        const subjectNames = assignatures
          .split(',')
          .map((s: string) => s.trim())
          .filter((s: string) => s !== '')

        for (const subjectName of subjectNames) {
          // Try to find exact match first
          let subjectId = subjectMap.get(subjectName)
          
          // If not found, try partial match
          if (!subjectId) {
            for (const [name, id] of subjectMap.entries()) {
              if (name.toLowerCase().includes(subjectName.toLowerCase()) ||
                  subjectName.toLowerCase().includes(name.toLowerCase())) {
                subjectId = id
                break
              }
            }
          }

          if (subjectId) {
            subjectRequirements.push({
              subject_id: subjectId,
              software_id: softwareId,
              is_mandatory: true
            })
          } else {
            console.warn(`⚠️ Subject not found: ${subjectName}`)
          }
        }
      }
    }

    // Remove duplicates
    const uniqueRequirements = Array.from(
      new Map(
        subjectRequirements.map(r => [`${r.subject_id}-${r.software_id}`, r])
      ).values()
    )

    // Insert subject requirements
    if (uniqueRequirements.length > 0) {
      console.log(`📚 Inserting ${uniqueRequirements.length} subject-software requirements...`)
      const { error: reqError } = await supabase
        .from('subject_software_requirements')
        .insert(uniqueRequirements)

      if (reqError) throw reqError
    }

    console.log('✅ Software import completed successfully!')
    
    // Show summary
    console.log('\n📊 Summary:')
    console.log(`  Total software: ${softwareList.length}`)
    console.log(`  Open source: ${softwareList.filter(s => s.type === 'opensource').length}`)
    console.log(`  Proprietary: ${softwareList.filter(s => s.type === 'privatiu').length}`)
    console.log(`  Subject requirements: ${uniqueRequirements.length}`)

  } catch (error) {
    console.error('❌ Error during import:', error)
  }
}

// Execute import
importSoftware()