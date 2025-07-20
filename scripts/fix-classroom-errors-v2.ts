#!/usr/bin/env tsx
/**
 * Fix classroom creation errors - Version 2
 * The type 'polivalent' is actually valid, so the error must be something else
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

async function checkExistingClassrooms() {
  console.log('Checking if classrooms already exist...');
  
  const codes = ['P.0.1', 'P.0.2/0', 'P.0.5/0'];
  const existing = [];
  
  for (const code of codes) {
    const { data, error } = await supabase
      .from('classrooms')
      .select('code, name')
      .eq('code', code)
      .single();
    
    if (data) {
      existing.push(code);
      console.log(`  ${code} already exists`);
    }
  }
  
  return existing;
}

async function fixClassroomErrors() {
  console.log('Fixing classroom creation errors (v2)...');
  console.log('=' + '='.repeat(79));

  // First check if they already exist
  const existingCodes = await checkExistingClassrooms();
  
  const failedClassrooms = [
    { code: 'P.0.1', name: 'Aula P.0.1' },
    { code: 'P.0.2/0', name: 'Aula P.0.2/0' },
    { code: 'P.0.5/0', name: 'Aula P.0.5/0' }
  ].filter(c => !existingCodes.includes(c.code));

  if (failedClassrooms.length === 0) {
    console.log('\nAll classrooms already exist in the database!');
    return;
  }

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  // Check valid types first
  console.log('\nChecking valid classroom types...');
  const { data: sampleClassroom } = await supabase
    .from('classrooms')
    .select('type')
    .limit(5);
  
  console.log('Sample types from existing classrooms:', 
    sampleClassroom?.map(c => c.type).filter((v, i, a) => a.indexOf(v) === i));

  for (const classroom of failedClassrooms) {
    console.log(`\nCreating ${classroom.code}...`);

    try {
      // Determine type based on code prefix
      let type = 'polivalent'; // Default
      let capacity = 30;
      
      if (classroom.code.startsWith('P.')) {
        type = 'teoria';
        capacity = 40;
      }

      const insertData = {
        code: classroom.code,
        name: classroom.name,
        capacity: capacity,
        type: type,
        is_available: true,
        building: 'Principal',
        floor: parseInt(classroom.code.charAt(2)) || 0
      };

      console.log('  Insert data:', JSON.stringify(insertData, null, 2));

      const { data, error } = await supabase
        .from('classrooms')
        .insert(insertData)
        .select();

      if (error) {
        throw error;
      }

      results.success++;
      console.log(`✓ Successfully created ${classroom.code}`);
      if (data) {
        console.log('  Created record:', data[0]);
      }
    } catch (error: any) {
      results.failed++;
      results.errors.push(`${classroom.code}: ${error.message}`);
      console.error(`✗ Failed to create ${classroom.code}: ${error.message}`);
      
      // Log more details about the error
      if (error.details) {
        console.error('  Error details:', error.details);
      }
      if (error.hint) {
        console.error('  Hint:', error.hint);
      }
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('FIX COMPLETE');
  console.log('='.repeat(80));
  console.log(`Success: ${results.success}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Already existed: ${existingCodes.length}`);

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(err => console.log(`  - ${err}`));
  }

  // Final check
  console.log('\nFinal verification:');
  const { data: allPClassrooms } = await supabase
    .from('classrooms')
    .select('code, type, capacity')
    .in('code', ['P.0.1', 'P.0.2/0', 'P.0.5/0']);
  
  console.log('P classrooms in database:', allPClassrooms);
}

// Run the fix
fixClassroomErrors();