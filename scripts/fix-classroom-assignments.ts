import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { CLASSROOM_MAPPINGS, findClassroom } from './import-schedules-complete-mapping'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Define the classroom assignments for unassigned slots
interface ClassroomAssignment {
  groupName: string
  subjectName: string
  dayOfWeek: number
  startTime: string
  semester: number
  classrooms: string[]
}

// Extract classroom assignments from the import scripts
const classroomAssignments: ClassroomAssignment[] = [
  // BELLES ARTS 1r
  {
    groupName: '1r BA Matí M1',
    subjectName: '2D. Llenguatges, Tècniques i Tecnologies',
    dayOfWeek: 1,
    startTime: '09:00',
    semester: 1,
    classrooms: ['G1.2']
  },
  {
    groupName: '1r BA Matí M1',
    subjectName: 'Visualisation and Documentation Workshop',
    dayOfWeek: 2,
    startTime: '09:00',
    semester: 1,
    classrooms: ['LO.2']
  },
  {
    groupName: '1r BA Matí M1',
    subjectName: 'Estètica',
    dayOfWeek: 3,
    startTime: '09:00',
    semester: 1,
    classrooms: ['P1.8']
  },
  {
    groupName: '1r BA Matí M1',
    subjectName: 'Art, Institució i Mercat',
    dayOfWeek: 4,
    startTime: '09:00',
    semester: 1,
    classrooms: ['P1.8']
  },
  {
    groupName: '1r BA Matí M1',
    subjectName: 'Pensament Modern i Pràctiques Artístiques',
    dayOfWeek: 5,
    startTime: '09:00',
    semester: 1,
    classrooms: ['PO.8']
  },
  {
    groupName: '1r BA Matí M1',
    subjectName: '3D. Llenguatges, Tècniques i Tecnologies',
    dayOfWeek: 2,
    startTime: '09:00',
    semester: 2,
    classrooms: ['GO.4']
  },
  {
    groupName: '1r BA Matí M1',
    subjectName: 'Estètica',
    dayOfWeek: 3,
    startTime: '09:00',
    semester: 2,
    classrooms: ['PO.8']
  },
  {
    groupName: '1r BA Matí M1',
    subjectName: 'Art, Institució i Mercat',
    dayOfWeek: 4,
    startTime: '09:00',
    semester: 2,
    classrooms: ['PO.8']
  },
  
  // BELLES ARTS 2n
  {
    groupName: '2n BA Matí M1',
    subjectName: '4D. Llenguatges, Tècniques i Tecnologies',
    dayOfWeek: 1,
    startTime: '09:00',
    semester: 1,
    classrooms: ['L0.4']
  },
  {
    groupName: '2n BA Matí M1',
    subjectName: 'Filosofia i Teoria Crítica',
    dayOfWeek: 3,
    startTime: '09:00',
    semester: 1,
    classrooms: ['PO.8']
  },
  {
    groupName: '2n BA Matí M1',
    subjectName: 'Pensament Contemporani i Pràctiques Crítiques',
    dayOfWeek: 4,
    startTime: '09:00',
    semester: 1,
    classrooms: ['PO.11']
  },
  {
    groupName: '2n BA Matí M1',
    subjectName: 'Laboratori de Processos i Projectes II',
    dayOfWeek: 5,
    startTime: '09:00',
    semester: 1,
    classrooms: ['G1.2']
  },
  {
    groupName: '2n BA Matí M1',
    subjectName: 'Antropologia',
    dayOfWeek: 1,
    startTime: '09:00',
    semester: 2,
    classrooms: ['PO.11']
  },
  {
    groupName: '2n BA Matí M1',
    subjectName: 'Laboratori de Processos i Projectes III',
    dayOfWeek: 3,
    startTime: '09:00',
    semester: 2,
    classrooms: ['G1.3']
  },
  {
    groupName: '2n BA Matí M1',
    subjectName: '3D. Llenguatges, Tècniques i Tecnologies Instal·lades',
    dayOfWeek: 5,
    startTime: '09:00',
    semester: 2,
    classrooms: ['GO.4']
  },
  
  // BELLES ARTS 3r
  {
    groupName: '3r BA Matí M1',
    subjectName: 'Laboratori de Processos i Projectes IV',
    dayOfWeek: 5,
    startTime: '09:00',
    semester: 1,
    classrooms: ['G1.3']
  },
  
  // BELLES ARTS 4t
  {
    groupName: '4t BA Matí M1',
    subjectName: 'Art Practices in Context Seminar II',
    dayOfWeek: 1,
    startTime: '09:00',
    semester: 1,
    classrooms: ['PO.11']
  },
  {
    groupName: '4t BA Matí M1',
    subjectName: 'Laboratori de Processos i Projectes VI',
    dayOfWeek: 4,
    startTime: '09:00',
    semester: 1,
    classrooms: ['G0.2']
  },
  {
    groupName: '4t BA Matí M1',
    subjectName: 'Metodologies Transdisciplinàries i Experimentals',
    dayOfWeek: 5,
    startTime: '09:00',
    semester: 1,
    classrooms: ['PO.11']
  },
  
  // Groups with parentheses - extract from full schedule data
  {
    groupName: '1r Matí (1 M1)',
    subjectName: '2D. Llenguatges, Tècniques i Tecnologies',
    dayOfWeek: 1,
    startTime: '09:00',
    semester: 1,
    classrooms: ['G1.2']
  },
  {
    groupName: '1r Matí (1 M1)',
    subjectName: 'Taller de Dibuix II',
    dayOfWeek: 1,
    startTime: '09:00',
    semester: 2,
    classrooms: ['G1.2']
  },
  {
    groupName: '2n Matí (2 M1)',
    subjectName: '4D. Llenguatges, Tècniques i Tecnologies Instal·lades',
    dayOfWeek: 1,
    startTime: '09:00',
    semester: 1,
    classrooms: ['L0.4']
  },
  {
    groupName: '3r Matí (3 M1)',
    subjectName: 'Optativitat',
    dayOfWeek: 1,
    startTime: '09:00',
    semester: 1,
    classrooms: ['PO.11', 'G0.2', 'G1.3']
  },
  {
    groupName: '4t Matí (4 M1)',
    subjectName: 'Optativitat',
    dayOfWeek: 1,
    startTime: '09:00',
    semester: 1,
    classrooms: ['PO.11', 'G0.2', 'G1.3']
  }
]

async function fixClassroomAssignments() {
  console.log('🔧 FIXING CLASSROOM ASSIGNMENTS')
  console.log('================================\n')
  
  let fixedCount = 0
  let errorCount = 0
  
  for (const assignment of classroomAssignments) {
    try {
      // Find the schedule slot
      const { data: slots } = await supabase
        .from('schedule_slots')
        .select(`
          id,
          student_groups!inner(name),
          subjects!inner(name)
        `)
        .eq('student_groups.name', assignment.groupName)
        .eq('subjects.name', assignment.subjectName)
        .eq('day_of_week', assignment.dayOfWeek)
        .eq('start_time', assignment.startTime + ':00')
        .eq('semester', assignment.semester)
      
      if (!slots || slots.length === 0) {
        console.log(`❌ No slot found for ${assignment.groupName} - ${assignment.subjectName}`)
        errorCount++
        continue
      }
      
      const slot = slots[0]
      
      // Check if already has classrooms
      const { data: existingClassrooms } = await supabase
        .from('schedule_slot_classrooms')
        .select('id')
        .eq('schedule_slot_id', slot.id)
      
      if (existingClassrooms && existingClassrooms.length > 0) {
        console.log(`⏭️  ${assignment.groupName} - ${assignment.subjectName} already has classrooms`)
        continue
      }
      
      // Add classroom assignments
      console.log(`📚 ${assignment.groupName} - ${assignment.subjectName}`)
      
      for (const classroomCode of assignment.classrooms) {
        const classroomId = await findClassroom(classroomCode)
        if (classroomId) {
          await supabase
            .from('schedule_slot_classrooms')
            .insert({
              schedule_slot_id: slot.id,
              classroom_id: classroomId
            })
          console.log(`   🏫 ${classroomCode} ✓`)
        } else {
          console.log(`   🏫 ${classroomCode} ✗ (not found)`)
        }
      }
      
      fixedCount++
      
    } catch (error) {
      console.error(`❌ Error processing ${assignment.groupName} - ${assignment.subjectName}:`, error)
      errorCount++
    }
  }
  
  console.log(`\n📊 Summary: ${fixedCount} fixed, ${errorCount} errors`)
  
  // Now check the overall status
  console.log('\n📊 CHECKING FINAL STATUS')
  console.log('========================\n')
  
  const { data: stats } = await supabase
    .from('schedule_slots')
    .select(`
      id,
      schedule_slot_classrooms(id)
    `)
  
  if (stats) {
    const totalSlots = stats.length
    const slotsWithClassrooms = stats.filter(s => s.schedule_slot_classrooms && s.schedule_slot_classrooms.length > 0).length
    const slotsWithoutClassrooms = totalSlots - slotsWithClassrooms
    
    console.log(`Total schedule slots: ${totalSlots}`)
    console.log(`Slots with classrooms: ${slotsWithClassrooms}`)
    console.log(`Slots without classrooms: ${slotsWithoutClassrooms}`)
    console.log(`Percentage assigned: ${((slotsWithClassrooms / totalSlots) * 100).toFixed(1)}%`)
  }
}

// Execute
fixClassroomAssignments().catch(console.error)