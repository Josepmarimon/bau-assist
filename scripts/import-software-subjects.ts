import { createClient } from '@supabase/supabase-js'
import { parse } from 'csv-parse/sync'
import * as fs from 'fs'
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

async function importSoftwareSubjectRelations() {
  try {
    console.log('Starting software-subject relations import...')
    console.log('This will carefully map software to subjects based on the CSV data\n')

    // Read Software CSV
    const csvPath = path.join(__dirname, '../csv/Software-Grid view.csv')
    const csvContent = fs.readFileSync(csvPath, 'utf-8')
    const softwareRecords = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      bom: true
    })

    // Get all subjects from database for mapping
    console.log('Loading subjects from database...')
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, code, name')
      .order('code')

    if (subjectsError) {
      console.error('Error loading subjects:', subjectsError)
      return
    }

    console.log(`Found ${subjects?.length || 0} subjects in database`)

    // Get all software from database
    console.log('Loading software from database...')
    const { data: software, error: softwareError } = await supabase
      .from('software')
      .select('id, name')
      .order('name')

    if (softwareError) {
      console.error('Error loading software:', softwareError)
      return
    }

    console.log(`Found ${software?.length || 0} software items in database`)

    // Create maps for easy lookup
    const subjectsByName = new Map()
    subjects?.forEach(s => {
      subjectsByName.set(s.name.toLowerCase().trim(), s)
      // Also store by partial name for better matching
      const words = s.name.toLowerCase().split(' ')
      if (words.length > 2) {
        subjectsByName.set(words.slice(0, 3).join(' '), s)
      }
    })

    const softwareByName = new Map()
    software?.forEach(s => {
      softwareByName.set(s.name.toLowerCase().trim(), s)
    })

    // Clear existing relations to avoid duplicates
    console.log('\nClearing existing subject-software relations...')
    await supabase.from('subject_software').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Process relations
    let totalRelations = 0
    let successfulRelations = 0
    let failedRelations = 0
    const notFoundSubjects = new Set<string>()
    const notFoundSoftware = new Set<string>()

    console.log('\nProcessing software-subject relations...')

    for (const record of softwareRecords) {
      if (!record.Name || !record['Assignatures (from Perfil tècnic)']) continue

      const softwareName = record.Name.trim()
      const softwareItem = softwareByName.get(softwareName.toLowerCase())

      if (!softwareItem) {
        notFoundSoftware.add(softwareName)
        continue
      }

      // Parse subjects list
      const subjectsList = record['Assignatures (from Perfil tècnic)']
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)

      console.log(`\n${softwareName} needs to be linked to ${subjectsList.length} subjects`)

      for (const subjectName of subjectsList) {
        totalRelations++
        
        // Try to find the subject
        let subject = null
        const searchName = subjectName.toLowerCase().trim()
        
        // First try exact match
        subject = subjectsByName.get(searchName)
        
        // If not found, try partial matches
        if (!subject) {
          // Try to match by key words
          for (const [key, value] of subjectsByName) {
            if (searchName.includes(key) || key.includes(searchName)) {
              subject = value
              break
            }
          }
        }

        if (!subject) {
          notFoundSubjects.add(subjectName)
          failedRelations++
          console.log(`  ❌ Could not find subject: "${subjectName}"`)
          continue
        }

        // Create the relation
        const relation = {
          subject_id: subject.id,
          software_id: softwareItem.id,
          is_required: true
        }

        const { error: relationError } = await supabase
          .from('subject_software')
          .insert(relation)

        if (relationError) {
          console.log(`  ❌ Error linking ${softwareName} to ${subject.name}: ${relationError.message}`)
          failedRelations++
        } else {
          console.log(`  ✓ Linked ${softwareName} to ${subject.name}`)
          successfulRelations++
        }
      }
    }

    // Report summary
    console.log('\n========================================')
    console.log('IMPORT SUMMARY')
    console.log('========================================')
    console.log(`Total relations processed: ${totalRelations}`)
    console.log(`Successful relations: ${successfulRelations}`)
    console.log(`Failed relations: ${failedRelations}`)

    if (notFoundSubjects.size > 0) {
      console.log('\nSubjects not found in database:')
      Array.from(notFoundSubjects).sort().forEach(s => {
        console.log(`  - "${s}"`)
      })
      console.log('\nThese might be:')
      console.log('  - Different subject names in the database')
      console.log('  - Subjects that haven\'t been imported yet')
      console.log('  - Typos or variations in naming')
    }

    if (notFoundSoftware.size > 0) {
      console.log('\nSoftware not found in database:')
      Array.from(notFoundSoftware).sort().forEach(s => {
        console.log(`  - "${s}"`)
      })
    }

    // Show some statistics
    console.log('\n========================================')
    console.log('SOFTWARE USAGE STATISTICS')
    console.log('========================================')
    
    const { data: stats } = await supabase
      .from('subject_software')
      .select(`
        software:software_id(name),
        subject:subject_id(name)
      `)
    
    // Count usage per software
    const usageCount = new Map<string, number>()
    stats?.forEach(relation => {
      const software = Array.isArray(relation.software) ? relation.software[0] : relation.software
      const softwareName = software?.name
      if (softwareName) {
        usageCount.set(softwareName, (usageCount.get(softwareName) || 0) + 1)
      }
    })

    console.log('\nTop 10 most used software:')
    Array.from(usageCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .forEach(([software, count], index) => {
        console.log(`  ${index + 1}. ${software}: ${count} subjects`)
      })

  } catch (error) {
    console.error('Unexpected error:', error)
  }
}

// Run the import
importSoftwareSubjectRelations()