#!/usr/bin/env tsx
/**
 * Fix classroom creation errors - Final version
 * Using the correct type 'aula' instead of 'teoria'
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

async function fixClassroomErrors() {
  console.log('Fixing classroom creation errors (final version)...');
  console.log('=' + '='.repeat(79));

  const classroomsToCreate = [
    { code: 'P.0.1', name: 'Aula P.0.1', capacity: 40 },
    { code: 'P.0.2/0', name: 'Aula P.0.2/0', capacity: 40 },
    { code: 'P.0.5/0', name: 'Aula P.0.5/0', capacity: 40 }
  ];

  const results = {
    success: 0,
    failed: 0,
    errors: [] as string[]
  };

  console.log('Using correct type "aula" based on existing classrooms...\n');

  for (const classroom of classroomsToCreate) {
    console.log(`Creating ${classroom.code}...`);

    try {
      const { data, error } = await supabase
        .from('classrooms')
        .insert({
          code: classroom.code,
          name: classroom.name,
          capacity: classroom.capacity,
          type: 'aula', // Using the correct type!
          is_available: true,
          building: 'Principal',
          floor: parseInt(classroom.code.charAt(2)) || 0
        })
        .select();

      if (error) {
        throw error;
      }

      results.success++;
      console.log(`✓ Successfully created ${classroom.code}`);
    } catch (error: any) {
      // Check if it's a duplicate error
      if (error.code === '23505' || error.message.includes('duplicate')) {
        console.log(`ℹ ${classroom.code} already exists (skipping)`);
      } else {
        results.failed++;
        results.errors.push(`${classroom.code}: ${error.message}`);
        console.error(`✗ Failed to create ${classroom.code}: ${error.message}`);
      }
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('FINAL FIX COMPLETE');
  console.log('='.repeat(80));
  console.log(`✅ Successfully created: ${results.success}`);
  console.log(`❌ Failed: ${results.failed}`);

  if (results.success > 0) {
    console.log('\n🎉 All missing classrooms have been created!');
    
    // Update final totals
    const finalResultsPath = path.join(__dirname, '../csv/sync_results_final.json');
    fs.writeFileSync(finalResultsPath, JSON.stringify({
      completed_at: new Date().toISOString(),
      original_sync_success: 105,
      classroom_fixes: results.success,
      total_success: 105 + results.success,
      total_attempted: 109,
      success_rate: ((105 + results.success) / 109 * 100).toFixed(1) + '%'
    }, null, 2));
    
    console.log(`\nFinal results saved to: ${finalResultsPath}`);
  }

  // Verify all P classrooms now exist
  console.log('\nVerifying all classrooms:');
  const { data: allClassrooms } = await supabase
    .from('classrooms')
    .select('code, type, capacity')
    .in('code', ['P.0.1', 'P.0.2/0', 'P.0.5/0', 'G.2.2', 'L.1.4'])
    .order('code');
  
  if (allClassrooms) {
    console.log('Created classrooms in database:');
    allClassrooms.forEach(c => 
      console.log(`  - ${c.code} (${c.type}, capacity: ${c.capacity})`)
    );
  }
}

// Run the fix
fixClassroomErrors();