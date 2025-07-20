#!/usr/bin/env tsx
/**
 * Investigate malformed subjects like "22/04)" that appear to be dates
 * or extraction errors
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function investigateMalformedSubjects() {
  console.log('Investigating malformed subjects that look like dates or errors...');
  console.log('=' + '='.repeat(79));

  // Pattern to identify suspicious subject names
  const suspiciousPatterns = [
    /^\d+\/\d+\)$/,        // Like "22/04)"
    /^\d+\/\d+$/,          // Like "22/04"
    /^[A-Z]\d+$/,          // Like "P1" or "G2"
    /^Gm\d+[a-z]?$/,       // Like "Gm1" or "Gm1b"
    /^\)$/,                // Just closing parenthesis
    /^[\d\s]+$/,           // Just numbers and spaces
    /^[^\w\s]{1,5}$/,      // Very short non-word characters
  ];

  // Get all subjects
  const { data: subjects, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching subjects:', error);
    return;
  }

  const malformedSubjects = subjects?.filter(subject => {
    return suspiciousPatterns.some(pattern => pattern.test(subject.name));
  }) || [];

  console.log(`Found ${malformedSubjects.length} potentially malformed subjects:\n`);

  if (malformedSubjects.length === 0) {
    console.log('No malformed subjects found!');
    return;
  }

  // Display malformed subjects with details
  console.log('ID | Code | Name | Year | Type | Has Assignments?');
  console.log('-'.repeat(80));
  
  for (const subject of malformedSubjects) {
    // Check if it has assignments
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id')
      .eq('subject_id', subject.id)
      .limit(1);
    
    const hasAssignments = !!(assignments && assignments.length > 0);
    
    console.log(
      `${subject.id.substring(0, 8)} | ` +
      `${(subject.code || '').padEnd(10)} | ` +
      `"${subject.name.padEnd(15)}" | ` +
      `${subject.year} | ` +
      `${subject.type.padEnd(10)} | ` +
      `${hasAssignments ? 'Yes' : 'No'}`
    );
  }

  // Look for these in the original Excel data
  console.log('\n' + '='.repeat(80));
  console.log('SEARCHING IN ORIGINAL EXCEL DATA...');
  console.log('='.repeat(80));

  const excelDataPath = path.join(__dirname, '../csv/all_excel_schedules_merged.json');
  const excelData = JSON.parse(fs.readFileSync(excelDataPath, 'utf-8'));
  
  for (const subject of malformedSubjects) {
    const matches = excelData.data.filter((entry: any) => 
      entry.asignatura === subject.name || 
      entry.asignatura.includes(subject.name) ||
      subject.name.includes(entry.asignatura)
    );
    
    if (matches.length > 0) {
      console.log(`\n"${subject.name}" found in Excel:`);
      matches.slice(0, 3).forEach((match: any) => {
        console.log(`  - Degree: ${match.degree}, File: ${match.original_file}`);
        console.log(`    Time: ${match.horari}, Group: ${match.grup}`);
      });
    } else {
      console.log(`\n"${subject.name}" - NOT found in Excel data`);
    }
  }

  // Generate deletion script
  console.log('\n' + '='.repeat(80));
  console.log('RECOMMENDED ACTIONS');
  console.log('='.repeat(80));

  const toDelete = malformedSubjects.filter(s => 
    !s.name.startsWith('Gm') && // Keep group-like names for now
    suspiciousPatterns.slice(0, 3).some(p => p.test(s.name)) // Focus on date-like patterns
  );

  if (toDelete.length > 0) {
    console.log('\nSubjects recommended for deletion:');
    toDelete.forEach(s => console.log(`  - "${s.name}" (${s.code})`));

    // Create deletion script
    const deletionScriptPath = path.join(__dirname, 'delete-malformed-subjects.ts');
    const deletionScript = `#!/usr/bin/env tsx
/**
 * Delete malformed subjects that appear to be extraction errors
 * Generated on: ${new Date().toISOString()}
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteMalformedSubjects() {
  const subjectsToDelete = ${JSON.stringify(toDelete.map(s => ({ id: s.id, name: s.name })), null, 2)};

  console.log('Deleting malformed subjects...');
  
  for (const subject of subjectsToDelete) {
    console.log(\`Deleting "\${subject.name}"...\`);
    
    // First delete any assignments
    await supabase
      .from('assignments')
      .delete()
      .eq('subject_id', subject.id);
    
    // Then delete the subject
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subject.id);
    
    if (error) {
      console.error(\`Failed to delete \${subject.name}:\`, error);
    } else {
      console.log(\`✓ Deleted "\${subject.name}"\`);
    }
  }
  
  console.log('\\nDeletion complete!');
}

deleteMalformedSubjects();
`;

    fs.writeFileSync(deletionScriptPath, deletionScript);
    console.log(`\nDeletion script created: ${deletionScriptPath}`);
    console.log('Run it with: npx tsx delete-malformed-subjects.ts');
  }
}

// Run investigation
investigateMalformedSubjects();