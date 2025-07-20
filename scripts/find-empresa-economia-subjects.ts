#!/usr/bin/env tsx
/**
 * Find all subjects related to "Empresa" and "Economia"
 * to check for duplicates or variations
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function findEmpresaEconomiaSubjects() {
  console.log('Searching for subjects related to "Empresa" and "Economia"...');
  console.log('=' + '='.repeat(79));

  // Search for subjects containing these keywords
  const keywords = ['empresa', 'economia', 'econom', 'empres'];
  
  const { data: subjects, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching subjects:', error);
    return;
  }

  const relatedSubjects = subjects?.filter(subject => {
    const nameLower = subject.name.toLowerCase();
    return keywords.some(keyword => nameLower.includes(keyword));
  }) || [];

  console.log(`Found ${relatedSubjects.length} related subjects:\n`);

  if (relatedSubjects.length === 0) {
    console.log('No subjects found with "Empresa" or "Economia" keywords');
    return;
  }

  // Display subjects with details
  console.log('Name | Code | Year | Type | Credits | Has Assignments?');
  console.log('-'.repeat(100));
  
  for (const subject of relatedSubjects) {
    // Check if it has assignments
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id')
      .eq('subject_id', subject.id)
      .limit(1);
    
    const hasAssignments = !!(assignments && assignments.length > 0);
    
    console.log(
      `${subject.name.padEnd(40)} | ` +
      `${(subject.code || '').padEnd(15)} | ` +
      `${subject.year} | ` +
      `${subject.type.padEnd(11)} | ` +
      `${(subject.credits || 0).toString().padEnd(7)} | ` +
      `${hasAssignments ? 'Yes' : 'No'}`
    );
  }

  // Check for potential duplicates
  console.log('\n' + '='.repeat(80));
  console.log('CHECKING FOR POTENTIAL DUPLICATES...');
  console.log('='.repeat(80));

  // Normalize names for comparison
  const normalizedGroups = new Map<string, typeof relatedSubjects>();
  
  relatedSubjects.forEach(subject => {
    const normalized = subject.name
      .toLowerCase()
      .replace(/[,.\s]+/g, ' ')
      .replace(/\s+i\s+/g, ' ')
      .replace(/\s+y\s+/g, ' ')
      .trim();
    
    if (!normalizedGroups.has(normalized)) {
      normalizedGroups.set(normalized, []);
    }
    normalizedGroups.get(normalized)!.push(subject);
  });

  // Find groups with multiple subjects
  const duplicateGroups = Array.from(normalizedGroups.entries())
    .filter(([_, subjects]) => subjects.length > 1);

  if (duplicateGroups.length > 0) {
    console.log('\nPotential duplicate groups found:');
    duplicateGroups.forEach(([normalized, subjects]) => {
      console.log(`\nNormalized: "${normalized}"`);
      subjects.forEach(s => {
        console.log(`  - "${s.name}" (${s.code}) - Year ${s.year}`);
      });
    });
  } else {
    console.log('\nNo duplicate groups found');
  }

  // Look for specific variations
  console.log('\n' + '='.repeat(80));
  console.log('SPECIFIC VARIATIONS TO CHECK:');
  console.log('='.repeat(80));

  const variations = [
    'Economia, Empresa i Disseny',
    'Economia i Empresa',
    'Empresa i Economia',
    'Empresa, Economia i Disseny',
    'Economia'
  ];

  console.log('\nChecking for these specific variations:');
  variations.forEach(variation => {
    const found = relatedSubjects.filter(s => 
      s.name.toLowerCase().includes(variation.toLowerCase()) ||
      variation.toLowerCase().includes(s.name.toLowerCase())
    );
    
    if (found.length > 0) {
      console.log(`\n"${variation}":`);
      found.forEach(s => console.log(`  - Found: "${s.name}" (${s.code})`));
    } else {
      console.log(`\n"${variation}": Not found`);
    }
  });

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total subjects with Empresa/Economia: ${relatedSubjects.length}`);
  console.log(`Subjects with assignments: ${relatedSubjects.filter(s => s.has_assignments).length}`);
  console.log(`Potential duplicate groups: ${duplicateGroups.length}`);
}

// Run search
findEmpresaEconomiaSubjects();