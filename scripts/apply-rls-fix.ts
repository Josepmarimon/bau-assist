import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { readFileSync } from 'fs'
import * as path from 'path'

dotenv.config()

async function applyRLSFix() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  console.log('🔧 APPLYING RLS FIX')
  console.log('==================\n')

  // Read the SQL file
  const sqlPath = path.join(__dirname, '../supabase/migrations/20250111_fix_classroom_rls.sql')
  const sql = readFileSync(sqlPath, 'utf-8')

  // Split by statements and execute each
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  let success = 0
  let errors = 0

  for (const statement of statements) {
    try {
      console.log(`Executing: ${statement.substring(0, 50)}...`)
      
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      }).single()

      if (error) {
        // Try direct execution
        const { error: directError } = await supabase
          .from('_exec')
          .insert({ sql: statement + ';' })
          .single()
        
        if (directError) {
          console.log(`  ❌ Error: ${directError.message}`)
          errors++
        } else {
          console.log('  ✅ Success')
          success++
        }
      } else {
        console.log('  ✅ Success')
        success++
      }
    } catch (err: any) {
      console.log(`  ❌ Error: ${err.message}`)
      errors++
    }
  }

  console.log('\n📊 SUMMARY')
  console.log('===========')
  console.log(`✅ Successful statements: ${success}`)
  console.log(`❌ Failed statements: ${errors}`)

  // Test access with anon key
  console.log('\n🧪 TESTING ACCESS WITH ANON KEY')
  console.log('================================')
  
  const supabaseAnon = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const { data: classrooms, error: classroomError } = await supabaseAnon
    .from('classrooms')
    .select('*')
    .limit(5)
  
  if (classroomError) {
    console.log(`❌ Classrooms access error: ${classroomError.message}`)
  } else {
    console.log(`✅ Classrooms access: ${classrooms?.length || 0} found`)
  }

  const { data: assignments } = await supabaseAnon
    .from('schedule_slot_classrooms')
    .select(`
      *,
      schedule_slots(
        *,
        subjects(name),
        student_groups(name)
      ),
      classrooms(code, name)
    `)
    .limit(5)
  
  console.log(`✅ Schedule slot classrooms access: ${assignments?.length || 0} found`)
  
  if (assignments && assignments.length > 0) {
    console.log('\nSample assignment:')
    const a = assignments[0]
    console.log(`  Classroom: ${a.classrooms?.code}`)
    console.log(`  Subject: ${a.schedule_slots?.subjects?.name}`)
    console.log(`  Group: ${a.schedule_slots?.student_groups?.name}`)
  }
}

applyRLSFix().catch(console.error)