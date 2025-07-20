#!/usr/bin/env tsx
/**
 * Compare the number of unique subjects between Excel/CSV files and Database
 * Version 2: Using correct file paths and merged data
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

async function compareSubjectCounts() {
  console.log('Comparing unique subject counts between source files and Database...');
  console.log('=' + '='.repeat(79));

  // 1. Analyze Excel schedules from merged data
  console.log('\n1. ANALYZING EXCEL SCHEDULE DATA...');
  
  const mergedDataPath = path.join(__dirname, '../csv/all_excel_schedules_merged.json');
  const mergedData = JSON.parse(fs.readFileSync(mergedDataPath, 'utf-8'));
  
  // Count unique subjects by degree
  const subjectsByDegree = new Map<string, Set<string>>();
  const allExcelSubjects = new Set<string>();
  
  mergedData.data.forEach((entry: any) => {
    const degree = entry.degree || 'UNKNOWN';
    const subject = entry.asignatura?.trim();
    
    if (subject) {
      allExcelSubjects.add(subject);
      
      if (!subjectsByDegree.has(degree)) {
        subjectsByDegree.set(degree, new Set());
      }
      subjectsByDegree.get(degree)!.add(subject);
    }
  });

  console.log('\nUnique subjects in Excel schedules by degree:');
  subjectsByDegree.forEach((subjects, degree) => {
    console.log(`  ${degree}: ${subjects.size} subjects`);
  });
  console.log(`  TOTAL: ${allExcelSubjects.size} unique subjects`);

  // Show sample subjects from each degree
  console.log('\nSample subjects from Excel:');
  subjectsByDegree.forEach((subjects, degree) => {
    console.log(`\n  ${degree} (first 5):`);
    Array.from(subjects).slice(0, 5).forEach(s => {
      console.log(`    - "${s}"`);
    });
  });

  // 2. Analyze Database subjects
  console.log('\n\n2. ANALYZING DATABASE SUBJECTS...');
  
  const { data: dbSubjects, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching subjects:', error);
    return;
  }

  // Categorize DB subjects by degree based on code patterns
  const dbSubjectsByDegree = new Map<string, Set<string>>();
  const allDBSubjects = new Set<string>();
  
  dbSubjects?.forEach(subject => {
    let degree = 'OTHER';
    
    // Determine degree from code
    if (subject.code.startsWith('GD') || subject.code.startsWith('DIS')) {
      degree = 'GDIS (Disseny)';
    } else if (subject.code.startsWith('BA') || subject.code.startsWith('GBA')) {
      degree = 'GBA (Belles Arts)';
    } else if (subject.code.includes('VM')) {
      degree = 'Moda';
    } else if (subject.code.includes('VA')) {
      degree = 'Audiovisual';
    } else if (subject.code.includes('VG')) {
      degree = 'Gràfic';
    } else if (subject.code.includes('VI')) {
      degree = 'Interiors';
    }
    
    allDBSubjects.add(subject.name);
    
    if (!dbSubjectsByDegree.has(degree)) {
      dbSubjectsByDegree.set(degree, new Set());
    }
    dbSubjectsByDegree.get(degree)!.add(subject.name);
  });

  console.log('\nUnique subjects in Database by degree:');
  dbSubjectsByDegree.forEach((subjects, degree) => {
    console.log(`  ${degree}: ${subjects.size} subjects`);
  });
  console.log(`  TOTAL: ${allDBSubjects.size} subjects`);

  // 3. Compare totals
  console.log('\n\n3. COMPARISON SUMMARY');
  console.log('=' + '='.repeat(79));
  
  console.log('\nOVERALL TOTALS:');
  console.log(`  Excel schedule files: ${allExcelSubjects.size} unique subjects`);
  console.log(`  Database: ${allDBSubjects.size} subjects`);
  console.log(`  Difference: ${allDBSubjects.size - allExcelSubjects.size} more subjects in DB`);

  console.log('\nBY DEGREE:');
  console.log('\n  DISSENY:');
  const gdisExcel = subjectsByDegree.get('GDIS')?.size || 0;
  const gdisDB = dbSubjectsByDegree.get('GDIS (Disseny)')?.size || 0;
  console.log(`    Excel: ${gdisExcel} subjects`);
  console.log(`    Database: ${gdisDB} subjects`);
  
  console.log('\n  BELLES ARTS:');
  const gbaExcel = subjectsByDegree.get('GBA')?.size || 0;
  const gbaDB = dbSubjectsByDegree.get('GBA (Belles Arts)')?.size || 0;
  console.log(`    Excel: ${gbaExcel} subjects`);
  console.log(`    Database: ${gbaDB} subjects`);

  // 4. Find subjects only in DB (not in Excel schedules)
  console.log('\n\n4. SUBJECTS IN DATABASE BUT NOT IN EXCEL SCHEDULES');
  console.log('=' + '='.repeat(79));
  
  const normalizedExcelSubjects = new Set(
    Array.from(allExcelSubjects).map(s => s.toLowerCase().trim())
  );
  
  const onlyInDB = Array.from(allDBSubjects).filter(dbSubject => {
    const normalized = dbSubject.toLowerCase().trim();
    // Check exact match
    if (normalizedExcelSubjects.has(normalized)) return false;
    
    // Check if Excel contains this as substring (for partial matches)
    for (const excelSubject of normalizedExcelSubjects) {
      if (excelSubject.includes(normalized) || normalized.includes(excelSubject)) {
        return false;
      }
    }
    return true;
  });

  console.log(`\nFound ${onlyInDB.length} subjects in DB but not in Excel schedules`);
  console.log('(This is expected - not all subjects have scheduled classes)');
  
  console.log('\nFirst 20 subjects only in DB:');
  onlyInDB.slice(0, 20).forEach(s => {
    const subject = dbSubjects?.find(sub => sub.name === s);
    console.log(`  - "${s}" (${subject?.code || 'NO CODE'})`);
  });

  // 5. Check CSV assignment files
  console.log('\n\n5. CHECKING CSV ASSIGNMENT FILES...');
  
  try {
    const dissenyCSV = fs.readFileSync(
      path.join(__dirname, '../csv/AssignacioDocent_2526_Preparacio(DISSENY).csv'), 
      'utf-8'
    );
    const dissenyLines = dissenyCSV.split('\n').filter(l => l.trim());
    console.log(`DISSENY CSV: ${dissenyLines.length} lines`);
    
    const bellesArtsCSV = fs.readFileSync(
      path.join(__dirname, '../csv/AssignacioDocent_2526_Preparacio(BELLES ARTS).csv'), 
      'utf-8'
    );
    const bellesArtsLines = bellesArtsCSV.split('\n').filter(l => l.trim());
    console.log(`BELLES ARTS CSV: ${bellesArtsLines.length} lines`);
    
    // These CSVs likely contain teacher assignments, not just subjects
    console.log('\n(Note: These CSV files contain teacher assignments, not just subject lists)');
  } catch (error) {
    console.log('Could not read assignment CSV files');
  }

  // Save detailed report
  const reportPath = path.join(__dirname, '../csv/subject_count_comparison.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    summary: {
      excel: {
        total: allExcelSubjects.size,
        by_degree: Object.fromEntries(
          Array.from(subjectsByDegree.entries()).map(([deg, subs]) => [deg, subs.size])
        )
      },
      database: {
        total: allDBSubjects.size,
        by_degree: Object.fromEntries(
          Array.from(dbSubjectsByDegree.entries()).map(([deg, subs]) => [deg, subs.size])
        )
      },
      subjects_only_in_db: onlyInDB.length
    }
  }, null, 2));
  
  console.log(`\n\nDetailed report saved to: ${reportPath}`);
}

// Run comparison
compareSubjectCounts();