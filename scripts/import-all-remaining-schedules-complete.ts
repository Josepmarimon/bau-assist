import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import fs from 'fs'
import path from 'path'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Mapeig complet de professors
const TEACHER_MAPPINGS: Record<string, string> = {
  'Mario Santamaría': 'Mario Santamaría García',
  'Irena Visa': '', // No existe
  'Blanca-Pía Fernández': 'Blanca-Pía Fernández Valverde',
  'Mª Isabel del Río': 'María Isabel del Río Sánchez',
  'M. Isabel del Río': 'María Isabel del Río Sánchez',
  'Camila Maggi': '', // No existe
  'Laura Subirats': 'Laura Subirats Berenguer',
  'Laurà Subirats': 'Laura Subirats Berenguer',
  'Jaume Ferraté Vázquez': 'Jaume Ferraté Vázquez',
  'Jaume Ferrate Vázquez': 'Jaume Ferraté Vázquez',
  'Marta Velasco': '', // No existe
  'Serafín Álvarez': 'Serafín Álvarez Prieto',
  'David Martin': 'David Martín Royo',
  'David Martín': 'David Martín Royo',
  'Mariona García': 'Mariona García Villalba',
  'Jesús Morentín': 'Jesús Morentín Rodríguez',
  'Pau de Riba': 'Pau de Riba Miralles',
  'Isabel Quiles': '', // No existe
  'Mª Àngels Fortea': 'Mª Àngels Fortea Castillo',
  'David Torrents': 'David Torrents Janer',
  'Nadia Speranza': '', // No existe
  'Arnau Pi': 'Arnau Pi Bori',
  'Adrià Molins': '', // No existe
  'Anna Carreras': 'Anna Carreras Crosas',
  'Roc Albalat': 'Roc Albalat Gilabert',
  'Gabriel Ventura': '', // No existe
  'David Ortiz': 'David Ortiz Juan',
  'Jordi Galobart': 'Jordi Galobart Casanova',
  'Mireia Carbonell': '', // No existe
  'Marina Gil': 'Marina Gil Salazar',
  'Ruben Pater': '', // No existe
  'Guillem Castellví': 'Guillem Castellví Esteva',
  'Jose Ramon Madrid': '', // No existe
  'Laia Ramos': '', // No existe
  'Marc Mensa': 'Marc Mensa Romero',
  'Rafa Marquina': '', // No existe
  'Pau Martorell': '', // No existe
  'Alejandra López Gabrielidis': 'María Alejandra López',
  'Silvia Olaizola': '', // No existe
  'Lluís Llovet': 'Lluís Llovet Bayer',
  'Fernando Peiró': '', // No existe
  'Román Corbato': '', // No existe
  'Susanna Crespo': 'Susanna Crespo Subirà',
  'Maria Pons': '', // No existe
  'Lluís Ginebra': '', // No existe
  'Glòria Deumal': 'Glòria Deumal López',
  'Nuria Cano': '', // No existe
  'Oriol Vila': '', // No existe
  'Maite Grau': '', // No existe
  'Margarita Cirlot': '', // No existe
  'Antonio de Felipe': '', // No existe
  'Arnau Horta': 'Arnau Horta Sellarés',
  'Rebecca Gil Bell': 'Rebecca Gil Bell',
  'Bàrbara Raubert': '', // No existe
  'Montse Casacuberta': 'Montse Casacuberta Suñer',
  'Nico Juárez': 'Nico Juárez Latimer-Knowles',
  'Josep M. Marimon': 'Josep Mª Marimon Soler',
  'Jaume Suau': '', // No existe
  'Manuel Jiménez': 'Manuel Jiménez',
  'Alex García': 'Àlex García Estruch',
  'Carmen Morant': '', // No existe
  'Luca Coderch': '', // No existe
  'Juan Ramon Rodriguez': '', // No existe
  'Aurora Sueiro': '', // No existe
  'Marina Riera': 'Marina Riera Retamero',
  'Marta Camps': 'Marta Camps Banqué',
  'Laura Ginés': 'Laura Ginés Bataller',
  'Laura Gual': 'Laura Gual Torrebadell',
  'Pau Pericas': 'Pau Pericas Bosch',
  'Fontarnau': 'Elisenda Fontarnau Català',
  'Jorge Luis Marzo': 'Jorge Luís Marzo Pérez',
  'Emili Padrós': 'Emili Padrós Reig',
  'Jose M. Soria': '', // No existe
  'Ricard Marimon': 'Ricard Marimon Soler',
  'Andrea Soto': '', // No existe
  'Cristina Ampudia': '', // No existe
  'Pilar Tarres': '', // No existe
  'Jan Monclús': '', // No existe
  'Núria Sellarès': '', // No existe
  'Zaida Muxí': '', // No existe
  'Marta Benages': '', // No existe
  'Eric Villagordo': '', // No existe
  'Ane Gurrutxaga': '', // No existe
  'Marcos Parera': '', // No existe
  'Manuel Quejido': '', // No existe
  'Montserrat Comelles': '', // No existe
  'Xavi Pujols': '', // No existe
  'Miquel Escorsell': '', // No existe
  'Rosa Parés': '', // No existe
  'Aleix Fortuna': '', // No existe
  'Damià Martínez': '', // No existe
  'Tatiana Muñoz': '', // No existe
  'Queralt Suau': '', // No existe
  'Cris Acaso': '', // No existe
  'LABA 1': '', // No existe
  'José Miguel de Prada': '', // No existe
  'LABA 2': '', // No existe
  'Alicia Eva Cano': '', // No existe
  'Pepe Azorín': '', // No existe
  'Mirari Echávarri': '', // No existe
  'Helena Sabaté': '', // No existe
  'Ignasi Peña': '', // No existe
  'Josep Maria Marimon': 'Josep Mª Marimon Soler',
  'Perico Pastor': '', // No existe
  'Perico Aznar': '', // No existe
  'Flavio Morais': '', // No existe
  'Míriam Royo': '', // No existe
  'Emilio González Sainz': '', // No existe
  'Alex Posada': 'Àlex Posada Gómez',
  'Nataly dal Pozzo': 'Nataly Dal Pozzo Montrucchio',
  'Liana Enjuanes': '', // No existe
  'Judit Argelaguet': '', // No existe
  'LABA': '', // No existe
  'Teresa Gironès': '', // No existe
  'Joan Carles Oliver': '', // No existe
  'Lluís Ginés': '', // No existe
  'Eulàlia Piera': '', // No existe
  'Natxo Medina': '', // No existe
  'Rubén Grilo': '', // No existe
  'Elisa G. Miralles': '', // No existe
  'Lola Zoido': '', // No existe
  'Tània Costa': '', // No existe
  'Joan Escofet': '', // No existe
  'Diego Bustamante': '', // No existe
  'Pablo Jové': '', // No existe
  'Albert Gusi': '', // No existe
  'Josep Manuél Torres': '', // No existe
  'Cristina Pastó': '', // No existe
  'Carles Murillo': '', // No existe
  'Martin Lorente': '', // No existe
  'Pablo Ramirez': '', // No existe
  'Yvonne Portilla': '', // No existe
  'Eugeni Aguilo': '', // No existe
  'Xavi Casanova': '', // No existe
  'Teresa Pera': '', // No existe
  'Jaume Bassa': 'Jaume Bassa Daranas',
  'Daniel Tahmaz': 'Daniel Tahmaz Pujol',
  'Eloi Martínez': '', // No existe
  'Guillem Ramisa': '', // No existe
  'Raquel Masferrer': '', // No existe
  'Ernest Figueras': '', // No existe
  'Carlos Velilla': '', // No existe
  'Oscar Guayabero': '', // No existe
  'David Vila': '', // No existe
  'Pierino del Pozzo': 'Pierino Dal Pozzo',
  'Mafe Moscoso': 'María Fernanda Moscoso Rosero',
  'Ander Iriarte': '', // No existe
  'Lola Cuesta': '', // No existe
  'Guillermo Carreras': '', // No existe
  'Lluïsa Faxedas': '', // No existe
  'Oriol Morell': '', // No existe
  'Maria Enrich': 'María Enrich García',
  'David Morera': '', // No existe
  'Pia Ferrér': '', // No existe
}

// Mapeig d'aules
const CLASSROOM_MAPPINGS: Record<string, string | null> = {
  'G2.2': 'G.2.2',
  'L1.2': 'L.1.2',
  'P1.9': 'P.1.9',
  'G1.3': 'G.1.3',
  'P0.6': 'P.0.6',
  'P1.5': 'P.1.5',
  'P0.2/0.4': 'P.0.2/0.4',
  'P0.12': 'P.0.12',
  'POS/0.7': 'P.0.5/0.7',
  'P0.5/0.7': 'P.0.5/0.7',
  'P1.6': 'P.1.6',
  'P0.10': 'P.0.10',
  'P0.8': 'P.0.8',
  'P1.7': 'P.1.7',
  'P0.3': 'P.0.3',
  'P2.2': 'P.2.2',
  'P1.14': 'P.1.14',
  'P1.10': 'P.1.10',
  'P1.2': 'P.1.2',
  'P1.3': 'P.1.3',
  'P0.5': 'P.0.5',
  'P1.12': 'P.1.12',
  'L0.2': 'L.0.2',
  'L0.1': 'L.0.1',
  'P1.8': 'P.1.8',
  'P2.1': 'P.2.1',
  'G0.1': 'G.0.1',
  'G1.1': 'G.1.1',
  'G0.2': 'G.0.2',
  'L1.1': 'L.1.1',
  'G2.1': 'G.2.1',
  'T2': 'T.2',
  'SALA_CAROLINES': 'SALA_CAROLINES',
  'T3': 'T.3_TALLER_DE_MODA',
  'T3_TALLER_DE_MODA': 'T.3_TALLER_DE_MODA',
  'TALLER_PRODUCCIÓ_GRÀFICA': 'TALLER_DE_PRODUCCIÓ_GRÀFICA',
  'P0.14': 'P.0.14',
  'AULA_MAGNA': 'AULA_MAGNA',
  'Sense aula': null,
  'Aula per definir': null,
}

// Groups mapping
const GROUP_MAPPINGS: Record<string, string> = {
  '2n Gràfic Tarda (2 Gt)': '2n Tarda Gt',
  '2n Audiovisual Matí (2 Am)': '2n Matí Am',
  '2n Moda Matí (2 Mm)': '2n Matí Mm',
  '2n Moda Tarda (2 Mt)': '2n Tarda Mt',
  '2n Interiors Matí (2 Im)': '2n Matí Im',
  '2n Interiors Tarda (2 It)': '2n Tarda It',
  '3r Gràfic Tarda (3 Gt)': '3r Tarda Gt',
  '3r Audiovisual Matí (3 Am)': '3r Matí Am',
  '3r Audiovisual Tarda (3 At)': '3r Tarda At',
  '3r Moda Matí (3 Mm)': '3r Matí Mm',
  '3r Moda Tarda (3 Mt)': '3r Tarda Mt',
  '3r Interiors Matí (3 Im)': '3r Matí Im',
  '3r Interiors Tarda (3 It)': '3r Tarda It',
  '4t Gràfic Tarda (4 Gt)': '4t Tarda Gt',
  '4t Audiovisual Matí (4 Am)': '4t Matí Am',
  '4t Audiovisual Tarda (4 At)': '4t Tarda At',
  '4t Moda Matí (4 Mm)': '4t Matí Mm',
  '4t Moda Tarda (4 Mt)': '4t Tarda Mt',
  '4t Interiors Matí (4 Im)': '4t Matí Im',
  '1 M1': '1r BA Matí M1',
  '2 M1': '2n BA Matí M1', 
  '3 M1': '3r BA Matí M1',
  '3 T1': '3r BA Tarda T1',
  '4 M1': '4t BA Matí M1',
  '4 T1': '4t BA Tarda T1',
}

async function importSchedules() {
  console.log('🚀 Iniciant importació completa d\'horaris...')
  
  // Load JSON data
  const dataPath = path.join(process.cwd(), 'data', 'all_schedules_data.json')
  const jsonData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  
  let totalImported = 0
  let totalErrors = 0
  
  for (const schedule of jsonData.schedules) {
    const groupName = GROUP_MAPPINGS[schedule.group] || schedule.group
    console.log(`\n📚 Processant grup: ${groupName}`)
    
    // Check if group exists, if not create it
    let { data: studentGroup } = await supabase
      .from('student_groups')
      .select('id')
      .eq('name', groupName)
      .single()
    
    if (!studentGroup) {
      console.log(`   ⚠️ Creant grup ${groupName}`)
      const year = parseInt(groupName.charAt(0))
      const shift = groupName.includes('Tarda') ? 'tarda' : 'mati'
      
      const { data: newGroup, error: groupError } = await supabase
        .from('student_groups')
        .insert({
          name: groupName,
          year: year,
          shift: shift,
          max_students: 30
        })
        .select()
        .single()
      
      if (groupError) {
        console.log(`   ❌ Error creant grup:`, groupError.message)
        continue
      }
      
      studentGroup = newGroup
    }
    
    // Process each class
    for (const classData of schedule.classes) {
      try {
        // Find or create subject
        let { data: subject } = await supabase
          .from('subjects')
          .select('id')
          .ilike('name', `%${classData.subject}%`)
          .single()
        
        if (!subject) {
          console.log(`   ⚠️ Creant assignatura "${classData.subject}"`)
          const { data: newSubject } = await supabase
            .from('subjects')
            .insert({
              name: classData.subject,
              code: classData.subject.substring(0, 10).toUpperCase().replace(/\s/g, ''),
              credits: 6,
              year: parseInt(groupName.charAt(0)),
              type: 'obligatoria'
            })
            .select()
            .single()
          
          if (newSubject) {
            subject = newSubject
          } else {
            continue
          }
        }
        
        // Parse teachers
        const teacherIds = []
        if (classData.teacher) {
          const teachers = classData.teacher.split(',').map((t: string) => t.trim())
          for (const teacherName of teachers) {
            const mappedName = TEACHER_MAPPINGS[teacherName] || teacherName
            if (!mappedName) continue
            
            const { data: teacher } = await supabase
              .from('teachers')
              .select('id')
              .or(`first_name.ilike.%${mappedName.split(' ')[0]}%,last_name.ilike.%${mappedName.split(' ').pop()}%`)
              .single()
            
            if (teacher) {
              teacherIds.push(teacher.id)
            }
          }
        }
        
        // Parse classrooms
        const classroomIds = []
        if (classData.classroom) {
          const classrooms = classData.classroom.split(',').map((c: string) => c.trim())
          for (const classroomCode of classrooms) {
            const mappedCode = CLASSROOM_MAPPINGS[classroomCode]
            if (!mappedCode) continue
            
            const { data: classroom } = await supabase
              .from('classrooms')
              .select('id')
              .eq('code', mappedCode)
              .single()
            
            if (classroom) {
              classroomIds.push(classroom.id)
            }
          }
        }
        
        // Create schedule slot
        if (!studentGroup || !subject) {
          console.log(`   ❌ Error: Missing student group or subject`)
          totalErrors++
          continue
        }

        const { data: scheduleSlot, error: slotError } = await supabase
          .from('schedule_slots')
          .insert({
            student_group_id: studentGroup.id,
            subject_id: subject.id,
            day_of_week: classData.day,
            start_time: classData.start_time + ':00',
            end_time: classData.end_time + ':00',
            academic_year: '2025-26',
            semester: classData.semester
          })
          .select()
          .single()
        
        if (slotError) {
          console.log(`   ❌ Error: ${classData.subject} - ${slotError.message}`)
          totalErrors++
          continue
        }
        
        // Assign teachers
        if (scheduleSlot && teacherIds.length > 0) {
          for (const teacherId of teacherIds) {
            await supabase
              .from('schedule_slot_teachers')
              .insert({
                schedule_slot_id: scheduleSlot.id,
                teacher_id: teacherId
              })
          }
        }
        
        // Assign classrooms
        if (scheduleSlot && classroomIds.length > 0) {
          for (const classroomId of classroomIds) {
            await supabase
              .from('schedule_slot_classrooms')
              .insert({
                schedule_slot_id: scheduleSlot.id,
                classroom_id: classroomId
              })
          }
        }
        
        totalImported++
        
      } catch (error) {
        console.error(`   ❌ Error processant ${classData.subject}:`, error)
        totalErrors++
      }
    }
  }
  
  console.log('\n✅ Importació completada!')
  console.log(`   📊 Total importats: ${totalImported}`)
  console.log(`   ❌ Total errors: ${totalErrors}`)
}

// Execute import
importSchedules().catch(console.error)