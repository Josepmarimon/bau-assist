import { createClient } from '@supabase/supabase-js'
import * as XLSX from 'xlsx'
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

interface ExcelRow {
  Pla: string
  Curs: string
  'Codi Assignatura': string
  'Nom Assignatura': string
  'ECTS totals': number
  'ID Profe': string
  Grup: string
}

async function importTeacherGroupAssignments() {
  try {
    console.log('Starting teacher-group assignments import...')

    // Read Excel file
    const workbook = XLSX.readFile('/Users/josepmarimon/Documents/grups.xlsx')
    const sheet = workbook.Sheets[workbook.SheetNames[0]]
    const data = XLSX.utils.sheet_to_json<ExcelRow>(sheet, { header: 1 })

    // Set column names based on first row
    const headers = data[0] as any
    const rows = data.slice(1).map((row: any) => ({
      Pla: row[0],
      Curs: row[1],
      'Codi Assignatura': row[2],
      'Nom Assignatura': row[3],
      'ECTS totals': row[4],
      'ID Profe': row[5],
      Grup: row[6]
    }))

    // Get all teachers
    const { data: teachers } = await supabase
      .from('teachers')
      .select('id, id_profe')
    
    const teacherMap = new Map(teachers?.map(t => [String(t.id_profe), t.id]) || [])

    // Get all subjects
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id, code')
    
    const subjectMap = new Map(subjects?.map(s => [s.code, s.id]) || [])

    // Get all subject groups
    const { data: subjectGroups } = await supabase
      .from('subject_groups')
      .select('id, subject_id, group_code')
    
    // Create assignments to insert
    const assignments = []
    const errors = []

    for (const row of rows) {
      if (!row['Codi Assignatura'] || !row['ID Profe'] || !row.Curs || !row.Grup) {
        continue
      }

      const subjectId = subjectMap.get(row['Codi Assignatura'])
      const teacherId = teacherMap.get(String(row['ID Profe']))
      const groupCode = `${row.Curs}-${row.Grup}`

      if (!subjectId) {
        errors.push(`Subject not found: ${row['Codi Assignatura']}`)
        continue
      }

      if (!teacherId) {
        errors.push(`Teacher not found: ${row['ID Profe']}`)
        continue
      }

      // Find the subject group
      const subjectGroup = subjectGroups?.find(sg => 
        sg.subject_id === subjectId && 
        sg.group_code === groupCode
      )

      if (!subjectGroup) {
        errors.push(`Subject group not found: ${row['Codi Assignatura']} - ${groupCode}`)
        continue
      }

      // Parse ECTS value, default to 6 if not a valid number
      let ects = 6
      if (row['ECTS totals'] && !isNaN(Number(row['ECTS totals']))) {
        ects = Number(row['ECTS totals'])
      }

      assignments.push({
        teacher_id: teacherId,
        subject_group_id: subjectGroup.id,
        academic_year: '2025-2026',
        ects_assigned: ects,
        is_coordinator: false
      })
    }

    console.log(`Found ${assignments.length} valid assignments`)
    console.log(`Errors: ${errors.length}`)
    
    if (errors.length > 0) {
      console.log('First 10 errors:')
      errors.slice(0, 10).forEach(e => console.log(`  - ${e}`))
    }

    // Insert assignments in batches
    const batchSize = 100
    for (let i = 0; i < assignments.length; i += batchSize) {
      const batch = assignments.slice(i, i + batchSize)
      const { error } = await supabase
        .from('teacher_group_assignments')
        .insert(batch)
      
      if (error) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, error)
      } else {
        console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} records)`)
      }
    }

    console.log('Import completed!')

    // Show summary
    const { count } = await supabase
      .from('teacher_group_assignments')
      .select('*', { count: 'exact', head: true })
    
    console.log(`Total assignments in database: ${count}`)

  } catch (error) {
    console.error('Error during import:', error)
  }
}

// Run the import
importTeacherGroupAssignments()