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
  console.error('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl)
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Set' : 'Not set')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface Assignment {
  subject_code: string
  subject_name: string
  credits: number
  group_code: string
  ects_assigned: number
  teacher_id: string
  teacher_name: string
  teacher_degree: string
  academic_year: string
  course_year: string
}

async function importTeachingAssignments() {
  try {
    console.log('Starting teaching assignments import...')

    // Read both CSV files
    const dissenyPath = path.join(__dirname, '../csv/AssignacioDocent_2526_Preparacio(DISSENY).csv')
    const bellesArtsPath = path.join(__dirname, '../csv/AssignacioDocent_2526_Preparacio(BELLES ARTS).csv')

    const dissenyContent = fs.readFileSync(dissenyPath, 'utf-8')
    const bellesArtsContent = fs.readFileSync(bellesArtsPath, 'utf-8')

    // Parse CSV files
    const dissenyRecords = parse(dissenyContent, {
      columns: false,
      skip_empty_lines: true,
      from_line: 5, // Skip header rows
      delimiter: ';',
      relax_column_count: true
    })

    const bellesArtsRecords = parse(bellesArtsContent, {
      columns: false,
      skip_empty_lines: true,
      from_line: 5, // Skip header rows
      delimiter: ';',
      relax_column_count: true
    })

    // Combine records
    const allRecords = [...dissenyRecords, ...bellesArtsRecords]

    // Process assignments
    const assignments: Assignment[] = []
    
    for (const row of allRecords) {
      if (!row[3] || !row[4] || !row[9] || !row[12] || !row[16]) continue // Skip incomplete rows
      
      // Extract data from 2024/2025 columns (current year)
      const assignment: Assignment = {
        subject_code: row[3],
        subject_name: row[4],
        credits: parseFloat(row[8]) || 6,
        group_code: row[9],
        ects_assigned: parseFloat(row[10]) || 6,
        teacher_id: row[12],
        teacher_name: row[16],
        teacher_degree: row[13],
        academic_year: row[1],
        course_year: row[2]
      }
      
      assignments.push(assignment)
    }

    console.log(`Found ${assignments.length} assignments to import`)

    // Get existing subjects, teachers, and groups
    const { data: subjects } = await supabase.from('subjects').select('*')
    const { data: teachers } = await supabase.from('teachers').select('*')
    const { data: groups } = await supabase.from('student_groups').select('*')

    // Create maps for quick lookup
    const subjectMap = new Map(subjects?.map(s => [s.code, s]) || [])
    const teacherMap = new Map(teachers?.map(t => [t.code, t]) || [])
    
    // Create group map by extracting group code from name
    const groupMap = new Map()
    for (const group of groups || []) {
      // Extract group code from name (e.g., "1r Matí M1" -> "M1")
      const match = group.name.match(/([MT]\d+|Am|At|Gm\d+|Gt\d+|Em|Et|Im|It)/i)
      if (match) {
        groupMap.set(match[1], group)
      }
    }

    // Track teachers that need to be created
    const teachersToCreate = new Map<string, any>()

    // Process assignments
    for (const assignment of assignments) {
      // Check if teacher exists, if not, add to creation list
      if (!teacherMap.has(assignment.teacher_id)) {
        if (!teachersToCreate.has(assignment.teacher_id)) {
          const nameParts = assignment.teacher_name.split(',')
          const lastName = nameParts[0]?.trim() || 'Unknown'
          const firstName = nameParts[1]?.trim() || 'Unknown'
          
          teachersToCreate.set(assignment.teacher_id, {
            code: assignment.teacher_id,
            first_name: firstName,
            last_name: lastName,
            email: `prof${assignment.teacher_id}@bau.edu`,
            department: 'Design', // Default department
            contract_type: 'full-time',
            max_hours: 20
          })
        }
      }
    }

    // Create missing teachers
    if (teachersToCreate.size > 0) {
      console.log(`Creating ${teachersToCreate.size} new teachers...`)
      const { data: newTeachers, error } = await supabase
        .from('teachers')
        .insert(Array.from(teachersToCreate.values()))
        .select()
      
      if (error) {
        console.error('Error creating teachers:', error)
      } else {
        // Update teacher map
        newTeachers?.forEach(t => teacherMap.set(t.code, t))
      }
    }

    // Create teaching assignments in the database
    console.log('Creating teaching assignments...')
    
    // Tables will be created directly with SQL if needed

    // For now, let's create a simple teaching_assignments structure
    const teachingAssignments = []
    
    for (const assignment of assignments) {
      const subject = subjectMap.get(assignment.subject_code)
      const teacher = teacherMap.get(assignment.teacher_id)
      const group = groupMap.get(assignment.group_code)
      
      if (subject && teacher) {
        teachingAssignments.push({
          subject_id: subject.id,
          teacher_id: teacher.id,
          student_group_id: group?.id || null,
          ects_assigned: assignment.ects_assigned,
          academic_year: '2024-2025',
          is_coordinator: false // Can be updated later based on business rules
        })
      }
    }

    // Insert teaching assignments
    if (teachingAssignments.length > 0) {
      console.log(`Inserting ${teachingAssignments.length} teaching assignments...`)
      
      // Try to create the table first (this might fail if it already exists)
      const createTableQuery = `
        CREATE TABLE IF NOT EXISTS teaching_assignments (
          id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
          subject_id UUID REFERENCES subjects(id),
          teacher_id UUID REFERENCES teachers(id),
          student_group_id UUID REFERENCES student_groups(id),
          ects_assigned DECIMAL(4,2),
          academic_year VARCHAR(20),
          is_coordinator BOOLEAN DEFAULT false,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `
      
      // For now, skip table creation as it requires admin privileges

      // Insert assignments
      const { data, error } = await supabase
        .from('teaching_assignments')
        .insert(teachingAssignments)
        .select()
      
      if (error) {
        console.error('Error inserting assignments:', error)
        
        // If table doesn't exist, just log the assignments for manual creation
        console.log('\nSample assignments for manual creation:')
        console.log(JSON.stringify(teachingAssignments.slice(0, 5), null, 2))
      } else {
        console.log(`Successfully imported ${data?.length || 0} teaching assignments`)
      }
    }

    // Log summary
    console.log('\nImport Summary:')
    console.log(`- Total assignments processed: ${assignments.length}`)
    console.log(`- Teachers created: ${teachersToCreate.size}`)
    console.log(`- Teaching assignments created: ${teachingAssignments.length}`)
    
    // Log some sample data
    console.log('\nSample assignments:')
    assignments.slice(0, 5).forEach(a => {
      console.log(`- ${a.subject_name} (${a.subject_code}) - ${a.group_code} - ${a.teacher_name} - ${a.ects_assigned} ECTS`)
    })

  } catch (error) {
    console.error('Error importing teaching assignments:', error)
  }
}

// Run the import
importTeachingAssignments()