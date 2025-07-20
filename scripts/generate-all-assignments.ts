import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'

// Read both CSV files
const dissenyPath = path.join(__dirname, '../csv/AssignacioDocent_2526_Preparacio(DISSENY).csv')
const bellesArtsPath = path.join(__dirname, '../csv/AssignacioDocent_2526_Preparacio(BELLES ARTS).csv')

let allAssignments = []
let id = 1

// Process Disseny CSV
if (fs.existsSync(dissenyPath)) {
  const dissenyContent = fs.readFileSync(dissenyPath, 'utf-8')
  const dissenyRecords = parse(dissenyContent, {
    columns: false,
    skip_empty_lines: true,
    from_line: 5,
    delimiter: ';',
    relax_column_count: true
  })
  
  for (const row of dissenyRecords) {
    if (!row[3] || !row[4] || !row[9] || !row[12] || !row[16]) continue
    
    // Extract year from course string
    let year = 1
    const courseYear = row[2] || ''
    const yearMatch = courseYear.match(/GR(\d)/)
    if (yearMatch) {
      year = parseInt(yearMatch[1])
    }

    // Create group name
    const groupCode = row[9]
    let groupName = ''
    const shift = groupCode.startsWith('T') ? 'Tarda' : 'Matí'
    
    if (year === 1) groupName = `1r ${shift} ${groupCode}`
    else if (year === 2) groupName = `2n ${shift} ${groupCode}`
    else if (year === 3) groupName = `3r ${shift} ${groupCode}`
    else if (year === 4) groupName = `4t ${shift} ${groupCode}`

    allAssignments.push({
      id: id++,
      subject_code: row[3],
      subject_name: row[4],
      group_code: groupCode,
      group_name: groupName,
      teacher_id: row[12],
      teacher_name: row[16],
      ects_assigned: parseFloat(row[10]) || 6,
      academic_year: row[1] || '2024-2025',
      course_year: courseYear
    })
  }
}

// Process Belles Arts CSV
if (fs.existsSync(bellesArtsPath)) {
  const bellesArtsContent = fs.readFileSync(bellesArtsPath, 'utf-8')
  const bellesArtsRecords = parse(bellesArtsContent, {
    columns: false,
    skip_empty_lines: true,
    from_line: 5,
    delimiter: ';',
    relax_column_count: true
  })
  
  for (const row of bellesArtsRecords) {
    if (!row[3] || !row[4] || !row[9] || !row[12] || !row[16]) continue
    
    // Extract year from course string
    let year = 1
    const courseYear = row[2] || ''
    const yearMatch = courseYear.match(/GR(\d)/)
    if (yearMatch) {
      year = parseInt(yearMatch[1])
    }

    // Create group name
    const groupCode = row[9]
    let groupName = ''
    const shift = groupCode.startsWith('T') ? 'Tarda' : 'Matí'
    
    if (year === 1) groupName = `1r ${shift} ${groupCode}`
    else if (year === 2) groupName = `2n ${shift} ${groupCode}`
    else if (year === 3) groupName = `3r ${shift} ${groupCode}`
    else if (year === 4) groupName = `4t ${shift} ${groupCode}`

    allAssignments.push({
      id: id++,
      subject_code: row[3],
      subject_name: row[4],
      group_code: groupCode,
      group_name: groupName,
      teacher_id: row[12],
      teacher_name: row[16],
      ects_assigned: parseFloat(row[10]) || 6,
      academic_year: row[1] || '2024-2025',
      course_year: courseYear
    })
  }
}

// Save to JSON file
const outputPath = path.join(__dirname, '../src/data/all-assignments.json')
fs.writeFileSync(outputPath, JSON.stringify(allAssignments, null, 2))

console.log(`Generated ${allAssignments.length} assignments`)
console.log(`Saved to: ${outputPath}`)

// Show sample data
console.log('\nSample assignments:')
allAssignments.slice(0, 5).forEach(a => {
  console.log(`- ${a.subject_name} (${a.subject_code}) - ${a.group_code} - ${a.teacher_name}`)
})