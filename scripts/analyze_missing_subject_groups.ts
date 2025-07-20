import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { parse } from 'csv-parse';
import * as dotenv from 'dotenv';
import * as readline from 'readline';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

interface CSVRow {
  CODI_ASSIGNATURA: string;
  NOM_ASSIGNATURA: string;
  GRUP_CLASSE: string;
  HORES_SETMANA: string;
  TIPUS_ASSIGNATURA: string;
  [key: string]: string;
}

interface SubjectWithMissingGroups {
  subject: {
    id: string;
    name: string;
    code: string;
  };
  csvGroups: Array<{
    name: string;
    type: string;
    hoursPerWeek: number;
  }>;
  existingGroups: string[];
}

async function analyzeSubjectsAndGroups() {
  console.log('Analyzing subjects and their groups...\n');

  // Get all subjects
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('id, name, code')
    .order('name');

  if (subjectsError) {
    console.error('Error fetching subjects:', subjectsError);
    return;
  }

  // Get all subject groups
  const { data: subjectGroups, error: groupsError } = await supabase
    .from('subject_groups')
    .select('id, subject_id, name, type');

  if (groupsError) {
    console.error('Error fetching subject groups:', groupsError);
    return;
  }

  // Create maps for quick lookup
  const subjectMap = new Map(subjects?.map(s => [s.code, s]) || []);
  const groupsBySubject = new Map<string, any[]>();
  
  subjectGroups?.forEach(sg => {
    if (!groupsBySubject.has(sg.subject_id)) {
      groupsBySubject.set(sg.subject_id, []);
    }
    groupsBySubject.get(sg.subject_id)!.push(sg);
  });

  // Read CSV file
  const csvPath = path.join(__dirname, '..', 'csv', 'AssignacioDocent_2526_Preparacio(DISSENY).csv');
  const csvData = await readCSV(csvPath);

  // Analyze CSV data
  const csvSubjectGroups = new Map<string, Map<string, any>>();
  
  for (const row of csvData) {
    const code = row.CODI_ASSIGNATURA;
    const groupName = row.GRUP_CLASSE;
    const type = row.TIPUS_ASSIGNATURA;
    const hours = parseInt(row.HORES_SETMANA) || 0;
    
    if (code && groupName) {
      if (!csvSubjectGroups.has(code)) {
        csvSubjectGroups.set(code, new Map());
      }
      
      // Store unique group info
      if (!csvSubjectGroups.get(code)!.has(groupName)) {
        csvSubjectGroups.get(code)!.set(groupName, {
          name: groupName,
          type: mapAssignmentType(type),
          hoursPerWeek: hours
        });
      }
    }
  }

  // Find subjects with missing or incomplete groups
  const subjectsWithIssues: SubjectWithMissingGroups[] = [];
  
  for (const [code, csvGroups] of csvSubjectGroups) {
    const subject = subjectMap.get(code);
    if (subject) {
      const existingGroups = groupsBySubject.get(subject.id) || [];
      const existingGroupNames = existingGroups.map(g => g.name);
      const csvGroupsArray = Array.from(csvGroups.values());
      
      // Check if any CSV groups are missing in database
      const missingGroups = csvGroupsArray.filter(csvGroup => 
        !existingGroupNames.includes(csvGroup.name)
      );
      
      if (missingGroups.length > 0) {
        subjectsWithIssues.push({
          subject,
          csvGroups: csvGroupsArray,
          existingGroups: existingGroupNames
        });
      }
    }
  }

  // Display findings
  console.log(`Found ${subjectsWithIssues.length} subjects with missing groups:\n`);
  
  subjectsWithIssues.forEach((issue, index) => {
    console.log(`${index + 1}. ${issue.subject.name} (${issue.subject.code})`);
    console.log(`   Existing groups in DB: ${issue.existingGroups.length > 0 ? issue.existingGroups.join(', ') : 'NONE'}`);
    console.log(`   Groups in CSV: ${issue.csvGroups.map(g => `${g.name} (${g.type}, ${g.hoursPerWeek}h)`).join(', ')}`);
    console.log();
  });

  // Find specifically "Projectes de Disseny Audiovisual I"
  const pdaSubjects = subjectsWithIssues.filter(issue => 
    issue.subject.name.includes('Projectes de Disseny Audiovisual')
  );

  if (pdaSubjects.length > 0) {
    console.log('\n--- Projectes de Disseny Audiovisual subjects with missing groups ---\n');
    pdaSubjects.forEach(issue => {
      console.log(`• ${issue.subject.name} (${issue.subject.code})`);
      console.log(`  Missing groups: ${issue.csvGroups.map(g => g.name).join(', ')}`);
    });
  }

  return subjectsWithIssues;
}

async function readCSV(filePath: string): Promise<CSVRow[]> {
  const rows: CSVRow[] = [];
  
  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(parse({ 
        delimiter: ';',
        columns: true,
        skip_empty_lines: true
      }))
      .on('data', (row: CSVRow) => {
        rows.push(row);
      })
      .on('end', () => resolve(rows))
      .on('error', reject);
  });
}

function mapAssignmentType(csvType: string): string {
  // Map CSV assignment types to database group types
  const typeMap: { [key: string]: string } = {
    'TEOR': 'theoretical',
    'PRAC': 'practical',
    'PROJ': 'practical',
    'SEM': 'seminar',
    'SEMI': 'seminar',
    'LAB': 'laboratory'
  };
  
  return typeMap[csvType] || 'practical';
}

async function createMissingGroups(issues: SubjectWithMissingGroups[]) {
  console.log('\n--- Creating missing groups ---\n');
  
  for (const issue of issues) {
    console.log(`Creating groups for ${issue.subject.name}...`);
    
    for (const csvGroup of issue.csvGroups) {
      // Check if group already exists
      if (issue.existingGroups.includes(csvGroup.name)) {
        console.log(`  ⏭️  Group "${csvGroup.name}" already exists, skipping...`);
        continue;
      }
      
      const groupData = {
        subject_id: issue.subject.id,
        name: csvGroup.name,
        type: csvGroup.type,
        max_students: csvGroup.type === 'theoretical' ? 60 : 30,
        description: `Created from CSV import - ${csvGroup.hoursPerWeek} hours/week`
      };
      
      const { data, error } = await supabase
        .from('subject_groups')
        .insert(groupData)
        .select();
      
      if (error) {
        console.error(`  ❌ Error creating group "${csvGroup.name}": ${error.message}`);
      } else {
        console.log(`  ✅ Created group "${csvGroup.name}" with ID: ${data[0].id}`);
      }
    }
  }
}

async function promptUser(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// Main execution
async function main() {
  try {
    const issues = await analyzeSubjectsAndGroups();
    
    if (!issues || issues.length === 0) {
      console.log('\nNo subjects with missing groups found!');
      rl.close();
      return;
    }
    
    console.log('\nOptions:');
    console.log('1. Create all missing groups');
    console.log('2. Create only Projectes de Disseny Audiovisual groups');
    console.log('3. Exit without creating groups');
    
    const choice = await promptUser('\nEnter your choice (1-3): ');
    
    switch (choice) {
      case '1':
        await createMissingGroups(issues);
        break;
      case '2':
        const pdaIssues = issues.filter(issue => 
          issue.subject.name.includes('Projectes de Disseny Audiovisual')
        );
        if (pdaIssues.length > 0) {
          await createMissingGroups(pdaIssues);
        } else {
          console.log('\nNo Projectes de Disseny Audiovisual subjects found with missing groups.');
        }
        break;
      case '3':
        console.log('\nExiting without creating groups.');
        break;
      default:
        console.log('\nInvalid choice. Exiting.');
    }
    
    rl.close();
  } catch (error) {
    console.error('Error:', error);
    rl.close();
    process.exit(1);
  }
}

main();