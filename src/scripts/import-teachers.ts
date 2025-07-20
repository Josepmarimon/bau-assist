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

async function importTeachers() {
  console.log('🚀 Starting teachers import...')

  try {
    // Read CSV file
    const csvPath = path.join(process.cwd(), 'csv', 'AssignacioDocent_2526_Preparacio(DISSENY).csv')
    const fileContent = fs.readFileSync(csvPath, 'latin1')
    
    const lines = fileContent.split('\n').slice(3)
    
    // Collect all unique teachers
    const teachersMap = new Map<string, any>()
    
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
            first_name: firstName.substring(0, 100),
            last_name: lastName.substring(0, 100),
            email: `prof${profId}@bau.edu`,
            department: fields[0] === 'GDIS' ? 'Disseny' : 'Belles Arts',
            contract_type: (fields[13] || 'indefinit').substring(0, 50),
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
            first_name: firstName.substring(0, 100),
            last_name: lastName.substring(0, 100),
            email: `prof${profId}@bau.edu`,
            department: fields[0] === 'GDIS' ? 'Disseny' : 'Belles Arts',
            contract_type: (fields[22] || 'indefinit').substring(0, 50),
            max_hours: 20
          })
        }
      }
    })

    // Clear existing teachers
    await supabase.from('teachers').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Insert teachers
    const teachersArray = Array.from(teachersMap.values())
    console.log(`👥 Inserting ${teachersArray.length} teachers...`)
    
    // Show first few teachers for debugging
    console.log('\n🔍 First 5 teachers:')
    teachersArray.slice(0, 5).forEach(teacher => {
      console.log(`  ${teacher.code}: ${teacher.first_name} ${teacher.last_name}`)
    })
    
    const { data, error } = await supabase
      .from('teachers')
      .insert(teachersArray)
      .select()

    if (error) {
      throw error
    }

    console.log(`✅ Teachers import completed successfully! Inserted ${data?.length || 0} teachers`)
    
    // Show summary by department
    const deptSummary = new Map<string, number>()
    teachersArray.forEach(teacher => {
      const dept = teacher.department
      deptSummary.set(dept, (deptSummary.get(dept) || 0) + 1)
    })
    
    console.log('\n📊 Summary by department:')
    deptSummary.forEach((count, dept) => {
      console.log(`  ${dept}: ${count} teachers`)
    })

  } catch (error) {
    console.error('❌ Error during import:', error)
  }
}

// Execute import
importTeachers()