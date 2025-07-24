import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMigrationStatus() {
  console.log('🔍 Checking migration status...\n')

  // Check if the function exists with the semester parameter
  try {
    // Test the function with semester parameter
    const { data, error } = await supabase
      .rpc('check_classroom_week_conflicts', {
        p_classroom_id: '1e21a20c-da37-4da0-a886-a6a748761e4d', // P.1.12
        p_time_slot_id: '00000000-0000-0000-0000-000000000000', // dummy
        p_week_numbers: [1],
        p_exclude_assignment_id: null,
        p_semester_id: '3dbb586b-7ae8-4a82-9013-24220dedf632' // Second semester 2025-2026
      })

    if (error) {
      console.log('❌ Function error:', error.message)
      if (error.message.includes('p_semester_id')) {
        console.log('   The function does not have the semester parameter - migration not applied!')
      }
    } else {
      console.log('✅ Function accepts semester parameter - migration has been applied')
    }
  } catch (err: any) {
    console.error('Error checking function:', err.message)
  }

  // Check schema_migrations table if it exists
  let migrations = null
  try {
    const result = await supabase
      .from('schema_migrations')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(5)
    migrations = result.data
  } catch (error) {
    // Table might not exist
  }

  if (migrations) {
    console.log('\nLatest migrations:')
    migrations.forEach((m: any) => {
      console.log(`- ${m.version || m.name || m.filename}`)
    })
  }
}

checkMigrationStatus()