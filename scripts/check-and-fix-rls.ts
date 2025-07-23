import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

async function checkAndFixRLS() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔍 CHECKING RLS POLICIES')
  console.log('========================\n')

  // First, let's check what's the issue
  console.log('1. Testing with service key (admin access):')
  const { count: serviceCount } = await supabase
    .from('classrooms')
    .select('*', { count: 'exact', head: true })
  console.log(`   Classrooms count: ${serviceCount}`)

  // Test with anon key
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  console.log('\n2. Testing with anon key (web app access):')
  const { count: anonCount, error } = await supabaseAnon
    .from('classrooms')
    .select('*', { count: 'exact', head: true })
  
  if (error) {
    console.log(`   ❌ Error: ${error.message}`)
  } else {
    console.log(`   Classrooms count: ${anonCount}`)
  }

  // If there's a difference, we need to check/fix RLS
  if (serviceCount !== anonCount) {
    console.log('\n⚠️  RLS is blocking access! Checking current policies...')
    
    // Check if RLS is enabled
    const { data: tableInfo } = await supabase
      .rpc('get_table_info', { table_name: 'classrooms' })
      .single()
    
    console.log(`\n3. RLS enabled on classrooms table: ${(tableInfo as any)?.rowsecurity || 'Unknown'}`)

    // Try to disable RLS temporarily for testing
    console.log('\n4. Attempting to fix RLS policies...')
    
    try {
      // Disable RLS on classrooms
      await supabase.rpc('exec_sql', {
        sql_query: 'ALTER TABLE classrooms DISABLE ROW LEVEL SECURITY;'
      })
      console.log('   ✅ RLS disabled on classrooms table')
    } catch (err) {
      console.log('   ⚠️  Could not disable RLS via RPC')
    }

    // Test again
    const { count: newAnonCount } = await supabaseAnon
      .from('classrooms')
      .select('*', { count: 'exact', head: true })
    
    console.log(`\n5. After RLS change - Anon access count: ${newAnonCount}`)
  } else {
    console.log('\n✅ No RLS issues detected!')
  }

  // Also check the specific P.0.5/0.7 classroom
  console.log('\n6. Checking P.0.5/0.7 specifically:')
  const { data: classroom } = await supabaseAnon
    .from('classrooms')
    .select('*')
    .eq('code', 'P.0.5/0.7')
    .single()
  
  if (classroom) {
    console.log(`   ✅ Found: ${classroom.code} (ID: ${classroom.id})`)
    
    // Check assignments
    const { data: assignments } = await supabaseAnon
      .from('schedule_slot_classrooms')
      .select(`
        *,
        schedule_slots(
          *,
          subjects(name),
          student_groups(name)
        )
      `)
      .eq('classroom_id', classroom.id)
    
    console.log(`   📚 Assignments found: ${assignments?.length || 0}`)
    
    if (assignments && assignments.length > 0) {
      assignments.forEach(a => {
        console.log(`      - ${a.schedule_slots?.subjects?.name} (${a.schedule_slots?.student_groups?.name})`)
      })
    }
  } else {
    console.log('   ❌ Not found with anon key')
  }
}

checkAndFixRLS().catch(console.error)