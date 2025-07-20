import { createClient } from '@supabase/supabase-js'
import * as fs from 'fs'
import * as path from 'path'
import * as csv from 'csv-parse/sync'
import * as dotenv from 'dotenv'

// Carregar variables d'entorn
dotenv.config({ path: path.join(process.cwd(), '.env') })

// Configuració Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Error: Falten variables d\'entorn NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

interface CSVRow {
  Pla: string
  'Any Academic': string
  Curs: string
  'ID Assignatura': string
  'Nom assignatura': string
  'Orientacio assig': string
  'ID Itinerari': string
  'Area Coord': string
  'Crèdits': string
  Grup: string
  'ECTS Impartits': string
  'ECTS Regularitzats': string
  'ID Profe': string
  Titulacio: string
  'Doctorat Estat': string
  'Doctorat Any': string
  PDI: string
  Aulavirtual: string
}

async function importData() {
  console.log('🚀 Iniciant importació de dades...')

  try {
    // Llegir fitxer CSV
    const csvPath = path.join(process.cwd(), 'csv', 'AssignacioDocent_2526_Preparacio(DISSENY).csv')
    const fileContent = fs.readFileSync(csvPath, 'latin1') // latin1 per caràcters especials
    
    // Parsejar CSV (saltar les primeres 3 línies que són capçaleres)
    const lines = fileContent.split('\n').slice(3)
    const csvContent = lines.join('\n')
    
    const records: CSVRow[] = csv.parse(csvContent, {
      columns: true,
      delimiter: ';',
      skip_empty_lines: true,
    })

    // Filtrar registres vàlids del curs 2024/2025
    const validRecords = records.filter(r => 
      r['Any Academic'] === '2024/2025' && 
      r['ID Assignatura'] && 
      r['Nom assignatura']
    )

    console.log(`📊 Trobats ${validRecords.length} registres vàlids`)
    
    // Debug: veure assignatures úniques
    const uniqueSubjects = new Set(validRecords.map(r => r['ID Assignatura']))
    console.log(`📚 Assignatures úniques trobades: ${uniqueSubjects.size}`)
    
    // Debug: veure estructura d'un registre
    if (validRecords.length > 0) {
      console.log('\n🔍 Columnes del primer registre:')
      Object.keys(validRecords[0]).forEach((key, index) => {
        console.log(`  ${index}: "${key}" = "${(validRecords[0] as any)[key]}"`)
      })
    }

    // 1. Inserir/Actualitzar any acadèmic
    const { data: academicYear } = await supabase
      .from('academic_years')
      .upsert({
        name: '2024-2025',
        start_date: '2024-09-01',
        end_date: '2025-07-31',
        is_current: true
      }, { onConflict: 'name' })
      .select()
      .single()

    if (!academicYear) throw new Error('Error creant any acadèmic')

    // 2. Inserir semestres
    await supabase.from('semesters').upsert([
      {
        academic_year_id: academicYear.id,
        name: 'Primer Semestre 2024-2025',
        number: 1,
        start_date: '2024-09-01',
        end_date: '2025-01-31'
      },
      {
        academic_year_id: academicYear.id,
        name: 'Segon Semestre 2024-2025',
        number: 2,
        start_date: '2025-02-01',
        end_date: '2025-07-31'
      }
    ], { onConflict: 'academic_year_id,number' })

    // 3. Crear mapa d'assignatures úniques
    const subjectsMap = new Map<string, any>()
    validRecords.forEach(record => {
      if (!subjectsMap.has(record['ID Assignatura'])) {
        const year = parseInt(record.Curs.replace('GR', ''))
        subjectsMap.set(record['ID Assignatura'], {
          code: record['ID Assignatura'],
          name: record['Nom assignatura'],
          credits: parseInt(record['Crèdits']) || 6,
          year: isNaN(year) ? 1 : year,
          type: record['Nom assignatura'].toLowerCase().includes('tfg') ? 'tfg' : 
                record['Orientacio assig'] ? 'optativa' : 'obligatoria',
          department: record['Area Coord'] || 'Disseny',
          description: '',
          'ID Itinerari': record['ID Itinerari'] || null
        })
      }
    })

    // 4. Inserir assignatures
    console.log(`📚 Inserint ${subjectsMap.size} assignatures...`)
    const subjectsArray = Array.from(subjectsMap.values())
    await supabase.from('subjects').upsert(subjectsArray, { onConflict: 'code' })

    // 5. Crear mapa de professors únics - processant totes les línies del CSV
    const teachersMap = new Map<string, any>()
    
    // Processar cada línia directament per capturar TOTS els professors
    lines.forEach((line) => {
      if (!line.trim()) return
      
      const fields = line.split(';')
      
      // Professor del curs 2024/2025 (columna 13, índex 12)
      if (fields[12] && fields[12].trim() && fields[12] !== 'ID Profe') {
        const profId = fields[12].trim()
        if (!teachersMap.has(profId)) {
          let firstName = ''
          let lastName = ''
          
          // PDI està a la columna 17 (índex 16)
          if (fields[16] && fields[16].trim()) {
            const names = fields[16].trim().split(',').map(n => n.trim())
            lastName = names[0] || `Professor${profId}`
            firstName = names[1] || ''
          } else {
            lastName = `Professor`
            firstName = profId
          }
          
          teachersMap.set(profId, {
            code: `PROF${profId}`,
            first_name: firstName,
            last_name: lastName,
            email: `prof${profId}@bau.edu`,
            department: fields[0] === 'GDIS' ? 'Disseny' : 'Belles Arts',
            contract_type: fields[13] || 'indefinit', // Titulació
            max_hours: 20
          })
        }
      }
      
      // Professor del curs 2025/2026 (columna 22, índex 21)
      if (fields[21] && fields[21].trim() && fields[21] !== 'ID Profe') {
        const profId = fields[21].trim()
        if (!teachersMap.has(profId)) {
          let firstName = ''
          let lastName = ''
          
          // PDI del 2025/2026 està a la columna 24 (índex 23)
          if (fields[23] && fields[23].trim()) {
            const names = fields[23].trim().split(',').map(n => n.trim())
            lastName = names[0] || `Professor${profId}`
            firstName = names[1] || ''
          } else {
            lastName = `Professor`
            firstName = profId
          }
          
          teachersMap.set(profId, {
            code: `PROF${profId}`,
            first_name: firstName,
            last_name: lastName,
            email: `prof${profId}@bau.edu`,
            department: fields[0] === 'GDIS' ? 'Disseny' : 'Belles Arts',
            contract_type: fields[22] || 'indefinit', // Titulació 2025/2026
            max_hours: 20
          })
        }
      }
    })
    
    console.log(`👥 Trobats ${teachersMap.size} professors únics`)

    // 6. Inserir professors
    console.log(`👥 Inserint ${teachersMap.size} professors...`)
    const teachersArray = Array.from(teachersMap.values())
    await supabase.from('teachers').upsert(teachersArray, { onConflict: 'code' })

    // 7. Crear grups d'estudiants des del CSV
    const studentGroupsMap = new Map<string, any>()
    
    // Processar cada línia per capturar tots els grups
    lines.forEach((line) => {
      if (!line.trim()) return
      
      const fields = line.split(';')
      const curs = fields[2]?.trim() // GR1, GR2, etc.
      const grup = fields[9]?.trim() // M1, M2, T1, etc.
      
      if (curs && grup && grup !== 'Grup' && curs.startsWith('GR')) {
        const year = parseInt(curs.replace('GR', ''))
        const groupKey = `${curs}_${grup}`
        
        if (!studentGroupsMap.has(groupKey)) {
          // Determinar torn (matí/tarda)
          let shift = 'mati'
          if (grup.includes('t') || grup.includes('T')) {
            shift = 'tarda'
          }
          
          // Determinar capacitat segons el tipus de grup
          let capacity = 25 // Per defecte
          if (grup.startsWith('M') || grup.startsWith('T')) {
            capacity = 30 // Grups generals
          } else if (grup.includes('m') || grup.includes('t')) {
            capacity = 20 // Grups especialitzats
          }
          
          // Determinar el nom descriptiu
          let displayName = `${year}r ${grup}`
          if (grup.startsWith('A')) displayName = `${year}r Audiovisual ${grup}`
          else if (grup.startsWith('G')) displayName = `${year}r Gràfic ${grup}`
          else if (grup.startsWith('I')) displayName = `${year}r Interiors ${grup}`
          else if (grup.startsWith('M') && grup.length === 2) displayName = `${year}r Matí ${grup}`
          else if (grup.startsWith('M') && grup.length > 2) displayName = `${year}r Moda ${grup}`
          else if (grup.startsWith('T')) displayName = `${year}r Tarda ${grup}`
          
          studentGroupsMap.set(groupKey, {
            name: displayName,
            year: isNaN(year) ? 1 : year,
            shift: shift,
            max_students: capacity
          })
        }
      }
    })
    
    console.log(`👨‍🎓 Trobats ${studentGroupsMap.size} grups d'estudiants únics`)
    console.log('👨‍🎓 Inserint grups d\'estudiants...')
    
    const studentGroups = Array.from(studentGroupsMap.values())
    await supabase.from('student_groups').upsert(studentGroups, { onConflict: 'name' })

    console.log('✅ Importació completada amb èxit!')
    
    // Mostrar resum
    console.log('\n📊 Resum:')
    console.log(`- Assignatures: ${subjectsMap.size}`)
    console.log(`- Professors: ${teachersMap.size}`)
    console.log(`- Grups d'estudiants: ${studentGroups.length}`)

  } catch (error) {
    console.error('❌ Error durant la importació:', error)
  }
}

// Executar importació
importData()