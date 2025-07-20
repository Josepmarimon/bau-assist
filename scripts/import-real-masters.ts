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

async function importMasters() {
  try {
    console.log('Starting real masters programs import...')

    // Read CSV file
    const csvPath = path.join(__dirname, '../csv/Masters-Grid view.csv')
    const csvContent = fs.readFileSync(csvPath, 'utf-8')

    // Parse CSV
    const records = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      bom: true
    })

    console.log(`Found ${records.length} masters programs to import`)

    // Process masters programs
    const masters = []
    for (const record of records) {
      if (!record.Name) continue

      // Generate a code from the name
      let code = 'MAS'
      const nameParts = record.Name.split(' ')
      for (const part of nameParts) {
        if (part.length > 2 && !['en', 'de', 'i', 'la'].includes(part.toLowerCase())) {
          code += part.substring(0, 1).toUpperCase()
        }
      }
      
      // Make code unique by adding a number if needed
      const existingCodes: string[] = masters.map(m => m.code)
      let finalCode = code
      let counter = 1
      while (existingCodes.includes(finalCode)) {
        finalCode = `${code}${counter}`
        counter++
      }

      // Determine duration and credits based on type
      let duration = 12 // Default 1 year
      let credits = 60 // Default 60 ECTS
      
      if (record.Name.toLowerCase().includes('postgrau')) {
        duration = 6 // 6 months for postgraduate
        credits = 30 // 30 ECTS for postgraduate
      } else if (record.Name.toLowerCase().includes('universitari')) {
        duration = 12 // 1 year for university master
        credits = 60 // 60 ECTS
      }

      masters.push({
        code: finalCode,
        name: record.Name,
        coordinator_name: record['Coordinador/a']?.trim() || null,
        coordinator_email: record['Email del coordinador']?.trim() || null,
        duration_months: duration,
        credits: credits
      })
    }

    // Insert masters programs (if table exists)
    console.log(`Attempting to insert ${masters.length} masters programs...`)
    
    let successCount = 0
    let errorCount = 0
    
    for (const master of masters) {
      const { data, error } = await supabase
        .from('masters_programs')
        .insert(master)
        .select()
        .single()

      if (error) {
        if (error.code === 'PGRST204' || (error.message && error.message.includes('schema'))) {
          console.log('Masters programs table does not exist yet. Migration needs to be applied.')
          break
        }
        console.error(`Error inserting master ${master.name}:`, error.message || error)
        errorCount++
      } else {
        successCount++
      }
    }
    
    if (successCount > 0 || errorCount > 0) {
      console.log(`Successfully imported ${successCount} masters programs, ${errorCount} errors`)
    }

    // Log summary
    console.log('\nImport Summary:')
    console.log(`- Masters programs processed: ${masters.length}`)
    
    // Sample data
    console.log('\nSample masters programs:')
    masters.slice(0, 5).forEach(m => {
      console.log(`- ${m.name} (${m.code}) - ${m.credits} ECTS - Coordinator: ${m.coordinator_name || 'TBD'}`)
    })

    // Save to JSON for reference
    const jsonPath = path.join(__dirname, '../data/masters-programs.json')
    fs.mkdirSync(path.dirname(jsonPath), { recursive: true })
    fs.writeFileSync(jsonPath, JSON.stringify(masters, null, 2))
    console.log(`\nSaved masters data to ${jsonPath}`)

  } catch (error) {
    console.error('Error importing masters programs:', error)
  }
}

// Run the import
importMasters()