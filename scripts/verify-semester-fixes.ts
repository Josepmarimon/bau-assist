import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifySemesterFixes() {
  console.log('🔍 Verifying semester fixes...\n')

  // List of subjects we fixed
  const subjectsToCheck = [
    { code: 'GDVG44', expectedSemester: '1r', name: 'Programació per Dissenyadors' },
    { code: 'GDB011', expectedSemester: '1r', name: 'Fonaments del Disseny II' },
    { code: 'GDB042', expectedSemester: '1r', name: 'Llenguatges Audiovisuals II' },
    { code: 'GDF012', expectedSemester: '1r', name: 'Taller de Creativitat' },
    { code: 'GDF041', expectedSemester: '1r', name: 'Taller de Color' },
    { code: 'GDF011', expectedSemester: '1r', name: 'Eines Informàtiques I' },
    { code: 'GDF021', expectedSemester: '1r', name: 'Taller d\'Expressió i Comunicació' },
    { code: 'GDF051', expectedSemester: '2n', name: 'Eines Informàtiques II' },
    { code: 'GDVG54', expectedSemester: '2n', name: 'Disseny i Publicitat' }
  ]

  let allCorrect = true

  for (const subjectInfo of subjectsToCheck) {
    const { data: subject } = await supabase
      .from('subjects')
      .select('code, name, semester')
      .eq('code', subjectInfo.code)
      .single()

    if (subject) {
      const isCorrect = subject.semester === subjectInfo.expectedSemester
      const status = isCorrect ? '✅' : '❌'
      
      console.log(`${status} ${subject.code} - ${subject.name}`)
      console.log(`   Current: ${subject.semester} | Expected: ${subjectInfo.expectedSemester}`)
      
      if (!isCorrect) {
        allCorrect = false
      }
    } else {
      console.log(`❓ ${subjectInfo.code} - Not found in database`)
      allCorrect = false
    }
  }

  console.log('\n' + '='.repeat(50))
  if (allCorrect) {
    console.log('✅ All subjects have correct semester assignments!')
  } else {
    console.log('❌ Some subjects still have incorrect semester assignments')
  }
}

verifySemesterFixes()