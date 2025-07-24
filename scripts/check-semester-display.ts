import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSemesterDisplay() {
  console.log('Checking semester data for subjects...\n')

  // Check Infografia II specifically
  const { data: infografia, error: infografiaError } = await supabase
    .from('subjects')
    .select('*')
    .or('name.ilike.%Infografia II%,code.eq.GDVG93')
    .single()

  if (infografiaError) {
    console.error('Error fetching Infografia II:', infografiaError)
  } else {
    console.log('Infografia II data:')
    console.log('- Code:', infografia.code)
    console.log('- Name:', infografia.name)
    console.log('- Semester:', infografia.semester)
    console.log('- Year:', infografia.year)
    console.log('- Full record:', JSON.stringify(infografia, null, 2))
  }

  // Check all subjects with semester data
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('code, name, semester')
    .eq('semester', '2n')
    .limit(5)

  if (subjectsError) {
    console.error('Error fetching subjects:', subjectsError)
  } else {
    console.log('\nOther second semester subjects:')
    subjects?.forEach(subject => {
      console.log(`- ${subject.code}: ${subject.name} (Semester: ${subject.semester})`)
    })
  }

  // Check unique semester values
  const { data: semesters, error: semestersError } = await supabase
    .from('subjects')
    .select('semester')
    .not('semester', 'is', null)

  if (semestersError) {
    console.error('Error fetching semester values:', semestersError)
  } else {
    const uniqueSemesters = [...new Set(semesters?.map(s => s.semester))]
    console.log('\nUnique semester values in database:', uniqueSemesters)
  }
}

checkSemesterDisplay()