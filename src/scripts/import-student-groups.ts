import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
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

async function importStudentGroups() {
  console.log('🚀 Starting student groups import...')

  try {
    // Read CSV file
    const csvPath = path.join(process.cwd(), 'csv', 'AssignacioDocent_2526_Preparacio(DISSENY).csv')
    const fileContent = fs.readFileSync(csvPath, 'latin1')
    
    const lines = fileContent.split('\n').slice(3)
    
    // Collect all unique groups by year
    const groupsByYear = new Map<number, Set<string>>()
    
    lines.forEach((line) => {
      if (!line.trim()) return
      
      const fields = line.split(';')
      const curs = fields[2]?.trim() // GR1, GR2, etc.
      const grup = fields[9]?.trim() // M1, M2, etc.
      
      if (curs && grup && grup !== 'Grup' && curs.startsWith('GR')) {
        const year = parseInt(curs.replace('GR', ''))
        if (!groupsByYear.has(year)) {
          groupsByYear.set(year, new Set<string>())
        }
        groupsByYear.get(year)!.add(grup)
      }
    })

    // Create student groups
    const studentGroups: any[] = []
    
    groupsByYear.forEach((groups, year) => {
      groups.forEach(groupCode => {
        // Determine shift (morning/afternoon)
        let shift = 'mati'
        if (groupCode.toLowerCase().includes('t') && !groupCode.toLowerCase().includes('m')) {
          shift = 'tarda'
        }
        
        // Determine capacity based on type
        let capacity = 25
        if (groupCode === 'M1' || groupCode === 'M2' || groupCode === 'M3' || 
            groupCode === 'M4' || groupCode === 'M5' || groupCode === 'T1' || groupCode === 'T2') {
          capacity = 30 // Main groups
        } else {
          capacity = 20 // Specialized groups
        }
        
        // Create descriptive name
        let name = `${year}r ${groupCode}`
        let specialization = ''
        
        if (groupCode.startsWith('A')) specialization = 'Audiovisual'
        else if (groupCode.startsWith('G')) specialization = 'Gràfic'
        else if (groupCode.startsWith('I')) specialization = 'Interiors'
        else if (groupCode.startsWith('M') && groupCode.length > 2) specialization = 'Moda'
        
        if (specialization) {
          name = `${year}r ${specialization} ${groupCode}`
        } else if (groupCode.startsWith('M') && groupCode.length === 2) {
          name = `${year}r Matí ${groupCode}`
        } else if (groupCode.startsWith('T')) {
          name = `${year}r Tarda ${groupCode}`
        }
        
        studentGroups.push({
          name: name,
          year: year,
          shift: shift,
          max_students: capacity
        })
      })
    })

    // Sort groups for better display
    studentGroups.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year
      return a.name.localeCompare(b.name)
    })

    // Clear existing groups
    await supabase.from('student_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Insert student groups
    console.log(`👨‍🎓 Inserting ${studentGroups.length} student groups...`)
    const { error } = await supabase
      .from('student_groups')
      .insert(studentGroups)

    if (error) throw error

    console.log('✅ Student groups import completed successfully!')
    
    // Show summary by year
    console.log('\n📊 Summary by year:')
    groupsByYear.forEach((groups, year) => {
      console.log(`  Year ${year}: ${groups.size} groups (${Array.from(groups).sort().join(', ')})`)
    })

  } catch (error) {
    console.error('❌ Error during import:', error)
  }
}

// Execute import
importStudentGroups()