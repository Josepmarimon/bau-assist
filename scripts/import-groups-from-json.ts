import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function importGroups() {
  console.log('🔧 IMPORTING STUDENT GROUPS FROM JSON DATA')
  console.log('==========================================\n')

  // Read the JSON data
  const jsonData = JSON.parse(
    readFileSync('/Users/josepmarimon/Documents/github/bau-assist/data/all_schedules_data.json', 'utf-8')
  )

  // Extract unique groups
  const uniqueGroups = new Set<string>()
  for (const schedule of jsonData.schedules) {
    uniqueGroups.add(schedule.group)
  }

  console.log(`Found ${uniqueGroups.size} unique groups in JSON\n`)

  // Clear existing groups
  console.log('Clearing existing student groups...')
  await supabase.from('student_groups').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // Insert groups
  const groupsToInsert = Array.from(uniqueGroups).map(groupName => {
    // Parse group name to extract details
    // Examples: "2n Gràfic Tarda (2 Gt)", "3r Audiovisual Matí (3 Am)", "1r Matí (1 M1)"
    
    let year = 1
    let shift = 'mati'
    let specialization = null
    let code = groupName

    // Extract year
    const yearMatch = groupName.match(/^(\d)[rt]/)
    if (yearMatch) {
      year = parseInt(yearMatch[1])
    }

    // Extract shift
    if (groupName.toLowerCase().includes('tarda')) {
      shift = 'tarda'
    }

    // Extract specialization
    if (groupName.includes('Gràfic')) specialization = 'grafic'
    else if (groupName.includes('Audiovisual')) specialization = 'audiovisual'
    else if (groupName.includes('Moda')) specialization = 'moda'
    else if (groupName.includes('Interiors')) specialization = 'interiors'

    // Extract code from parentheses
    const codeMatch = groupName.match(/\(([^)]+)\)/)
    if (codeMatch) {
      code = codeMatch[1]
    }

    return {
      name: groupName,
      year: year,
      shift: shift,
      max_students: 30  // Default capacity
    }
  })

  console.log('Inserting student groups...')
  const { data, error } = await supabase
    .from('student_groups')
    .insert(groupsToInsert)
    .select()

  if (error) {
    console.error('Error inserting groups:', error)
  } else {
    console.log(`✅ Successfully imported ${data?.length || 0} student groups\n`)
    console.log('Sample groups:')
    data?.slice(0, 5).forEach(g => {
      console.log(`  - ${g.name} (${g.code}) - Year ${g.year}, ${g.shift}`)
    })
  }
}

importGroups().catch(console.error)