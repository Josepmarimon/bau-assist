import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ExcelRow {
  'Pla': string;
  'Curs': string;
  'ID Assignatura': string;
  'ID Profe': number;
  'Grup': string;
  'Orientació assig'?: string;
}

interface GroupData {
  subjectCode: string;
  groupCode: string;
  curs: string;
  grup: string;
  teachers: number[];
  orientacio?: string;
}

async function importGroupsFromExcel() {
  console.log('=== STARTING GROUPS IMPORT FROM EXCEL ===\n');
  
  // Configuration
  const EXCEL_PATH = '/Users/josepmarimon/Documents/grups.xlsx';
  const ACADEMIC_YEAR_ID = '2b210161-5447-4494-8003-f09a0b553a3f'; // 2025-2026
  const DRY_RUN = false; // Set to true to test without making changes
  
  try {
    // Read Excel file
    console.log('Reading Excel file...');
    const workbook = XLSX.readFile(EXCEL_PATH);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);
    console.log(`Found ${data.length} rows in Excel\n`);
    
    // Group data by subject and group
    console.log('Processing data...');
    const groupsMap = new Map<string, GroupData>();
    
    data.forEach(row => {
      const key = `${row['ID Assignatura']}_${row['Curs']}-${row['Grup']}`;
      
      if (!groupsMap.has(key)) {
        groupsMap.set(key, {
          subjectCode: row['ID Assignatura'],
          groupCode: `${row['Curs']}-${row['Grup']}`,
          curs: row['Curs'],
          grup: row['Grup'],
          teachers: [],
          orientacio: row['Orientació assig'] || undefined
        });
      }
      
      const group = groupsMap.get(key)!;
      if (row['ID Profe']) {
        group.teachers.push(row['ID Profe']);
      }
    });
    
    console.log(`Found ${groupsMap.size} unique subject-group combinations\n`);
    
    // Get subject and teacher data from database
    console.log('Fetching subjects from database...');
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('id, code, credits');
    
    if (subjectsError) throw subjectsError;
    
    const subjectMap = new Map(subjects?.map(s => [s.code, { id: s.id, credits: s.credits }]) || []);
    
    console.log('Fetching teachers from database...');
    const { data: teachers, error: teachersError } = await supabase
      .from('teachers')
      .select('id, id_profe');
    
    if (teachersError) throw teachersError;
    
    const teacherMap = new Map(teachers?.map(t => [String(t.id_profe), t.id]) || []);
    
    // Check for missing teacher 610
    if (!teacherMap.has('610')) {
      console.log('WARNING: Teacher ID 610 not found in database. Will skip assignments for this teacher.\n');
    }
    
    // Get semesters for the academic year
    console.log('Fetching semesters...');
    const { data: semesters, error: semestersError } = await supabase
      .from('semesters')
      .select('id, name')
      .eq('academic_year_id', ACADEMIC_YEAR_ID)
      .order('name');
    
    if (semestersError) throw semestersError;
    if (!semesters || semesters.length === 0) {
      throw new Error('No semesters found for academic year 2025-2026');
    }
    
    console.log(`Found ${semesters.length} semesters for 2025-2026\n`);
    
    // Import process
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    console.log('Starting import process...\n');
    
    for (const [key, groupData] of groupsMap) {
      try {
        const subjectInfo = subjectMap.get(groupData.subjectCode);
        if (!subjectInfo) {
          errors.push(`Subject ${groupData.subjectCode} not found in database`);
          errorCount++;
          continue;
        }
        const { id: subjectId, credits: subjectCredits } = subjectInfo;
        
        // Get subject details to determine semester
        const { data: subjectDetails } = await supabase
          .from('subjects')
          .select('semester')
          .eq('id', subjectId)
          .single();
        
        // Determine semester based on subject semester field
        let semesterId: string;
        if (subjectDetails?.semester === '2' || subjectDetails?.semester === 'Segon') {
          // Use second semester
          semesterId = semesters.find(s => s.name.includes('Segon'))?.id || semesters[1].id;
        } else {
          // Default to first semester
          semesterId = semesters.find(s => s.name.includes('Primer'))?.id || semesters[0].id;
        }
        
        // Determine group type based on group code
        // For now, use 'teoria' for all groups. This can be refined later
        const groupType = 'teoria';
        
        // Create course offering if it doesn't exist
        let courseOfferingId: string;
        
        if (!DRY_RUN) {
          const { data: existingOffering } = await supabase
            .from('course_offerings')
            .select('id')
            .eq('academic_year_id', ACADEMIC_YEAR_ID)
            .eq('semester_id', semesterId)
            .eq('subject_id', subjectId)
            .single();
          
          if (!existingOffering) {
            const { data: newOffering, error: offeringError } = await supabase
              .from('course_offerings')
              .insert({
                academic_year_id: ACADEMIC_YEAR_ID,
                semester_id: semesterId,
                subject_id: subjectId,
                total_ects: subjectCredits
              })
              .select('id')
              .single();
            
            if (offeringError) throw offeringError;
            courseOfferingId = newOffering.id;
            console.log(`Created course offering for ${groupData.subjectCode}`);
          } else {
            courseOfferingId = existingOffering.id;
          }
        } else {
          courseOfferingId = 'dry-run-offering-id';
          console.log(`[DRY RUN] Would create course offering for ${groupData.subjectCode}`);
        }
        
        // Create subject group
        let subjectGroupId: string;
        
        if (!DRY_RUN) {
          const { data: subjectGroup, error: groupError } = await supabase
            .from('subject_groups')
            .insert({
              subject_id: subjectId,
              semester_id: semesterId,
              group_type: groupType,
              group_code: groupData.groupCode,
              max_students: 30 // Default value, adjust as needed
            })
            .select('id')
            .single();
          
          if (groupError) throw groupError;
          subjectGroupId = subjectGroup.id;
        } else {
          subjectGroupId = 'dry-run-id';
        }
        
        console.log(`Created group ${groupData.groupCode} for ${groupData.subjectCode}`);
        
        // Create teaching assignments for each teacher
        const validTeachers = groupData.teachers.filter(tid => tid && tid !== null);
        
        if (validTeachers.length === 0) {
          console.log(`  WARNING: No teachers assigned to this group`);
        }
        
        for (const teacherId of validTeachers) {
          const teacherUuid = teacherMap.get(String(teacherId));
          if (!teacherUuid) {
            console.log(`  WARNING: Teacher ${teacherId} not found, skipping assignment`);
            continue;
          }
          
          if (!DRY_RUN) {
            const { error: assignmentError } = await supabase
              .from('teaching_assignments')
              .insert({
                course_offering_id: courseOfferingId,
                teacher_id: teacherUuid,
                ects_assigned: subjectCredits / validTeachers.length, // Divide ECTS among valid teachers
                is_coordinator: validTeachers[0] === teacherId // First teacher as coordinator
              });
            
            if (assignmentError) throw assignmentError;
          }
          console.log(`  Assigned teacher ${teacherId} to group`);
        }
        
        successCount++;
        
      } catch (error) {
        console.error(`Error processing ${key}:`, error);
        errors.push(`${key}: ${error}`);
        errorCount++;
      }
    }
    
    // Summary
    console.log('\n=== IMPORT SUMMARY ===');
    console.log(`Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}`);
    console.log(`Total groups processed: ${groupsMap.size}`);
    console.log(`Successfully imported: ${successCount}`);
    console.log(`Errors: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\nErrors encountered:');
      errors.forEach(err => console.log(`  - ${err}`));
    }
    
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the import
importGroupsFromExcel();