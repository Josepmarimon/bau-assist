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

async function copySoftwareRequirementsToNewYear(fromYear: string, toYear: string) {
  try {
    console.log(`Copying software requirements from ${fromYear} to ${toYear}...`)

    // First, check if we already have data for the target year
    const { data: existingData, error: checkError } = await supabase
      .from('subject_software')
      .select('id')
      .eq('academic_year', toYear)
      .limit(1)

    if (checkError) {
      console.error('Error checking existing data:', checkError)
      return
    }

    if (existingData && existingData.length > 0) {
      console.log(`\n⚠️  Warning: Data already exists for ${toYear}`)
      console.log('To avoid duplicates, please delete existing data first if you want to recopy.')
      return
    }

    // Get all requirements from the source year
    const { data: sourceData, error: sourceError } = await supabase
      .from('subject_software')
      .select(`
        subject_id,
        software_id,
        is_required,
        notes
      `)
      .eq('academic_year', fromYear)

    if (sourceError) {
      console.error('Error loading source data:', sourceError)
      return
    }

    if (!sourceData || sourceData.length === 0) {
      console.log(`No data found for ${fromYear}`)
      return
    }

    console.log(`Found ${sourceData.length} software requirements to copy`)

    // Prepare data for the new year
    const newData = sourceData.map(item => ({
      ...item,
      academic_year: toYear,
      notes: item.notes ? `${item.notes} (Copied from ${fromYear})` : `Copied from ${fromYear}`
    }))

    // Insert in batches to avoid timeouts
    const batchSize = 50
    let successCount = 0

    for (let i = 0; i < newData.length; i += batchSize) {
      const batch = newData.slice(i, i + batchSize)
      const { error: insertError } = await supabase
        .from('subject_software')
        .insert(batch)

      if (insertError) {
        console.error(`Error inserting batch ${i / batchSize + 1}:`, insertError)
      } else {
        successCount += batch.length
        console.log(`Inserted batch ${i / batchSize + 1} (${batch.length} records)`)
      }
    }

    console.log(`\n✅ Successfully copied ${successCount} requirements from ${fromYear} to ${toYear}`)

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Example usage
async function main() {
  // Copy from 2024-2025 to 2025-2026
  await copySoftwareRequirementsToNewYear('2024-2025', '2025-2026')
  
  // You could also copy to future years
  // await copySoftwareRequirementsToNewYear('2024-2025', '2026-2027')
}

// Run the script
main()