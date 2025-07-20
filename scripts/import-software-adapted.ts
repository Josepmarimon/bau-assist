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
    console.log('Starting adapted software import...')
    console.log('This version adapts to the actual table structure\n')

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

    // Process and import software
    let successCount = 0
    let errorCount = 0
    const errors = new Set<string>()

    for (const record of records) {
      if (!record.Name) continue

      // Try to determine the 'type' value that the constraint expects
      // Based on the page mock data, it seems to use different fields
      const softwareData: any = {
        name: record.Name,
        version: '2024',
        vendor: 'Unknown',
        category: 'General',
        license_type: record.Tipus?.toLowerCase().includes('privatiu') ? 'Subscripció' : 'Gratuït',
        license_count: record.Tipus?.toLowerCase().includes('privatiu') ? 30 : -1,
        licenses_used: 0,
        status: 'active',
        created_at: new Date().toISOString()
      }

      // Set vendor based on name
      const name = record.Name
      if (name.includes('Adobe')) softwareData.vendor = 'Adobe'
      else if (name.includes('Microsoft') || name.includes('Teams')) softwareData.vendor = 'Microsoft'
      else if (name.includes('Autodesk') || name.includes('Autocad') || name.includes('3D MAX')) softwareData.vendor = 'Autodesk'
      else if (name.includes('Rhino')) softwareData.vendor = 'McNeel'
      else if (name.includes('Cinema 4D')) softwareData.vendor = 'Maxon'
      else if (record.Tipus?.toLowerCase().includes('opensource')) softwareData.vendor = 'Open Source'

      // Set category
      const nameLower = name.toLowerCase()
      if (nameLower.includes('adobe') || nameLower.includes('photoshop')) {
        softwareData.category = 'Disseny'
      } else if (nameLower.includes('3d') || nameLower.includes('blender') || nameLower.includes('rhino')) {
        softwareData.category = '3D'
      } else if (nameLower.includes('audio') || nameLower.includes('audacity')) {
        softwareData.category = 'Àudio'
      } else if (nameLower.includes('cad') || nameLower.includes('autocad')) {
        softwareData.category = 'CAD'
      } else if (nameLower.includes('office') || nameLower.includes('teams')) {
        softwareData.category = 'Productivitat'
      } else if (nameLower.includes('arduino') || nameLower.includes('processing')) {
        softwareData.category = 'Desenvolupament'
      }

      // Try different combinations to find what works
      const attempts = [
        softwareData,
        { ...softwareData, type: 'software' },
        { ...softwareData, type: 'application' },
        { name: record.Name, type: 'software', category: softwareData.category },
        { name: record.Name, type: 'Productivitat' }, // maybe type is actually category?
      ]

      let inserted = false
      for (const attempt of attempts) {
        const { error } = await supabase
          .from('software')
          .insert(attempt)
          .select()
          .single()

        if (!error) {
          console.log(`✓ Imported ${record.Name}`)
          successCount++
          inserted = true
          break
        } else {
          errors.add(error.message)
        }
      }

      if (!inserted) {
        console.log(`✗ Failed to import ${record.Name}`)
        errorCount++
      }
    }

    console.log(`\n✅ Import completed: ${successCount} successful, ${errorCount} errors`)
    
    if (errors.size > 0) {
      console.log('\nUnique errors encountered:')
      errors.forEach(err => console.log(`  - ${err}`))
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the import
importSoftware()