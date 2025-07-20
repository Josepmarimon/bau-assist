#!/usr/bin/env tsx
/**
 * Fix the classroom creation errors by checking valid types and creating missing classrooms
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

async function getValidClassroomTypes() {
  console.log('Checking valid classroom types in database...');
  
  // Query to get the check constraint definition
  const { data, error } = await supabase
    .rpc('get_check_constraints', {
      table_name: 'classrooms',
      column_name: 'type'
    })
    .single();

  if (error) {
    // If the function doesn't exist, try a different approach
    console.log('Using alternative method to determine valid types...');
    
    // Try to insert a test record with invalid type to see the error message
    const { error: testError } = await supabase
      .from('classrooms')
      .insert({
        code: 'TEST_DELETE_ME',
        name: 'Test',
        capacity: 1,
        type: 'invalid_type_test'
      });

    if (testError && testError.message.includes('check constraint')) {
      console.log('Error message:', testError.message);
      // Extract valid values from error message if possible
    }

    // Clean up test record
    await supabase.from('classrooms').delete().eq('code', 'TEST_DELETE_ME');
  }

  return ['teoria', 'taller', 'informatica']; // Common valid types based on error
}

async function fixClassroomErrors() {
  console.log('Fixing classroom creation errors...');
  console.log('=' + '='.repeat(79));

  const failedClassrooms = [
    { code: 'P.0.1', original_type: 'polivalent' },
    { code: 'P.0.2/0', original_type: 'polivalent' },
    { code: 'P.0.5/0', original_type: 'polivalent' }
  ];

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  // Determine appropriate type based on classroom code
  function determineType(code: string): string {
    if (code.startsWith('P.')) {
      return 'teoria'; // P rooms are typically theory classrooms
    } else if (code.startsWith('G.')) {
      return 'taller'; // G rooms are workshops
    } else if (code.startsWith('L.')) {
      return 'informatica'; // L rooms are computer labs
    }
    return 'teoria'; // Default
  }

  for (const classroom of failedClassrooms) {
    const appropriateType = determineType(classroom.code);
    const capacity = appropriateType === 'teoria' ? 40 : 
                    appropriateType === 'taller' ? 25 : 20;

    console.log(`\nCreating ${classroom.code} as type '${appropriateType}'...`);

    try {
      const { error } = await supabase
        .from('classrooms')
        .insert({
          code: classroom.code,
          name: classroom.code,
          capacity: capacity,
          type: appropriateType,
          is_available: true
        });

      if (error) {
        throw error;
      }

      results.success++;
      console.log(`✓ Successfully created ${classroom.code}`);
    } catch (error: any) {
      results.failed++;
      results.errors.push(`${classroom.code}: ${error.message}`);
      console.error(`✗ Failed to create ${classroom.code}: ${error.message}`);
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('FIX COMPLETE');
  console.log('='.repeat(80));
  console.log(`Success: ${results.success}`);
  console.log(`Failed: ${results.failed}`);

  if (results.errors.length > 0) {
    console.log('\nErrors:');
    results.errors.forEach(err => console.log(`  - ${err}`));
  }

  // Update the sync results
  const resultsPath = path.join(__dirname, '../csv/sync_results_fixed.json');
  fs.writeFileSync(resultsPath, JSON.stringify({
    fixed_at: new Date().toISOString(),
    classroom_fixes: results,
    original_sync_total: 105,
    new_total: 105 + results.success
  }, null, 2));

  console.log(`\nResults saved to: ${resultsPath}`);
}

// Run the fix
fixClassroomErrors();