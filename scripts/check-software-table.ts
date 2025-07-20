import { createClient } from '@supabase/supabase-js'
import * as path from 'path'
import * as dotenv from 'dotenv'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkSoftwareTable() {
  try {
    console.log('Checking software table structure...')

    // Try to select from software table
    const { data, error } = await supabase
      .from('software')
      .select('*')
      .limit(1)

    if (error) {
      console.error('Error accessing software table:', error.message)
      console.log('\nTrying to get table info from database...')
      
      // Try a raw SQL query to check if table exists
      const { data: tableInfo, error: sqlError } = await supabase
        .rpc('get_table_columns', { table_name: 'software' })
        .single()
      
      if (sqlError) {
        console.log('Could not get table info via RPC')
        console.log('\nIt seems the software table might not exist or the migration has not been run.')
        console.log('Please ensure the migrations have been applied to your Supabase project.')
      }
      
      return
    }

    console.log('Successfully accessed software table!')
    console.log('Current row count:', data?.length || 0)
    
    if (data && data.length > 0) {
      console.log('\nSample data structure:')
      console.log(JSON.stringify(data[0], null, 2))
    } else {
      console.log('\nTable is empty. Ready to import data.')
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the check
checkSoftwareTable()