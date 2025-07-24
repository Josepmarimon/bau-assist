import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function debugGroups() {
  // First, let's check if there are any subject_groups at all
  const { data: allGroups, error: allError } = await supabase
    .from('subject_groups')
    .select('*')
    .limit(5)

  console.log('Sample of subject_groups:')
  console.log(allGroups)
  console.log('Total found:', allGroups?.length)

  // Check for Infografia II specifically
  const { data: infografia } = await supabase
    .from('subjects')
    .select('id, name, code')
    .eq('code', 'GDVG93')
    .single()

  console.log('\nInfografia II subject ID:', infografia?.id)

  if (infografia?.id) {
    const { data: infografiaGroups } = await supabase
      .from('subject_groups')
      .select('*')
      .eq('subject_id', infografia.id)

    console.log('\nGroups for Infografia II:', infografiaGroups?.length || 0)
    console.log(infografiaGroups)
  }

  // Check semesters table
  const { data: semesters } = await supabase
    .from('semesters')
    .select('*')
    .order('name')

  console.log('\nAvailable semesters:')
  semesters?.forEach(s => {
    console.log(`- ${s.name} (ID: ${s.id})`)
  })
}

debugGroups()