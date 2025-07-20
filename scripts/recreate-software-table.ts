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

async function recreateSoftwareTable() {
  try {
    console.log('Recreating software table with correct structure...\n')

    // First, drop the existing table if it exists
    console.log('1. Dropping existing software table and related tables...')
    const dropQueries = [
      'DROP TABLE IF EXISTS subject_software CASCADE',
      'DROP TABLE IF EXISTS masters_software CASCADE',
      'DROP TABLE IF EXISTS software CASCADE'
    ]

    for (const query of dropQueries) {
      const { error } = await supabase.rpc('exec_sql', { query })
      if (error) {
        console.log(`   Warning: ${error.message}`)
      }
    }

    // Create the software table with the correct structure
    console.log('\n2. Creating software table...')
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS software (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        category VARCHAR(50) NOT NULL,
        license_type VARCHAR(50) NOT NULL,
        operating_systems JSONB DEFAULT '[]',
        version VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `

    const { error: createError } = await supabase.rpc('exec_sql', { query: createTableQuery })
    if (createError) {
      console.error('Error creating table:', createError.message)
      
      // If RPC doesn't work, let's try a different approach
      console.log('\n3. Trying alternative approach...')
      console.log('Unfortunately, we cannot directly execute DDL statements.')
      console.log('Please run the following SQL in your Supabase SQL editor:')
      console.log('\n--- SQL to execute ---')
      console.log(dropQueries.join(';\n') + ';')
      console.log(createTableQuery + ';')
      console.log('--- End of SQL ---\n')
      
      return
    }

    console.log('✅ Table created successfully!')

    // Test the new table
    console.log('\n4. Testing the new table structure...')
    const testData = {
      name: 'Test Software',
      category: 'general',
      license_type: 'open_source',
      operating_systems: ['Windows', 'macOS'],
      version: '1.0'
    }

    const { data, error: testError } = await supabase
      .from('software')
      .insert(testData)
      .select()
      .single()

    if (testError) {
      console.error('Test insert failed:', testError.message)
    } else {
      console.log('✅ Test insert successful!')
      console.log('Table structure:', Object.keys(data))
      
      // Clean up test
      await supabase.from('software').delete().eq('name', 'Test Software')
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the recreation
recreateSoftwareTable()