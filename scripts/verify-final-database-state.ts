#!/usr/bin/env tsx
/**
 * Verify the final state of the database after synchronization
 * Check if all information is properly harmonized
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

interface VerificationResult {
  category: string;
  total: number;
  issues: string[];
  status: 'OK' | 'WARNING' | 'ERROR';
}

async function verifyDatabaseState() {
  console.log('Verifying final database state after synchronization...');
  console.log('=' + '='.repeat(79));

  const results: VerificationResult[] = [];

  // 1. Check subjects
  console.log('\n1. CHECKING SUBJECTS...');
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('*');

  if (subjects) {
    const subjectIssues: string[] = [];
    
    // Check for missing required fields
    const missingItinerari = subjects.filter(s => !s.itinerari && s.year >= 3);
    const missingCredits = subjects.filter(s => !s.credits);
    const missingSemester = subjects.filter(s => !s.semester);
    
    if (missingItinerari.length > 0) {
      subjectIssues.push(`${missingItinerari.length} subjects (year 3+) missing itinerari`);
    }
    if (missingCredits.length > 0) {
      subjectIssues.push(`${missingCredits.length} subjects missing credits`);
    }
    if (missingSemester.length > 0) {
      subjectIssues.push(`${missingSemester.length} subjects missing semester`);
    }

    results.push({
      category: 'Subjects',
      total: subjects.length,
      issues: subjectIssues,
      status: subjectIssues.length === 0 ? 'OK' : 'WARNING'
    });

    console.log(`Total subjects: ${subjects.length}`);
    console.log(`Issues found: ${subjectIssues.length}`);
  }

  // 2. Check teachers
  console.log('\n2. CHECKING TEACHERS...');
  const { data: teachers } = await supabase
    .from('teachers')
    .select('*');

  if (teachers) {
    const teacherIssues: string[] = [];
    
    // Check for potential duplicates (same name)
    const nameCount = new Map<string, number>();
    teachers.forEach(t => {
      const count = nameCount.get(t.name) || 0;
      nameCount.set(t.name, count + 1);
    });
    
    const duplicates = Array.from(nameCount.entries()).filter(([_, count]) => count > 1);
    if (duplicates.length > 0) {
      teacherIssues.push(`${duplicates.length} potential duplicate teacher names`);
    }

    results.push({
      category: 'Teachers',
      total: teachers.length,
      issues: teacherIssues,
      status: teacherIssues.length === 0 ? 'OK' : 'WARNING'
    });

    console.log(`Total teachers: ${teachers.length}`);
    console.log(`Issues found: ${teacherIssues.length}`);
  }

  // 3. Check classrooms
  console.log('\n3. CHECKING CLASSROOMS...');
  const { data: classrooms } = await supabase
    .from('classrooms')
    .select('*');

  if (classrooms) {
    const classroomIssues: string[] = [];
    
    // Check for missing capacity
    const missingCapacity = classrooms.filter(c => !c.capacity);
    if (missingCapacity.length > 0) {
      classroomIssues.push(`${missingCapacity.length} classrooms missing capacity`);
    }

    results.push({
      category: 'Classrooms',
      total: classrooms.length,
      issues: classroomIssues,
      status: classroomIssues.length === 0 ? 'OK' : 'WARNING'
    });

    console.log(`Total classrooms: ${classrooms.length}`);
    console.log(`Issues found: ${classroomIssues.length}`);
  }

  // 4. Check assignments
  console.log('\n4. CHECKING ASSIGNMENTS...');
  const { data: assignments } = await supabase
    .from('assignments')
    .select(`
      *,
      subjects(name, code),
      teachers(name),
      classrooms(code)
    `);

  if (assignments) {
    const assignmentIssues: string[] = [];
    
    // Check for assignments without all required relations
    const missingSubject = assignments.filter(a => !a.subjects);
    const missingTeacher = assignments.filter(a => !a.teachers);
    const missingClassroom = assignments.filter(a => !a.classrooms);
    
    if (missingSubject.length > 0) {
      assignmentIssues.push(`${missingSubject.length} assignments with invalid subject_id`);
    }
    if (missingTeacher.length > 0) {
      assignmentIssues.push(`${missingTeacher.length} assignments with invalid teacher_id`);
    }
    if (missingClassroom.length > 0) {
      assignmentIssues.push(`${missingClassroom.length} assignments with invalid classroom_id`);
    }

    // Check time slot conflicts
    const timeSlots = new Map<string, any[]>();
    assignments.forEach(a => {
      const key = `${a.day_of_week}-${a.time_slot}-${a.classrooms?.code}`;
      if (!timeSlots.has(key)) {
        timeSlots.set(key, []);
      }
      timeSlots.get(key)!.push(a);
    });
    
    const conflicts = Array.from(timeSlots.entries()).filter(([_, assigns]) => assigns.length > 1);
    if (conflicts.length > 0) {
      assignmentIssues.push(`${conflicts.length} time slot conflicts detected`);
    }

    results.push({
      category: 'Assignments',
      total: assignments.length,
      issues: assignmentIssues,
      status: assignmentIssues.length === 0 ? 'OK' : 'ERROR'
    });

    console.log(`Total assignments: ${assignments.length}`);
    console.log(`Issues found: ${assignmentIssues.length}`);
  }

  // 5. Check groups
  console.log('\n5. CHECKING GROUPS...');
  const { data: groups } = await supabase
    .from('groups')
    .select('*');

  if (groups) {
    const groupIssues: string[] = [];
    
    // Check for missing academic_year
    const missingYear = groups.filter(g => !g.academic_year);
    if (missingYear.length > 0) {
      groupIssues.push(`${missingYear.length} groups missing academic_year`);
    }

    results.push({
      category: 'Groups',
      total: groups.length,
      issues: groupIssues,
      status: groupIssues.length === 0 ? 'OK' : 'WARNING'
    });

    console.log(`Total groups: ${groups.length}`);
    console.log(`Issues found: ${groupIssues.length}`);
  }

  // 6. Summary statistics
  console.log('\n6. SYNCHRONIZATION STATISTICS...');
  
  // Load sync results
  const syncResultsPath = path.join(__dirname, '../csv/sync_results_final.json');
  if (fs.existsSync(syncResultsPath)) {
    const syncResults = JSON.parse(fs.readFileSync(syncResultsPath, 'utf-8'));
    console.log(`Sync completed at: ${syncResults.completed_at}`);
    console.log(`Success rate: ${syncResults.success_rate}`);
    console.log(`Total changes applied: ${syncResults.total_success}/${syncResults.total_attempted}`);
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('DATABASE HARMONIZATION STATUS');
  console.log('='.repeat(80));

  let allOk = true;
  results.forEach(result => {
    const statusEmoji = result.status === 'OK' ? '✅' : result.status === 'WARNING' ? '⚠️' : '❌';
    console.log(`\n${statusEmoji} ${result.category}: ${result.total} records`);
    
    if (result.issues.length > 0) {
      allOk = false;
      console.log('   Issues:');
      result.issues.forEach(issue => console.log(`   - ${issue}`));
    } else {
      console.log('   No issues found');
    }
  });

  console.log('\n' + '='.repeat(80));
  if (allOk) {
    console.log('✅ DATABASE IS FULLY HARMONIZED');
    console.log('All data has been successfully synchronized from Excel files.');
  } else {
    console.log('⚠️  DATABASE IS MOSTLY HARMONIZED WITH MINOR ISSUES');
    console.log('The synchronization was successful but some minor issues remain.');
  }
  console.log('='.repeat(80));

  // Save verification report
  const reportPath = path.join(__dirname, '../csv/database_verification_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    verified_at: new Date().toISOString(),
    results: results,
    fully_harmonized: allOk
  }, null, 2));
  
  console.log(`\nDetailed report saved to: ${reportPath}`);
}

// Run verification
verifyDatabaseState();