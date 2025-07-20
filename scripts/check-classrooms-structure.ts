import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkClassroomsTable() {
  const { data, error } = await supabase.from('classrooms').select('*').limit(1)
  
  if (error) {
    console.error('Error:', error)
    return
  }
  
  if (data && data.length > 0) {
    console.log('Classroom columns:', Object.keys(data[0]))
    console.log('Sample classroom:', data[0])
  } else {
    console.log('No classrooms found')
  }
}

checkClassroomsTable()