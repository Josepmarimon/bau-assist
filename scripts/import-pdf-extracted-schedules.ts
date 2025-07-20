import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

// Check for environment variables
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('NEXT_PUBLIC_SUPABASE_URL is not set in .env')
  process.exit(1)
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY && !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.error('Either SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY must be set in .env')
  process.exit(1)
}

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

// Subject name fixes
const subjectNameFixes: Record<string, string> = {
  'a Dissenyadors': 'Programació per a Dissenyadors',
  'Comunicació': 'Iconografia i Comunicació',
  'de les Arts': 'Estètica i Teoria de les Arts',
  'Disseny': 'Projectes de Disseny',
  'Publicitat': 'Disseny i Publicitat',
  'Moviment': 'Tipografia en Moviment',
  'dels Teixits': 'Anàlisi i Teoria dels Teixits',
  'Economia,': 'Economia, Empresa i Disseny',
  'Llenguatges': 'Llenguatges Audiovisuals',
  'Pràctiques': 'Pràctiques Artístiques',
}

// Teacher/subject swap fixes
const teacherSubjectSwaps = [
  'Programació per',
  'Iconografia i',
  'Estètica i Teoria',
  'Projectes de',
  'Disseny i',
  'Tipografia en',
  'Anàlisi i Teoria',
  'Empresa i',
  'Audiovisuals I',
  'Audiovisuals II',
  'Història del',
  'Artístiques i',
  'Infogràfiques II',
  'Imatge i',
  'Visualisation and',
]

async function importSchedules() {
  console.log('Starting PDF extracted schedule import...')
  
  // Read the extracted JSON file
  const jsonPath = path.join(__dirname, '../data/schedules_extracted_v3_2025-2026.json')
  const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf-8'))
  
  let totalImported = 0
  let totalFailed = 0
  let totalSkipped = 0
  
  for (const schedule of jsonData.schedules) {
    console.log(`\nProcessing group: ${schedule.group}`)
    
    // First, ensure the student group exists
    let studentGroup
    const { data: existingGroup } = await supabase
      .from('student_groups')
      .select('id')
      .eq('name', schedule.group)
      .single()
    
    if (existingGroup) {
      studentGroup = existingGroup
    } else {
      console.log(`Creating student group: ${schedule.group}`)
      const { data: newGroup, error: groupError } = await supabase
        .from('student_groups')
        .insert({
          name: schedule.group,
          code: schedule.group_code.replace('\n', ' ').trim(),
          year: schedule.course, // Use course as year
          course: schedule.course,
          shift: schedule.group.includes('Matí') || schedule.group.includes('Mati') ? 'mati' : 'tarda',
          specialization: schedule.specialization,
          max_students: 30 // Default max students
        })
        .select()
        .single()
      
      if (groupError) {
        console.error(`Failed to create group ${schedule.group}:`, groupError)
        continue
      }
      studentGroup = newGroup
    }
    
    // Process each class
    for (const classInfo of schedule.classes) {
      let subjectName = classInfo.subject
      let teacherName = classInfo.teacher
      
      // Fix swapped teacher/subject
      if (teacherName && teacherSubjectSwaps.includes(teacherName)) {
        const temp = subjectName
        subjectName = teacherName + ' ' + subjectName
        teacherName = temp
      }
      
      // Fix truncated subject names
      for (const [truncated, full] of Object.entries(subjectNameFixes)) {
        if (subjectName === truncated || subjectName.startsWith(truncated + ' ')) {
          subjectName = full
          break
        }
      }
      
      // Skip if still no valid subject
      if (!subjectName || subjectName.length < 3) {
        console.log(`Skipping invalid subject: "${subjectName}"`)
        totalSkipped++
        continue
      }
      
      // Get or create subject
      let subject
      const { data: existingSubject } = await supabase
        .from('subjects')
        .select('id')
        .eq('name', subjectName)
        .single()
      
      if (existingSubject) {
        subject = existingSubject
      } else {
        console.log(`Creating subject: ${subjectName}`)
        const { data: newSubject, error: subjectError } = await supabase
          .from('subjects')
          .insert({
            code: subjectName.substring(0, 10).toUpperCase().replace(/\s+/g, '_'), // Generate code from name
            name: subjectName,
            credits: 6,
            year: schedule.course,
            semester: classInfo.semester === 1 ? '1r' : '2n',
            course: schedule.course,
            type: 'obligatoria' // Default type
          })
          .select()
          .single()
        
        if (subjectError) {
          console.error(`Failed to create subject ${subjectName}:`, subjectError)
          totalFailed++
          continue
        }
        subject = newSubject
      }
      
      // Get or create teacher if exists
      let teacherId = null
      if (teacherName && teacherName.length > 3 && !teacherName.includes('Gràfica')) {
        const { data: existingTeacher } = await supabase
          .from('teachers')
          .select('id')
          .eq('name', teacherName)
          .single()
        
        if (existingTeacher) {
          teacherId = existingTeacher.id
        } else {
          console.log(`Creating teacher: ${teacherName}`)
          const { data: newTeacher, error: teacherError } = await supabase
            .from('teachers')
            .insert({
              name: teacherName,
              email: `${teacherName.toLowerCase().replace(/\s+/g, '.')}@bau.cat`
            })
            .select()
            .single()
          
          if (!teacherError && newTeacher) {
            teacherId = newTeacher.id
          }
        }
      }
      
      // Get classroom if exists
      let classroomId = null
      if (classInfo.classroom) {
        const { data: classroom } = await supabase
          .from('classrooms')
          .select('id')
          .eq('code', classInfo.classroom)
          .single()
        
        if (classroom) {
          classroomId = classroom.id
        } else {
          console.log(`Classroom not found: ${classInfo.classroom}`)
        }
      }
      
      // Remove time slot lookup - we'll use day_of_week and times directly
      
      // Check if schedule slot already exists
      const { data: existingSlot } = await supabase
        .from('schedule_slots')
        .select('id')
        .eq('subject_id', subject.id)
        .eq('student_group_id', studentGroup.id)
        .eq('day_of_week', classInfo.day_of_week)
        .eq('start_time', `${classInfo.start_time}:00`)
        .eq('end_time', `${classInfo.end_time}:00`)
        .eq('semester', classInfo.semester)
        .single()
      
      if (existingSlot) {
        // Update existing slot with classroom
        const { error: updateError } = await supabase
          .from('schedule_slots')
          .update({
            classroom_id: classroomId
          })
          .eq('id', existingSlot.id)
        
        if (updateError) {
          console.error(`Failed to update schedule slot:`, updateError)
          totalFailed++
        } else {
          console.log(`Updated: ${subjectName} - ${schedule.group} - ${classInfo.day_name} ${classInfo.start_time}`)
          totalImported++
        }
      } else {
        // Create new slot
        const { error: insertError } = await supabase
          .from('schedule_slots')
          .insert({
            subject_id: subject.id,
            student_group_id: studentGroup.id,
            classroom_id: classroomId,
            day_of_week: classInfo.day_of_week,
            start_time: `${classInfo.start_time}:00`,
            end_time: `${classInfo.end_time}:00`,
            semester: classInfo.semester === 1 ? '1r' : '2n',
            academic_year: jsonData.academic_year
          })
        
        if (insertError) {
          console.error(`Failed to create schedule slot:`, insertError)
          totalFailed++
        } else {
          console.log(`Created: ${subjectName} - ${schedule.group} - ${classInfo.day_name} ${classInfo.start_time}`)
          totalImported++
        }
      }
    }
  }
  
  console.log('\n=== Import Summary ===')
  console.log(`Total imported/updated: ${totalImported}`)
  console.log(`Total failed: ${totalFailed}`)
  console.log(`Total skipped: ${totalSkipped}`)
}

// Run the import
importSchedules().catch(console.error)