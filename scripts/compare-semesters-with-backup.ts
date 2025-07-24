import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as fs from 'fs'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function compareSemestersWithBackup() {
  console.log('🔍 Comparing current semesters with backup data...\n')

  // Read backup data
  const backupPath = '/Users/josepmarimon/Documents/github/bau-assist/csv/backup_2025-07-14T11-33-04-218Z/backup_subjects.json'
  const backupData = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))
  
  // Create a map of backup subjects by code
  const backupMap = new Map()
  backupData.forEach((subject: any) => {
    backupMap.set(subject.code, subject)
  })

  // Get current subjects from database
  const { data: currentSubjects } = await supabase
    .from('subjects')
    .select('*')
    .order('code')

  if (!currentSubjects) {
    console.error('Could not fetch current subjects')
    return
  }

  // Compare and find differences
  const differences: any[] = []
  
  currentSubjects.forEach(current => {
    const backup = backupMap.get(current.code)
    
    if (backup && backup.semester !== current.semester) {
      differences.push({
        code: current.code,
        name: current.name,
        year: current.year,
        backupSemester: backup.semester,
        currentSemester: current.semester,
        itinerari: current["ID Itinerari"] || current.itinerari,
        degree: current.degree
      })
    }
  })

  console.log(`Found ${differences.length} subjects with changed semesters:\n`)

  // Group by type of change
  const firstToSecond = differences.filter(d => d.backupSemester === '1r' && d.currentSemester === '2n')
  const secondToFirst = differences.filter(d => d.backupSemester === '2n' && d.currentSemester === '1r')
  const otherChanges = differences.filter(d => 
    !(d.backupSemester === '1r' && d.currentSemester === '2n') &&
    !(d.backupSemester === '2n' && d.currentSemester === '1r')
  )

  if (firstToSecond.length > 0) {
    console.log('📝 Changed from FIRST (1r) to SECOND (2n) semester:')
    console.log('These are likely ERRORS and should be reverted:\n')
    firstToSecond.forEach(d => {
      console.log(`- ${d.code}: ${d.name}`)
      console.log(`  Year: ${d.year}, Itinerari: ${d.itinerari || 'N/A'}`)
      console.log(`  Was: ${d.backupSemester} → Now: ${d.currentSemester}`)
      console.log()
    })
  }

  if (secondToFirst.length > 0) {
    console.log('\n📝 Changed from SECOND (2n) to FIRST (1r) semester:')
    console.log('These were likely the mass changes I made and should be reverted:\n')
    secondToFirst.forEach(d => {
      console.log(`- ${d.code}: ${d.name}`)
      console.log(`  Year: ${d.year}, Itinerari: ${d.itinerari || 'N/A'}`)
      console.log(`  Was: ${d.backupSemester} → Now: ${d.currentSemester}`)
      console.log()
    })
  }

  if (otherChanges.length > 0) {
    console.log('\n📝 Other changes:')
    otherChanges.forEach(d => {
      console.log(`- ${d.code}: ${d.name}`)
      console.log(`  Was: ${d.backupSemester} → Now: ${d.currentSemester}`)
      console.log()
    })
  }

  // Save the differences to a file for reference
  fs.writeFileSync(
    '/Users/josepmarimon/Documents/github/bau-assist/semester-differences.json',
    JSON.stringify(differences, null, 2)
  )
  
  console.log(`\n💾 Saved full list to semester-differences.json`)
  
  return differences
}

compareSemestersWithBackup()