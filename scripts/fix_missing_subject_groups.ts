import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

interface CSVRow {
  CODI_ASSIGNATURA: string;
  NOM_ASSIGNATURA: string;
  GRUP_CLASSE: string;
  [key: string]: string;
}

async function findSubjectsWithMissingGroups() {
  console.log('Finding subjects with assignments in CSV but no subject_groups...\n');

  // Get all subjects
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('id, name, code');

  if (subjectsError) {
    console.error('Error fetching subjects:', subjectsError);
    return;
  }

  // Get subjects with existing groups
  const { data: subjectGroups, error: groupsError } = await supabase
    .from('subject_groups')
    .select('subject_id, name');

  if (groupsError) {
    console.error('Error fetching subject groups:', groupsError);
    return;
  }

  // Create a map of subjects with groups
  const subjectsWithGroups = new Set(subjectGroups?.map(sg => sg.subject_id) || []);
  
  // Create a map of subject codes to IDs
  const subjectMap = new Map(subjects?.map(s => [s.code, s]) || []);

  // Read CSV file
  const csvPath = path.join(__dirname, '..', 'csv', 'AssignacioDocent_2526_Preparacio(DISSENY).csv');
  const csvRows: CSVRow[] = [];

  return new Promise<void>((resolve, reject) => {
    fs.createReadStream(csvPath)
      .pipe(parse({ 
        delimiter: ';',
        columns: true,
        skip_empty_lines: true
      }))
      .on('data', (row: CSVRow) => {
        csvRows.push(row);
      })
      .on('end', async () => {
        // Find unique subjects in CSV
        const csvSubjects = new Map<string, Set<string>>();
        
        for (const row of csvRows) {
          const code = row.CODI_ASSIGNATURA;
          const groupName = row.GRUP_CLASSE;
          
          if (code && groupName) {
            if (!csvSubjects.has(code)) {
              csvSubjects.set(code, new Set());
            }
            csvSubjects.get(code)!.add(groupName);
          }
        }

        // Find subjects with assignments in CSV but no groups in database
        const missingGroups: Array<{ subject: any, groups: string[] }> = [];
        
        for (const [code, groups] of csvSubjects) {
          const subject = subjectMap.get(code);
          if (subject && !subjectsWithGroups.has(subject.id)) {
            missingGroups.push({
              subject,
              groups: Array.from(groups)
            });
          }
        }

        console.log(`Found ${missingGroups.length} subjects with missing groups:\n`);
        
        for (const { subject, groups } of missingGroups) {
          console.log(`Subject: ${subject.name} (${subject.code})`);
          console.log(`  Groups in CSV: ${groups.join(', ')}`);
          console.log();
        }

        // Focus on "Projectes de Disseny Audiovisual I"
        const pdaI = missingGroups.find(mg => mg.subject.name.includes('Projectes de Disseny Audiovisual I'));
        if (pdaI) {
          console.log('\n--- Creating groups for "Projectes de Disseny Audiovisual I" ---\n');
          await createSubjectGroups(pdaI.subject, pdaI.groups);
        }

        // Also handle "Projectes de Disseny Audiovisual II"
        const pdaII = missingGroups.find(mg => mg.subject.name.includes('Projectes de Disseny Audiovisual II'));
        if (pdaII) {
          console.log('\n--- Creating groups for "Projectes de Disseny Audiovisual II" ---\n');
          await createSubjectGroups(pdaII.subject, pdaII.groups);
        }

        resolve();
      })
      .on('error', reject);
  });
}

async function createSubjectGroups(subject: any, groupNames: string[]) {
  for (const groupName of groupNames) {
    const groupData = {
      subject_id: subject.id,
      name: groupName,
      max_students: 30, // Default value, can be adjusted
      type: 'practical' // Since these are project subjects
    };

    console.log(`Creating group "${groupName}" for ${subject.name}...`);
    
    const { data, error } = await supabase
      .from('subject_groups')
      .insert(groupData)
      .select();

    if (error) {
      console.error(`  Error creating group: ${error.message}`);
    } else {
      console.log(`  ✓ Created group with ID: ${data[0].id}`);
    }
  }
}

// Run the script
findSubjectsWithMissingGroups()
  .then(() => {
    console.log('\nScript completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script error:', error);
    process.exit(1);
  });