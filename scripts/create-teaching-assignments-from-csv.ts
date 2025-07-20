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

// Create in-memory teaching assignments from CSV data
export async function getTeachingAssignmentsFromCSV() {
  try {
    // Read CSV files
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

    // Get existing data from database
    const [subjects, teachers, groups] = await Promise.all([
      supabase.from('subjects').select('*'),
      supabase.from('teachers').select('*'),
      supabase.from('student_groups').select('*')
    ])

    // Create maps
    const subjectMap = new Map(subjects.data?.map(s => [s.code, s]) || [])
    const teacherMap = new Map(teachers.data?.map(t => [t.code, t]) || [])
    
    // Create group map by extracting group code from name
    const groupMap = new Map()
    for (const group of groups.data || []) {
      const match = group.name.match(/([MT]\d+|Am|At|Gm\d+|Gt\d+|Em|Et|Im|It)/i)
      if (match) {
        groupMap.set(match[1], group)
      }
    }

    // Process all records
    const allRecords = [...dissenyRecords, ...bellesArtsRecords]
    const assignments = []
    
    for (const row of allRecords) {
      if (!row[3] || !row[4] || !row[9] || !row[12] || !row[16]) continue
      
      const subject = subjectMap.get(row[3])
      const teacher = teacherMap.get(row[12])
      const group = groupMap.get(row[9])
      
      if (subject && teacher) {
        assignments.push({
          id: assignments.length + 1,
          subject_code: row[3],
          subject_name: row[4],
          subject,
          teacher_code: row[12],
          teacher_name: row[16],
          teacher,
          group_code: row[9],
          group,
          ects_assigned: parseFloat(row[10]) || 6,
          academic_year: '2024-2025'
        })
      }
    }

    return assignments

  } catch (error) {
    console.error('Error loading teaching assignments from CSV:', error)
    return []
  }
}

// Export the function for use in other scripts
if (require.main === module) {
  getTeachingAssignmentsFromCSV().then(assignments => {
    console.log(`Loaded ${assignments.length} teaching assignments`)
    console.log('\nSample assignments:')
    assignments.slice(0, 5).forEach(a => {
      console.log(`- ${a.subject_name} (${a.subject_code}) - ${a.group_code} - ${a.teacher_name}`)
    })
  })
}