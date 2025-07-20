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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: {
    schema: 'public'
  },
  auth: {
    persistSession: false
  }
})

async function importSoftware() {
  try {
    console.log('Starting real software import...')

    // Read CSV file
    const csvPath = path.join(__dirname, '../csv/Software-Grid view.csv')
    const csvContent = fs.readFileSync(csvPath, 'utf-8')

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      bom: true
    })

    console.log(`Found ${records.length} software items to import`)

    // Check existing software to avoid duplicates
    console.log('Checking existing software...')
    const { data: existingSoftware } = await supabase
      .from('software')
      .select('name')
    
    const existingNames = new Set(existingSoftware?.map(s => s.name) || [])

    // Process software
    const software = []
    for (const record of records) {
      if (!record.Name) continue
      
      // Skip if already exists
      if (existingNames.has(record.Name)) {
        console.log(`Skipping ${record.Name} - already exists`)
        continue
      }

      // Determine license type
      let licenseType = 'Gratuït'  // Default
      if (record.Tipus) {
        if (record.Tipus.toLowerCase().includes('privatiu')) {
          licenseType = 'Subscripció'
        } else if (record.Tipus.toLowerCase().includes('opensource')) {
          licenseType = 'Gratuït'
        }
      }

      // Parse operating systems
      const operatingSystems = []
      if (record['Sistema operatiu']) {
        const os = record['Sistema operatiu']
        if (os.toLowerCase().includes('osx') || os.toLowerCase().includes('mac')) {
          operatingSystems.push('macOS')
        }
        if (os.toLowerCase().includes('windows')) {
          operatingSystems.push('Windows')
        }
        if (os.toLowerCase().includes('linux')) {
          operatingSystems.push('Linux')
        }
      }
      
      // If no OS specified, assume it works on all
      if (operatingSystems.length === 0 && record.Name) {
        operatingSystems.push('Windows', 'macOS', 'Linux')
      }

      // Determine category based on name and associated subjects
      let category = 'general'
      const name = record.Name.toLowerCase()
      const subjects = record['Assignatures (from Perfil tècnic)'] || ''
      
      if (name.includes('adobe') || name.includes('photoshop') || name.includes('illustrator')) {
        category = 'design'
      } else if (name.includes('3d') || name.includes('blender') || name.includes('rhino') || 
                 name.includes('cinema') || name.includes('maya') || name.includes('max')) {
        category = '3d_modeling'
      } else if (name.includes('audio') || name.includes('audacity')) {
        category = 'audio'
      } else if (name.includes('video') || name.includes('premiere') || name.includes('after')) {
        category = 'video'
      } else if (name.includes('cad') || name.includes('autocad') || name.includes('freecad')) {
        category = 'cad'
      } else if (name.includes('arduino') || name.includes('processing')) {
        category = 'programming'
      } else if (subjects.toLowerCase().includes('web')) {
        category = 'web_development'
      }

      // Extract vendor from name if possible
      let vendor = 'Desconegut'
      const softwareName = record.Name
      if (softwareName.includes('Adobe')) vendor = 'Adobe'
      else if (softwareName.includes('Microsoft') || softwareName.includes('Teams')) vendor = 'Microsoft'
      else if (softwareName.includes('Autodesk') || softwareName.includes('Autocad') || softwareName.includes('3D MAX')) vendor = 'Autodesk'
      else if (softwareName.includes('Rhino')) vendor = 'McNeel'
      else if (softwareName.includes('Cinema 4D')) vendor = 'Maxon'
      else if (softwareName.includes('Figma')) vendor = 'Figma'
      else if (softwareName.includes('Gerber')) vendor = 'Gerber Technology'
      else if (softwareName.includes('Clo 3D')) vendor = 'CLO Virtual Fashion'
      else if (softwareName.includes('Blender')) vendor = 'Blender Foundation'
      else if (licenseType === 'Gratuït') vendor = 'Open Source'

      software.push({
        name: record.Name,
        category: category,
        license_type: licenseType === 'Subscripció' ? 'proprietary' : 'open_source',
        operating_systems: operatingSystems,
        version: '2024'  // Default version since not specified in CSV
      })
    }

    // Insert software
    console.log(`Inserting ${software.length} software items...`)
    let successCount = 0
    let errorCount = 0
    
    for (const item of software) {
      const { data, error } = await supabase
        .from('software')
        .insert(item)
        .select()
        .single()

      if (error) {
        console.error(`Error inserting software ${item.name}:`, error.message)
        errorCount++
      } else {
        successCount++
      }
    }
    
    console.log(`Successfully imported ${successCount} software items, ${errorCount} errors`)

    // Log summary
    console.log('\nImport Summary:')
    console.log(`- Software items imported: ${successCount}`)
    
    // Sample data
    console.log('\nSample software:')
    software.slice(0, 5).forEach(s => {
      console.log(`- ${s.name} - ${s.category} - ${s.license_type} - OS: ${s.operating_systems.join(', ')}`)
    })

  } catch (error) {
    console.error('Error importing software:', error)
  }
}

// Run the import
importSoftware()