#!/usr/bin/env tsx
/**
 * Analyze subjects in database that don't appear in Excel schedules
 * This helps identify why they might be missing from schedules
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

interface UnmatchedSubject {
  id: string;
  code: string;
  name: string;
  year: number;
  type: string;
  credits: number;
  itinerari: string | null;
  has_assignments: boolean;
  assignment_count: number;
}

async function analyzeUnmatchedSubjects() {
  console.log('Analyzing subjects in DB not found in Excel schedules...');
  console.log('=' + '='.repeat(79));

  // Load Excel data
  const excelDataPath = path.join(__dirname, '../csv/all_excel_schedules_merged.json');
  const excelData = JSON.parse(fs.readFileSync(excelDataPath, 'utf-8'));
  
  // Get unique subject names from Excel
  const excelSubjectNames = new Set<string>();
  for (const entry of excelData.data) {
    excelSubjectNames.add(entry.asignatura.toLowerCase().trim());
  }
  
  console.log(`Excel contains ${excelSubjectNames.size} unique subject names\n`);

  // Get all subjects from database
  const { data: dbSubjects, error } = await supabase
    .from('subjects')
    .select('*')
    .order('year', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching subjects:', error);
    return;
  }

  // Find subjects not in Excel
  const unmatchedSubjects: UnmatchedSubject[] = [];
  
  for (const subject of dbSubjects || []) {
    const normalizedName = subject.name.toLowerCase().trim();
    
    // Check various matching strategies
    let found = false;
    
    // Exact match
    if (excelSubjectNames.has(normalizedName)) {
      found = true;
    }
    
    // Partial match (Excel name contains DB name or vice versa)
    if (!found) {
      for (const excelName of excelSubjectNames) {
        if (excelName.includes(normalizedName) || normalizedName.includes(excelName)) {
          found = true;
          break;
        }
      }
    }
    
    if (!found) {
      // Check if this subject has any assignments
      const { data: assignments, error: assignError } = await supabase
        .from('assignments')
        .select('id')
        .eq('subject_id', subject.id);
      
      unmatchedSubjects.push({
        ...subject,
        has_assignments: !!(assignments && assignments.length > 0),
        assignment_count: assignments?.length || 0
      });
    }
  }

  // Analyze patterns
  const analysis = {
    total_unmatched: unmatchedSubjects.length,
    by_year: {} as Record<number, number>,
    by_type: {} as Record<string, number>,
    by_degree: { GBA: 0, GDIS: 0, OTHER: 0 },
    with_assignments: 0,
    without_assignments: 0,
    possible_reasons: {} as Record<string, string[]>
  };

  // Categorize unmatched subjects
  for (const subject of unmatchedSubjects) {
    // By year
    analysis.by_year[subject.year] = (analysis.by_year[subject.year] || 0) + 1;
    
    // By type
    analysis.by_type[subject.type] = (analysis.by_type[subject.type] || 0) + 1;
    
    // By degree (based on code pattern)
    if (subject.code.startsWith('BA')) {
      analysis.by_degree.GBA++;
    } else if (subject.code.startsWith('DIS') || subject.code.includes('GDIS')) {
      analysis.by_degree.GDIS++;
    } else {
      analysis.by_degree.OTHER++;
    }
    
    // By assignments
    if (subject.has_assignments) {
      analysis.with_assignments++;
    } else {
      analysis.without_assignments++;
    }
    
    // Identify possible reasons
    if (subject.type === 'tfg') {
      if (!analysis.possible_reasons['TFG']) analysis.possible_reasons['TFG'] = [];
      analysis.possible_reasons['TFG'].push(subject.name);
    } else if (subject.name.toLowerCase().includes('workshop')) {
      if (!analysis.possible_reasons['English names']) analysis.possible_reasons['English names'] = [];
      analysis.possible_reasons['English names'].push(subject.name);
    } else if (!subject.has_assignments) {
      if (!analysis.possible_reasons['No schedule assigned']) analysis.possible_reasons['No schedule assigned'] = [];
      analysis.possible_reasons['No schedule assigned'].push(subject.name);
    }
  }

  // Print results
  console.log(`Found ${analysis.total_unmatched} subjects in DB not in Excel\n`);
  
  console.log('Distribution by year:');
  for (const [year, count] of Object.entries(analysis.by_year).sort()) {
    console.log(`  Year ${year}: ${count} subjects`);
  }
  
  console.log('\nDistribution by type:');
  for (const [type, count] of Object.entries(analysis.by_type)) {
    console.log(`  ${type}: ${count} subjects`);
  }
  
  console.log('\nDistribution by degree:');
  console.log(`  Belles Arts (GBA): ${analysis.by_degree.GBA}`);
  console.log(`  Disseny (GDIS): ${analysis.by_degree.GDIS}`);
  console.log(`  Other: ${analysis.by_degree.OTHER}`);
  
  console.log('\nSchedule status:');
  console.log(`  With assignments: ${analysis.with_assignments}`);
  console.log(`  Without assignments: ${analysis.without_assignments}`);
  
  console.log('\nPossible reasons for absence in Excel:');
  for (const [reason, subjects] of Object.entries(analysis.possible_reasons)) {
    console.log(`\n${reason} (${subjects.length} subjects):`);
    subjects.slice(0, 5).forEach(s => console.log(`  - ${s}`));
    if (subjects.length > 5) {
      console.log(`  ... and ${subjects.length - 5} more`);
    }
  }

  // Show sample of unmatched subjects
  console.log('\n' + '='.repeat(80));
  console.log('SAMPLE OF UNMATCHED SUBJECTS');
  console.log('='.repeat(80));
  
  // Group by degree
  const gbaSubjects = unmatchedSubjects.filter(s => s.code.startsWith('BA'));
  const gdisSubjects = unmatchedSubjects.filter(s => !s.code.startsWith('BA'));
  
  if (gbaSubjects.length > 0) {
    console.log('\nBelles Arts subjects not in Excel:');
    console.log('Code | Name | Year | Type | Has Schedule?');
    console.log('-'.repeat(70));
    gbaSubjects.slice(0, 10).forEach(s => {
      console.log(`${s.code.padEnd(10)} | ${s.name.substring(0, 30).padEnd(30)} | ${s.year} | ${s.type.padEnd(11)} | ${s.has_assignments ? 'Yes' : 'No'}`);
    });
    if (gbaSubjects.length > 10) {
      console.log(`... and ${gbaSubjects.length - 10} more`);
    }
  }
  
  if (gdisSubjects.length > 0) {
    console.log('\nDisseny subjects not in Excel:');
    console.log('Code | Name | Year | Type | Has Schedule?');
    console.log('-'.repeat(70));
    gdisSubjects.slice(0, 10).forEach(s => {
      console.log(`${s.code.padEnd(10)} | ${s.name.substring(0, 30).padEnd(30)} | ${s.year} | ${s.type.padEnd(11)} | ${s.has_assignments ? 'Yes' : 'No'}`);
    });
    if (gdisSubjects.length > 10) {
      console.log(`... and ${gdisSubjects.length - 10} more`);
    }
  }

  // Save detailed report
  const reportPath = path.join(__dirname, '../csv/unmatched_subjects_analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    analysis: analysis,
    subjects: unmatchedSubjects
  }, null, 2));
  
  console.log(`\nDetailed report saved to: ${reportPath}`);
}

// Run the analysis
analyzeUnmatchedSubjects();