import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSemesterOrder() {
  console.log('Checking semester ordering issue...\n')

  // Get semesters ordered by 'number' (as the script does)
  const { data: semestersByNumber, error: error1 } = await supabase
    .from('semesters')
    .select('*')
    .order('number')

  console.log('Semesters ordered by "number":')
  console.log(semestersByNumber)
  
  // Get semesters ordered by name
  const { data: semestersByName } = await supabase
    .from('semesters')
    .select('*')
    .order('name')

  console.log('\nSemesters ordered by "name":')
  semestersByName?.forEach((s, idx) => {
    console.log(`[${idx}] ${s.name} (ID: ${s.id})`)
  })

  // Get semesters with proper ordering
  const { data: semestersByDate } = await supabase
    .from('semesters')
    .select('*')
    .order('start_date')

  console.log('\nSemesters ordered by "start_date":')
  semestersByDate?.forEach((s, idx) => {
    console.log(`[${idx}] ${s.name} (ID: ${s.id}) - Starts: ${s.start_date}`)
  })

  // Check table structure
  let columns = null
  try {
    const result = await supabase
      .rpc('get_table_columns', { table_name: 'semesters' })
    columns = result.data
  } catch (error) {
    // Function might not exist
  }

  if (columns) {
    console.log('\nSemesters table columns:')
    console.log(columns)
  }
}

checkSemesterOrder()