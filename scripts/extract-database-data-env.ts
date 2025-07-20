#!/usr/bin/env tsx
/**
 * Extract current data from Supabase database for comparison with Excel schedules.
 * This script extracts: subjects, classrooms, teachers, student_groups, and assignments.
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface ExtractedData {
  extraction_date: string;
  subjects: any[];
  classrooms: any[];
  teachers: any[];
  student_groups: any[];
  assignments: any[];
  summary: {
    total_subjects: number;
    total_classrooms: number;
    total_teachers: number;
    total_groups: number;
    total_assignments: number;
    subjects_by_year: Record<string, number>;
    subjects_by_type: Record<string, number>;
    subjects_with_itinerari: number;
  };
}

async function extractDatabaseData() {
  console.log('Extracting data from Supabase database...');
  console.log('=' + '='.repeat(79));

  const extractedData: ExtractedData = {
    extraction_date: new Date().toISOString(),
    subjects: [],
    classrooms: [],
    teachers: [],
    student_groups: [],
    assignments: [],
    summary: {
      total_subjects: 0,
      total_classrooms: 0,
      total_teachers: 0,
      total_groups: 0,
      total_assignments: 0,
      subjects_by_year: {},
      subjects_by_type: {},
      subjects_with_itinerari: 0
    }
  };

  try {
    // Extract subjects
    console.log('\nExtracting subjects...');
    const { data: subjects, error: subjectsError } = await supabase
      .from('subjects')
      .select('*')
      .order('year', { ascending: true })
      .order('name', { ascending: true });

    if (subjectsError) throw subjectsError;
    
    extractedData.subjects = subjects || [];
    extractedData.summary.total_subjects = extractedData.subjects.length;

    // Analyze subjects
    extractedData.subjects.forEach(subject => {
      // By year
      const year = `Year ${subject.year}`;
      extractedData.summary.subjects_by_year[year] = 
        (extractedData.summary.subjects_by_year[year] || 0) + 1;
      
      // By type
      extractedData.summary.subjects_by_type[subject.type] = 
        (extractedData.summary.subjects_by_type[subject.type] || 0) + 1;
      
      // With itinerari
      if (subject.itinerari) {
        extractedData.summary.subjects_with_itinerari++;
      }
    });

    console.log(`  Found ${extractedData.summary.total_subjects} subjects`);

    // Extract classrooms
    console.log('\nExtracting classrooms...');
    const { data: classrooms, error: classroomsError } = await supabase
      .from('classrooms')
      .select('*')
      .order('code', { ascending: true });

    if (classroomsError) throw classroomsError;
    
    extractedData.classrooms = classrooms || [];
    extractedData.summary.total_classrooms = extractedData.classrooms.length;
    console.log(`  Found ${extractedData.summary.total_classrooms} classrooms`);

    // Extract teachers
    console.log('\nExtracting teachers...');
    const { data: teachers, error: teachersError } = await supabase
      .from('teachers')
      .select('*')
      .order('last_name', { ascending: true })
      .order('first_name', { ascending: true });

    if (teachersError) throw teachersError;
    
    extractedData.teachers = teachers || [];
    extractedData.summary.total_teachers = extractedData.teachers.length;
    console.log(`  Found ${extractedData.summary.total_teachers} teachers`);

    // Extract student groups
    console.log('\nExtracting student groups...');
    const { data: groups, error: groupsError } = await supabase
      .from('student_groups')
      .select('*')
      .order('year', { ascending: true })
      .order('name', { ascending: true });

    if (groupsError) throw groupsError;
    
    extractedData.student_groups = groups || [];
    extractedData.summary.total_groups = extractedData.student_groups.length;
    console.log(`  Found ${extractedData.summary.total_groups} student groups`);

    // Extract assignments with related data
    console.log('\nExtracting assignments...');
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select(`
        *,
        subject:subjects(*),
        teacher:teachers(*),
        classroom:classrooms(*),
        student_group:student_groups(*),
        time_slot:time_slots(*)
      `)
      .order('created_at', { ascending: true });

    if (assignmentsError) throw assignmentsError;
    
    extractedData.assignments = assignments || [];
    extractedData.summary.total_assignments = extractedData.assignments.length;
    console.log(`  Found ${extractedData.summary.total_assignments} assignments`);

    // Save to JSON file
    const outputPath = path.join(__dirname, '../csv/extracted_database_data.json');
    fs.writeFileSync(outputPath, JSON.stringify(extractedData, null, 2));

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('EXTRACTION SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total subjects: ${extractedData.summary.total_subjects}`);
    console.log(`Total classrooms: ${extractedData.summary.total_classrooms}`);
    console.log(`Total teachers: ${extractedData.summary.total_teachers}`);
    console.log(`Total student groups: ${extractedData.summary.total_groups}`);
    console.log(`Total assignments: ${extractedData.summary.total_assignments}`);
    
    console.log('\nSubjects by year:');
    Object.entries(extractedData.summary.subjects_by_year).forEach(([year, count]) => {
      console.log(`  ${year}: ${count}`);
    });
    
    console.log('\nSubjects by type:');
    Object.entries(extractedData.summary.subjects_by_type).forEach(([type, count]) => {
      console.log(`  ${type}: ${count}`);
    });
    
    console.log(`\nSubjects with itinerari: ${extractedData.summary.subjects_with_itinerari}`);
    
    console.log(`\nData saved to: ${outputPath}`);

    // Show sample data
    console.log('\nSample subjects (first 3):');
    extractedData.subjects.slice(0, 3).forEach((subject, i) => {
      console.log(`\n${i + 1}. ${subject.name}`);
      console.log(`   Code: ${subject.code}`);
      console.log(`   Year: ${subject.year}, Credits: ${subject.credits}`);
      console.log(`   Type: ${subject.type}`);
      console.log(`   Itinerari: ${subject.itinerari || 'N/A'}`);
    });

  } catch (error) {
    console.error('Error extracting data:', error);
    process.exit(1);
  }
}

// Run the extraction
extractDatabaseData();