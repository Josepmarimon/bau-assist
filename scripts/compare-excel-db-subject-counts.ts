#!/usr/bin/env tsx
/**
 * Compare the number of unique subjects in Excel files vs Database
 * Specifically for DISSENY and Belles Arts
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import * as XLSX from 'xlsx';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface SubjectCount {
  degree: string;
  excelCount: number;
  dbCount: number;
  excelSubjects: Set<string>;
  dbSubjects: Set<string>;
  onlyInExcel: string[];
  onlyInDB: string[];
}

async function compareSubjectCounts() {
  console.log('Comparing subject counts between Excel files and Database...');
  console.log('=' + '='.repeat(79));

  const results: SubjectCount[] = [];

  // 1. Analyze DISSENY Excel file
  console.log('\n1. ANALYZING DISSENY EXCEL FILE...');
  const dissenyPath = path.join(__dirname, '../csv/AssignacioDocent_2526_Preparacio(DISSENY).xlsx');
  
  try {
    const workbook = XLSX.readFile(dissenyPath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
    
    // Find unique subjects (typically in column B or C, starting from row 2)
    const dissenySubjects = new Set<string>();
    
    for (let i = 1; i < data.length; i++) {
      const row = data[i];
      // Try different columns where subject names might be
      for (let j = 0; j < Math.min(5, row.length); j++) {
        const cell = row[j];
        if (cell && typeof cell === 'string' && cell.trim().length > 3) {
          // Basic heuristic: if it looks like a subject name
          if (!cell.match(/^\d+$/) && !cell.match(/^[A-Z]{1,3}\d*$/)) {
            dissenySubjects.add(cell.trim());
          }
        }
      }
    }
    
    console.log(`Found ${dissenySubjects.size} unique subjects in DISSENY Excel`);
    
    // Store DISSENY results
    results.push({
      degree: 'DISSENY',
      excelCount: dissenySubjects.size,
      dbCount: 0,
      excelSubjects: dissenySubjects,
      dbSubjects: new Set(),
      onlyInExcel: [],
      onlyInDB: []
    });
    
  } catch (error) {
    console.error('Error reading DISSENY file:', error);
  }

  // 2. Analyze Belles Arts Excel files
  console.log('\n2. ANALYZING BELLES ARTS EXCEL FILES...');
  const bellesArtsDir = path.join(__dirname, '../csv/excelhorari');
  const bellesArtsSubjects = new Set<string>();
  
  try {
    const files = fs.readdirSync(bellesArtsDir);
    const gbaFiles = files.filter(f => f.includes('GBA') && f.endsWith('.xlsx'));
    
    console.log(`Found ${gbaFiles.length} Belles Arts Excel files`);
    
    // Load the merged data which already has extracted subjects
    const mergedDataPath = path.join(__dirname, '../csv/all_excel_schedules_merged.json');
    const mergedData = JSON.parse(fs.readFileSync(mergedDataPath, 'utf-8'));
    
    // Filter for GBA subjects
    mergedData.data.forEach((entry: any) => {
      if (entry.degree === 'GBA' && entry.asignatura) {
        bellesArtsSubjects.add(entry.asignatura.trim());
      }
    });
    
    console.log(`Found ${bellesArtsSubjects.size} unique subjects in Belles Arts Excel files`);
    
    // Store Belles Arts results
    results.push({
      degree: 'BELLES ARTS',
      excelCount: bellesArtsSubjects.size,
      dbCount: 0,
      excelSubjects: bellesArtsSubjects,
      dbSubjects: new Set(),
      onlyInExcel: [],
      onlyInDB: []
    });
    
  } catch (error) {
    console.error('Error reading Belles Arts files:', error);
  }

  // 3. Get subjects from database
  console.log('\n3. ANALYZING DATABASE SUBJECTS...');
  
  const { data: dbSubjects, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching subjects:', error);
    return;
  }

  // Categorize DB subjects
  const dissenyDBSubjects = new Set<string>();
  const bellesArtsDBSubjects = new Set<string>();
  const otherDBSubjects = new Set<string>();

  dbSubjects?.forEach(subject => {
    // Determine degree based on code patterns
    if (subject.code.startsWith('GD') || subject.code.startsWith('DIS')) {
      dissenyDBSubjects.add(subject.name);
    } else if (subject.code.startsWith('BA') || subject.code.startsWith('GBA')) {
      bellesArtsDBSubjects.add(subject.name);
    } else {
      otherDBSubjects.add(subject.name);
    }
  });

  console.log(`Database subjects by degree:`);
  console.log(`  - DISSENY: ${dissenyDBSubjects.size}`);
  console.log(`  - BELLES ARTS: ${bellesArtsDBSubjects.size}`);
  console.log(`  - OTHER/UNCLEAR: ${otherDBSubjects.size}`);

  // Update results with DB counts
  results[0].dbCount = dissenyDBSubjects.size;
  results[0].dbSubjects = dissenyDBSubjects;
  results[1].dbCount = bellesArtsDBSubjects.size;
  results[1].dbSubjects = bellesArtsDBSubjects;

  // 4. Compare and find differences
  console.log('\n4. COMPARING EXCEL VS DATABASE...');
  console.log('=' + '='.repeat(79));

  results.forEach(result => {
    // Normalize names for comparison
    const normalizedExcel = new Set(
      Array.from(result.excelSubjects).map(s => s.toLowerCase().trim())
    );
    const normalizedDB = new Set(
      Array.from(result.dbSubjects).map(s => s.toLowerCase().trim())
    );

    // Find differences
    result.onlyInExcel = Array.from(result.excelSubjects).filter(s => 
      !normalizedDB.has(s.toLowerCase().trim())
    );
    result.onlyInDB = Array.from(result.dbSubjects).filter(s => 
      !normalizedExcel.has(s.toLowerCase().trim())
    );

    console.log(`\n${result.degree}:`);
    console.log(`  Excel subjects: ${result.excelCount}`);
    console.log(`  Database subjects: ${result.dbCount}`);
    console.log(`  Only in Excel: ${result.onlyInExcel.length}`);
    console.log(`  Only in Database: ${result.onlyInDB.length}`);
  });

  // 5. Show samples of differences
  console.log('\n5. SAMPLE DIFFERENCES');
  console.log('=' + '='.repeat(79));

  results.forEach(result => {
    console.log(`\n${result.degree} - Only in Excel (first 10):`);
    result.onlyInExcel.slice(0, 10).forEach(s => console.log(`  - "${s}"`));
    
    console.log(`\n${result.degree} - Only in Database (first 10):`);
    result.onlyInDB.slice(0, 10).forEach(s => console.log(`  - "${s}"`));
  });

  // 6. Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  
  const totalExcel = results.reduce((sum, r) => sum + r.excelCount, 0);
  const totalDB = dissenyDBSubjects.size + bellesArtsDBSubjects.size + otherDBSubjects.size;
  
  console.log(`Total unique subjects in Excel files: ${totalExcel}`);
  console.log(`Total subjects in Database: ${totalDB}`);
  console.log(`  - DISSENY: ${dissenyDBSubjects.size}`);
  console.log(`  - BELLES ARTS: ${bellesArtsDBSubjects.size}`);
  console.log(`  - OTHER/UNCLEAR: ${otherDBSubjects.size}`);

  // Save report
  const reportPath = path.join(__dirname, '../csv/excel_db_subject_comparison.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    summary: {
      total_excel: totalExcel,
      total_db: totalDB,
      by_degree: {
        disseny: {
          excel: results[0]?.excelCount || 0,
          db: dissenyDBSubjects.size
        },
        belles_arts: {
          excel: results[1]?.excelCount || 0,
          db: bellesArtsDBSubjects.size
        },
        other: {
          excel: 0,
          db: otherDBSubjects.size
        }
      }
    },
    details: results
  }, null, 2));
  
  console.log(`\nDetailed report saved to: ${reportPath}`);
}

// Run comparison
compareSubjectCounts();