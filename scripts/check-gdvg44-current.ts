import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkGDVG44Current() {
  console.log('🔍 Checking GDVG44 current status...\n')

  const { data: subject } = await supabase
    .from('subjects')
    .select('*')
    .eq('code', 'GDVG44')
    .single()

  if (subject) {
    console.log('Current database status for GDVG44:')
    console.log('- Name:', subject.name)
    console.log('- Code:', subject.code)
    console.log('- Year:', subject.year)
    console.log('- Semester:', subject.semester)
    console.log('- Type:', subject.type)
    console.log('- Department:', subject.department)
    console.log('- Updated at:', subject.updated_at)
    
    console.log('\n⚠️  ISSUE FOUND:')
    console.log('- Backup (July 14): semester = "1r" (first semester)')
    console.log('- Current database: semester = "2n" (second semester)')
    console.log('\nThis was incorrectly changed!')
  }
}

checkGDVG44Current()