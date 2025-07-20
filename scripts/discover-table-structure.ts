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

async function discoverTableStructure() {
  try {
    console.log('Discovering software table structure...\n')

    // Try different insert patterns to discover the required fields
    const testPatterns = [
      { name: 'Test1', type: 'desktop' },
      { name: 'Test2', type: 'web' },
      { name: 'Test3', type: 'mobile' },
      { name: 'Test4', type: 'plugin' },
      { name: 'Test5', type: 'library' },
      { name: 'Test6', type: 'desktop', category: 'design' },
    ]

    for (const pattern of testPatterns) {
      console.log(`Testing pattern:`, JSON.stringify(pattern))
      const { data, error } = await supabase
        .from('software')
        .insert(pattern)
        .select()
        .single()

      if (error) {
        console.log(`  ❌ Error: ${error.message}`)
      } else {
        console.log(`  ✅ Success! Returned data:`)
        console.log(`     ${JSON.stringify(data, null, 2)}`)
        
        // Clean up successful test
        await supabase.from('software').delete().eq('name', pattern.name)
        
        // If successful, let's look at the structure
        console.log('\n  Table structure based on returned data:')
        for (const [key, value] of Object.entries(data)) {
          console.log(`     - ${key}: ${typeof value} ${Array.isArray(value) ? '(array)' : ''}`)
        }
        break
      }
    }

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the discovery
discoverTableStructure()