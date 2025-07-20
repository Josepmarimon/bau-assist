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

async function importStudentGroups() {
  try {
    console.log('Starting real student groups import from teaching assignments...')

    // Read both CSV files
    const dissenyPath = path.join(__dirname, '../csv/AssignacioDocent_2526_Preparacio(DISSENY).csv')
    const bellesArtsPath = path.join(__dirname, '../csv/AssignacioDocent_2526_Preparacio(BELLES ARTS).csv')

    const dissenyContent = fs.readFileSync(dissenyPath, 'utf-8')
    const bellesArtsContent = fs.readFileSync(bellesArtsPath, 'utf-8')

    // Parse CSV files
    const dissenyRecords = parse(dissenyContent, {
      columns: false,
      skip_empty_lines: true,
      from_line: 5,
      delimiter: ';',
      relax_column_count: true
    })

    const bellesArtsRecords = parse(bellesArtsContent, {
      columns: false,
      skip_empty_lines: true,
      from_line: 5,
      delimiter: ';',
      relax_column_count: true
    })

    // Combine records
    const allRecords = [...dissenyRecords, ...bellesArtsRecords]

    // Extract unique groups
    const groupsMap = new Map()
    
    for (const row of allRecords) {
      if (!row[9]) continue // Skip if no group code
      
      const groupCode = row[9]
      const courseYearStr = row[2] // e.g., "GR1", "GR2", etc.
      
      // Extract year from course string
      let year = 1
      const yearMatch = courseYearStr?.match(/GR(\d)/)
      if (yearMatch) {
        year = parseInt(yearMatch[1])
      }
      
      // Determine shift based on group code
      let shift = 'mati' // default
      if (groupCode.startsWith('T')) {
        shift = 'tarda'
      }
      
      // Create full group name
      let groupName = ''
      if (year === 1) groupName = `1r ${shift === 'mati' ? 'Matí' : 'Tarda'} ${groupCode}`
      else if (year === 2) groupName = `2n ${shift === 'mati' ? 'Matí' : 'Tarda'} ${groupCode}`
      else if (year === 3) groupName = `3r ${shift === 'mati' ? 'Matí' : 'Tarda'} ${groupCode}`
      else if (year === 4) groupName = `4t ${shift === 'mati' ? 'Matí' : 'Tarda'} ${groupCode}`
      
      if (!groupsMap.has(groupCode)) {
        groupsMap.set(groupCode, {
          name: groupName,
          year: year,
          shift: shift,
          max_students: 30 // Default capacity
        })
      }
    }

    console.log(`Found ${groupsMap.size} unique student groups`)

    // Delete existing groups to avoid duplicates
    console.log('Clearing existing student groups...')
    await supabase.from('student_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Insert groups
    const groups = Array.from(groupsMap.values())
    console.log(`Inserting ${groups.length} student groups...`)
    
    let successCount = 0
    let errorCount = 0
    
    for (const group of groups) {
      const { data, error } = await supabase
        .from('student_groups')
        .insert(group)
        .select()
        .single()

      if (error) {
        console.error(`Error inserting group ${group.name}:`, error.message)
        errorCount++
      } else {
        successCount++
      }
    }
    
    console.log(`Successfully imported ${successCount} groups, ${errorCount} errors`)

    // Log summary
    console.log('\nImport Summary:')
    console.log(`- Student groups imported: ${successCount}`)
    
    // Sample data
    console.log('\nSample groups:')
    groups.slice(0, 10).forEach(g => {
      console.log(`- ${g.name} - Year: ${g.year} - Shift: ${g.shift}`)
    })

  } catch (error) {
    console.error('Error importing student groups:', error)
  }
}

// Run the import
importStudentGroups()