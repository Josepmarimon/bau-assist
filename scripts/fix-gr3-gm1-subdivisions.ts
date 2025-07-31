import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function fixGR3Gm1Subdivisions() {
  console.log('🔧 Starting to fix GR3-Gm1a and GR3-Gm1b subdivisions...')

  try {
    // First, check if these groups exist
    const { data: subGroups, error: checkError } = await supabase
      .from('subject_groups')
      .select('*, subjects(name, code)')
      .in('group_code', ['GR3-Gm1a', 'GR3-Gm1b'])

    if (checkError) throw checkError

    if (!subGroups || subGroups.length === 0) {
      console.log('✅ No GR3-Gm1a or GR3-Gm1b groups found. Nothing to fix.')
      return
    }

    console.log(`Found ${subGroups.length} subdivision groups to fix:`)
    subGroups.forEach(sg => {
      console.log(`  - ${sg.group_code} for subject: ${sg.subjects?.name} (${sg.subjects?.code})`)
    })

    // Get the subject and semester info
    const { subject_id, semester_id } = subGroups[0]

    // Check if there are any assignments
    const assignmentIds = subGroups.map(sg => sg.id)
    const { data: assignments, error: assignError } = await supabase
      .from('assignments')
      .select('id')
      .in('subject_group_id', assignmentIds)

    if (assignError) throw assignError

    if (assignments && assignments.length > 0) {
      console.log(`⚠️  Found ${assignments.length} assignments for these groups. Deleting them...`)
      
      const { error: deleteAssignError } = await supabase
        .from('assignments')
        .delete()
        .in('subject_group_id', assignmentIds)

      if (deleteAssignError) throw deleteAssignError
      console.log('✅ Assignments deleted')
    }

    // Check if GR3-Gm1 already exists for this subject
    const { data: existingGm1, error: checkGm1Error } = await supabase
      .from('subject_groups')
      .select('id')
      .eq('subject_id', subject_id)
      .eq('semester_id', semester_id)
      .eq('group_code', 'GR3-Gm1')
      .single()

    if (checkGm1Error && checkGm1Error.code !== 'PGRST116') throw checkGm1Error

    if (!existingGm1) {
      console.log('📝 Creating GR3-Gm1 group for this subject...')
      
      const { error: insertError } = await supabase
        .from('subject_groups')
        .insert({
          subject_id,
          semester_id,
          group_code: 'GR3-Gm1',
          max_students: 25
        })

      if (insertError) throw insertError
      console.log('✅ GR3-Gm1 group created')
    } else {
      console.log('✅ GR3-Gm1 already exists for this subject')
    }

    // Delete the subdivision groups
    console.log('🗑️  Deleting GR3-Gm1a and GR3-Gm1b groups...')
    
    const { error: deleteError } = await supabase
      .from('subject_groups')
      .delete()
      .in('group_code', ['GR3-Gm1a', 'GR3-Gm1b'])

    if (deleteError) throw deleteError

    console.log('✅ Successfully removed GR3-Gm1a and GR3-Gm1b subdivisions!')
    console.log('✅ Subject now uses standard GR3-Gm1 group')

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

fixGR3Gm1Subdivisions()