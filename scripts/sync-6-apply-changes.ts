#!/usr/bin/env tsx
/**
 * Apply the synchronization changes to the database
 * Executes the SQL statements generated in the preview step
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

interface ChangeResult {
  type: string;
  success: number;
  failed: number;
  errors: string[];
}

async function applyChanges() {
  console.log('Applying synchronization changes to database...');
  console.log('=' + '='.repeat(79));

  const results: Record<string, ChangeResult> = {
    classrooms: { type: 'Classrooms', success: 0, failed: 0, errors: [] },
    teachers: { type: 'Teachers', success: 0, failed: 0, errors: [] },
    subjects: { type: 'Subjects', success: 0, failed: 0, errors: [] },
    updates: { type: 'Itinerari Updates', success: 0, failed: 0, errors: [] }
  };

  try {
    // Load the final SQL script
    const sqlPath = path.join(__dirname, '../csv/final_sync_changes.sql');
    if (!fs.existsSync(sqlPath)) {
      throw new Error('Final SQL script not found. Run sync-4-preview-changes.py first.');
    }

    const sqlContent = fs.readFileSync(sqlPath, 'utf-8');
    const statements = sqlContent
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('--'))
      .join('\n')
      .split(';')
      .filter(stmt => stmt.trim());

    console.log(`Found ${statements.length} SQL statements to execute\n`);

    // Process each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i].trim();
      if (!statement) continue;

      // Determine statement type
      let resultType = 'updates';
      if (statement.includes('INSERT INTO classrooms')) {
        resultType = 'classrooms';
      } else if (statement.includes('INSERT INTO teachers')) {
        resultType = 'teachers';
      } else if (statement.includes('INSERT INTO subjects')) {
        resultType = 'subjects';
      }

      try {
        // Parse the statement to extract data
        if (statement.startsWith('INSERT INTO classrooms')) {
          const match = statement.match(/VALUES\s*\(\s*'([^']+)',\s*'([^']+)',\s*(\d+),\s*'([^']+)',\s*(\w+)\s*\)/);
          if (match) {
            const [_, code, name, capacity, type, is_available] = match;
            const { error } = await supabase
              .from('classrooms')
              .insert({
                code,
                name,
                capacity: parseInt(capacity),
                type,
                is_available: is_available === 'true'
              });
            
            if (error) throw error;
            results[resultType].success++;
            console.log(`✓ Created classroom: ${code}`);
          }
        } else if (statement.startsWith('INSERT INTO teachers')) {
          const match = statement.match(/VALUES\s*\(\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*'([^']+)',\s*(\d+)\s*\)/);
          if (match) {
            const [_, code, first_name, last_name, email, max_hours] = match;
            const { error } = await supabase
              .from('teachers')
              .insert({
                code,
                first_name,
                last_name,
                email,
                max_hours: parseInt(max_hours)
              });
            
            if (error) throw error;
            results[resultType].success++;
            console.log(`✓ Created teacher: ${first_name} ${last_name}`);
          }
        } else if (statement.startsWith('INSERT INTO subjects')) {
          // Extract values handling optional itinerari
          const match = statement.match(/VALUES\s*\(\s*'([^']+)',\s*'([^']+)',\s*(\d+),\s*(\d+),\s*'([^']+)'(?:,\s*(?:'([^']+)'|NULL))?\s*\)/);
          if (match) {
            const [_, code, name, credits, year, type, itinerari] = match;
            const { error } = await supabase
              .from('subjects')
              .insert({
                code,
                name: name.replace("''", "'"), // Unescape quotes
                credits: parseInt(credits),
                year: parseInt(year),
                type,
                itinerari: itinerari || null
              });
            
            if (error) throw error;
            results[resultType].success++;
            console.log(`✓ Created subject: ${name.replace("''", "'")}`);
          }
        } else if (statement.startsWith('UPDATE subjects')) {
          const match = statement.match(/SET\s+itinerari\s*=\s*'([^']+)'\s+WHERE\s+id\s*=\s*'([^']+)'/);
          if (match) {
            const [_, itinerari, id] = match;
            const { error } = await supabase
              .from('subjects')
              .update({ itinerari })
              .eq('id', id);
            
            if (error) throw error;
            results[resultType].success++;
            console.log(`✓ Updated itinerari for subject ID: ${id}`);
          }
        }
      } catch (error: any) {
        results[resultType].failed++;
        results[resultType].errors.push(`Statement ${i + 1}: ${error.message}`);
        console.error(`✗ Failed: ${error.message}`);
      }
    }

    // Print summary
    console.log('\n' + '='.repeat(80));
    console.log('SYNCHRONIZATION COMPLETE');
    console.log('='.repeat(80));

    let totalSuccess = 0;
    let totalFailed = 0;

    for (const [key, result] of Object.entries(results)) {
      if (result.success > 0 || result.failed > 0) {
        console.log(`\n${result.type}:`);
        console.log(`  Success: ${result.success}`);
        console.log(`  Failed: ${result.failed}`);
        if (result.errors.length > 0) {
          console.log(`  Errors:`);
          result.errors.slice(0, 5).forEach(err => console.log(`    - ${err}`));
          if (result.errors.length > 5) {
            console.log(`    ... and ${result.errors.length - 5} more`);
          }
        }
        totalSuccess += result.success;
        totalFailed += result.failed;
      }
    }

    console.log(`\nTotal: ${totalSuccess} successful, ${totalFailed} failed`);

    // Save results
    const resultsPath = path.join(__dirname, '../csv/sync_results.json');
    fs.writeFileSync(resultsPath, JSON.stringify({
      executed_at: new Date().toISOString(),
      results: results,
      total_success: totalSuccess,
      total_failed: totalFailed
    }, null, 2));

    console.log(`\nResults saved to: ${resultsPath}`);

  } catch (error: any) {
    console.error('\n❌ SYNC FAILED:', error.message);
    process.exit(1);
  }
}

// Run the sync
applyChanges();