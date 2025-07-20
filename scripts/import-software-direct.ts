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

async function importSoftware() {
  try {
    console.log('Starting direct software import...')

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

    // First, let's try to insert a simple test record
    console.log('\nTrying test insert...')
    const testData = {
      name: 'Test Software',
      category: 'general',
      license_type: 'open_source',
      operating_systems: ['Windows', 'macOS'],
      version: '1.0'
    }

    const { data: testResult, error: testError } = await supabase
      .from('software')
      .insert(testData)
      .select()

    if (testError) {
      console.error('Test insert failed:', testError.message)
      console.error('Full error:', testError)
      
      // Try without some fields
      console.log('\nTrying minimal insert...')
      const minimalData = {
        name: 'Test Software Minimal',
        category: 'general'
      }
      
      const { data: minResult, error: minError } = await supabase
        .from('software')
        .insert(minimalData)
        .select()
      
      if (minError) {
        console.error('Minimal insert also failed:', minError.message)
        console.error('The table might have different columns than expected.')
        return
      } else {
        console.log('Minimal insert worked! Result:', minResult)
        // Clean up test
        await supabase.from('software').delete().eq('name', 'Test Software Minimal')
      }
    } else {
      console.log('Test insert successful!')
      // Clean up test
      await supabase.from('software').delete().eq('name', 'Test Software')
      
      // Now import real data
      console.log('\nImporting real software data...')
      let successCount = 0
      let errorCount = 0
      
      for (const record of records) {
        if (!record.Name) continue
        
        // Determine license type
        let licenseType = 'open_source'  // Default
        if (record.Tipus) {
          if (record.Tipus.toLowerCase().includes('privatiu')) {
            licenseType = 'proprietary'
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
        if (operatingSystems.length === 0) {
          operatingSystems.push('Windows', 'macOS', 'Linux')
        }
        
        // Determine category
        let category = 'general'
        const name = record.Name.toLowerCase()
        
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
        }
        
        const softwareData = {
          name: record.Name,
          category: category,
          license_type: licenseType,
          operating_systems: operatingSystems,
          version: '2024'
        }
        
        const { error } = await supabase
          .from('software')
          .insert(softwareData)
          .select()
          .single()
        
        if (error) {
          console.error(`Error inserting ${record.Name}:`, error.message)
          errorCount++
        } else {
          console.log(`✓ Imported ${record.Name}`)
          successCount++
        }
      }
      
      console.log(`\n✅ Import completed: ${successCount} successful, ${errorCount} errors`)
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the import
importSoftware()