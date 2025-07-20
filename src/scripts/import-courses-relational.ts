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

interface CourseData {
  subjectCode: string
  subjectName: string
  orientation: string
  area: string
  credits: number
  group: string
  ects2024: number
  teacherId2024: string
  teacherName2024: string
  ects2025: number
  teacherId2025: string
  teacherName2025: string
}

async function importCoursesRelational() {
  console.log('🚀 Starting relational course import...')

  try {
    // Read CSV file
    const csvPath = path.join(process.cwd(), 'csv', 'AssignacioDocent_2526_Preparacio(DISSENY).csv')
    const fileContent = fs.readFileSync(csvPath, 'latin1')
    
    // Skip first 3 lines
    const lines = fileContent.split('\n').slice(3)
    
    // Get existing data
    const { data: academicYear } = await supabase
      .from('academic_years')
      .select('*')
      .eq('name', '2024-2025')
      .single()

    const { data: semesters } = await supabase
      .from('semesters')
      .select('*')
      .eq('academic_year_id', academicYear.id)

    const { data: subjects } = await supabase
      .from('subjects')
      .select('*')

    const { data: teachers } = await supabase
      .from('teachers')
      .select('*')

    const { data: studentGroups } = await supabase
      .from('student_groups')
      .select('*')

    // Create maps for lookups
    const subjectMap = new Map(subjects?.map(s => [s.code, s]) || [])
    const teacherMap = new Map(teachers?.map(t => [t.code, t]) || [])
    const studentGroupMap = new Map(studentGroups?.map(g => [g.name, g]) || [])

    // Process course data
    const courseOfferings = new Map<string, any>()
    const teachingAssignments: any[] = []
    const courseGroupAssignments: any[] = []

    lines.forEach((line, index) => {
      if (!line.trim()) return
      
      const fields = line.split(';')
      
      // Skip header or invalid lines
      if (!fields[3] || fields[3] === 'ID Assignatura') return
      
      const subjectCode = fields[3].trim()
      const subject = subjectMap.get(subjectCode)
      
      if (!subject) {
        console.warn(`⚠️ Subject not found: ${subjectCode}`)
        return
      }

      // Determine semester (1st semester subjects end in 001-050, 2nd semester 051-100)
      const lastDigits = parseInt(subjectCode.slice(-3))
      const semester = lastDigits <= 50 ? semesters?.find(s => s.number === 1) : semesters?.find(s => s.number === 2)
      
      if (!semester) {
        console.warn(`⚠️ Could not determine semester for ${subjectCode}`)
        return
      }

      // Create course offering key
      const offeringKey = `${academicYear.id}-${semester.id}-${subject.id}`
      
      // Create or update course offering
      if (!courseOfferings.has(offeringKey)) {
        courseOfferings.set(offeringKey, {
          academic_year_id: academicYear.id,
          semester_id: semester.id,
          subject_id: subject.id,
          coordination_area: fields[7]?.trim() || 'DISSENY',
          total_ects: parseInt(fields[8]) || 6
        })
      }

      // Process 2024/2025 teaching assignment
      const teacherId2024 = fields[12]?.trim()
      const ectsImpartits = fields[10]?.trim() // ECTS Impartits column
      const ects2024 = ectsImpartits ? parseFloat(ectsImpartits.replace(',', '.')) : 0
      
      if (teacherId2024 && teacherId2024 !== 'ID Profe' && ects2024 > 0) {
        const teacher = teacherMap.get(`PROF${teacherId2024}`)
        if (teacher) {
          teachingAssignments.push({
            course_offering_key: offeringKey,
            teacher_id: teacher.id,
            ects_assigned: ects2024,
            is_coordinator: ects2024 === parseInt(fields[8]) // Full ECTS means coordinator
          })
        } else {
          console.warn(`⚠️ Teacher not found: PROF${teacherId2024}`)
        }
      }

      // Process student group assignment
      const groupName = fields[9]?.trim()
      if (groupName && groupName !== 'Grup') {
        const year = parseInt(fields[2]?.replace('GR', '') || '1')
        const searchName = `${year}r ${groupName}`
        
        // Find the student group
        let studentGroup = null
        for (const [name, group] of studentGroupMap.entries()) {
          if (name.includes(groupName) && name.includes(`${year}r`)) {
            studentGroup = group
            break
          }
        }

        if (studentGroup) {
          // Parse orientation from column 5
          const orientation = fields[5]?.trim() || null
          
          courseGroupAssignments.push({
            course_offering_key: offeringKey,
            student_group_id: studentGroup.id,
            orientation: orientation,
            teacher_id_2024: teacherId2024 ? teacherMap.get(`PROF${teacherId2024}`)?.id : null
          })
        } else {
          console.warn(`⚠️ Student group not found: ${searchName}`)
        }
      }
    })

    // Clear existing data
    console.log('🧹 Clearing existing relational data...')
    await supabase.from('course_group_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('teaching_assignments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('course_offerings').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Insert course offerings
    console.log(`📚 Inserting ${courseOfferings.size} course offerings...`)
    const offeringsArray = Array.from(courseOfferings.values())
    const { data: insertedOfferings, error: offeringsError } = await supabase
      .from('course_offerings')
      .insert(offeringsArray)
      .select()

    if (offeringsError) throw offeringsError

    // Create offering map with actual IDs
    const offeringIdMap = new Map<string, string>()
    insertedOfferings?.forEach(offering => {
      const key = `${offering.academic_year_id}-${offering.semester_id}-${offering.subject_id}`
      offeringIdMap.set(key, offering.id)
    })

    // Update teaching assignments with actual offering IDs
    const teachingAssignmentsWithIds = teachingAssignments.map(ta => {
      const { course_offering_key, ...rest } = ta
      return {
        ...rest,
        course_offering_id: offeringIdMap.get(course_offering_key)
      }
    }).filter(ta => ta.course_offering_id)

    // Insert teaching assignments
    console.log(`👥 Inserting ${teachingAssignmentsWithIds.length} teaching assignments...`)
    const { data: insertedTeachingAssignments, error: teachingError } = await supabase
      .from('teaching_assignments')
      .insert(teachingAssignmentsWithIds)
      .select()

    if (teachingError) throw teachingError

    // Create teaching assignment map
    const teachingAssignmentMap = new Map<string, string>()
    insertedTeachingAssignments?.forEach(ta => {
      const key = `${ta.course_offering_id}-${ta.teacher_id}`
      teachingAssignmentMap.set(key, ta.id)
    })

    // Update course group assignments with actual IDs
    const courseGroupAssignmentsWithIds = courseGroupAssignments.map(cga => {
      const offeringId = offeringIdMap.get(cga.course_offering_key)
      const teachingAssignmentId = cga.teacher_id_2024 ? 
        teachingAssignmentMap.get(`${offeringId}-${cga.teacher_id_2024}`) : null
      
      return {
        course_offering_id: offeringId,
        student_group_id: cga.student_group_id,
        teaching_assignment_id: teachingAssignmentId,
        orientation: cga.orientation
      }
    }).filter(cga => cga.course_offering_id)

    // Remove duplicates
    const uniqueGroupAssignments = Array.from(
      new Map(
        courseGroupAssignmentsWithIds.map(cga => 
          [`${cga.course_offering_id}-${cga.student_group_id}-${cga.orientation || ''}`, cga]
        )
      ).values()
    )

    // Insert course group assignments
    console.log(`🎓 Inserting ${uniqueGroupAssignments.length} course group assignments...`)
    const { error: groupError } = await supabase
      .from('course_group_assignments')
      .insert(uniqueGroupAssignments)

    if (groupError) throw groupError

    console.log('✅ Relational course import completed successfully!')
    
    // Show summary
    console.log('\n📊 Summary:')
    console.log(`  Course offerings: ${courseOfferings.size}`)
    console.log(`  Teaching assignments: ${teachingAssignmentsWithIds.length}`)
    console.log(`  Course group assignments: ${uniqueGroupAssignments.length}`)

  } catch (error) {
    console.error('❌ Error during import:', error)
  }
}

// Execute import
importCoursesRelational()