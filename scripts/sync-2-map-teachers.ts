#!/usr/bin/env tsx
/**
 * Step 2: Map teachers from Excel to Database using fuzzy matching
 * Handles name variations and creates mappings for synchronization
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

interface TeacherMapping {
  excel_name: string;
  db_id?: string;
  db_full_name?: string;
  db_email?: string;
  confidence: number; // 0-100
  match_type: 'exact' | 'fuzzy' | 'none';
  needs_creation: boolean;
}

function normalizeString(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, ' ') // Remove special chars
    .replace(/\s+/g, ' ')
    .trim();
}

function calculateSimilarity(str1: string, str2: string): number {
  const norm1 = normalizeString(str1);
  const norm2 = normalizeString(str2);

  if (norm1 === norm2) return 100;

  // Calculate Levenshtein distance
  const matrix: number[][] = [];
  for (let i = 0; i <= norm2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= norm1.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= norm2.length; i++) {
    for (let j = 1; j <= norm1.length; j++) {
      if (norm2.charAt(i - 1) === norm1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  const distance = matrix[norm2.length][norm1.length];
  const maxLength = Math.max(norm1.length, norm2.length);
  return Math.round((1 - distance / maxLength) * 100);
}

function findBestMatch(excelName: string, dbTeachers: any[]): { teacher: any | null, confidence: number } {
  let bestMatch = null;
  let bestConfidence = 0;

  for (const teacher of dbTeachers) {
    const fullName = `${teacher.first_name} ${teacher.last_name}`;
    
    // Try full name match
    let confidence = calculateSimilarity(excelName, fullName);
    
    // Try last name only if full match is poor
    if (confidence < 70) {
      const lastNameConf = calculateSimilarity(excelName, teacher.last_name);
      if (lastNameConf > confidence) {
        confidence = lastNameConf * 0.8; // Reduce confidence for partial match
      }
    }

    // Try first name + last name initial
    if (confidence < 70) {
      const shortName = `${teacher.first_name} ${teacher.last_name.charAt(0)}`;
      const shortConf = calculateSimilarity(excelName, shortName);
      if (shortConf > confidence) {
        confidence = shortConf * 0.9;
      }
    }

    if (confidence > bestConfidence) {
      bestConfidence = confidence;
      bestMatch = teacher;
    }
  }

  // Only return matches above threshold
  if (bestConfidence >= 65) {
    return { teacher: bestMatch, confidence: bestConfidence };
  }

  return { teacher: null, confidence: 0 };
}

async function createTeacherMappings() {
  console.log('Creating teacher mappings with fuzzy matching...');
  console.log('=' + '='.repeat(79));

  // Load Excel data
  const excelDataPath = path.join(__dirname, '../csv/all_excel_schedules_merged.json');
  const excelData = JSON.parse(fs.readFileSync(excelDataPath, 'utf-8'));

  // Extract unique teacher names from Excel
  const excelTeachers = new Set<string>();
  for (const entry of excelData.data) {
    if (entry.profesor && typeof entry.profesor === 'string') {
      // Clean up professor name
      let prof = entry.profesor.trim();
      
      // Skip if it looks like a classroom code
      if (/^[PGLC]\d+\.\d+/.test(prof)) continue;
      
      // Skip very short names
      if (prof.length < 3) continue;
      
      // Skip time patterns
      if (/^\d+:\d+/.test(prof)) continue;
      
      excelTeachers.add(prof);
    }
  }

  console.log(`\nFound ${excelTeachers.size} unique teacher names in Excel`);

  // Get all teachers from database
  const { data: dbTeachers, error } = await supabase
    .from('teachers')
    .select('*')
    .order('last_name');

  if (error) {
    console.error('Error fetching teachers:', error);
    return;
  }

  console.log(`Found ${dbTeachers?.length || 0} teachers in database`);

  // Create mappings
  const mappings: TeacherMapping[] = [];
  const stats = {
    exact: 0,
    fuzzy_high: 0, // >= 85%
    fuzzy_medium: 0, // 70-84%
    fuzzy_low: 0, // 65-69%
    no_match: 0
  };

  for (const excelName of excelTeachers) {
    const { teacher, confidence } = findBestMatch(excelName, dbTeachers || []);

    if (teacher) {
      const mapping: TeacherMapping = {
        excel_name: excelName,
        db_id: teacher.id,
        db_full_name: `${teacher.first_name} ${teacher.last_name}`,
        db_email: teacher.email,
        confidence: confidence,
        match_type: confidence === 100 ? 'exact' : 'fuzzy',
        needs_creation: false
      };

      mappings.push(mapping);

      if (confidence === 100) stats.exact++;
      else if (confidence >= 85) stats.fuzzy_high++;
      else if (confidence >= 70) stats.fuzzy_medium++;
      else stats.fuzzy_low++;
    } else {
      mappings.push({
        excel_name: excelName,
        confidence: 0,
        match_type: 'none',
        needs_creation: true
      });
      stats.no_match++;
    }
  }

  // Sort mappings by confidence
  mappings.sort((a, b) => b.confidence - a.confidence);

  // Save mappings
  const outputPath = path.join(__dirname, '../csv/teacher_mappings.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    total_excel_teachers: excelTeachers.size,
    total_db_teachers: dbTeachers?.length || 0,
    stats: stats,
    mappings: mappings
  }, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('MAPPING SUMMARY');
  console.log('='.repeat(80));
  console.log(`Exact matches: ${stats.exact}`);
  console.log(`High confidence fuzzy (≥85%): ${stats.fuzzy_high}`);
  console.log(`Medium confidence fuzzy (70-84%): ${stats.fuzzy_medium}`);
  console.log(`Low confidence fuzzy (65-69%): ${stats.fuzzy_low}`);
  console.log(`No match found: ${stats.no_match}`);

  console.log('\nSample mappings:');
  console.log('\nHigh confidence matches:');
  mappings.filter(m => m.confidence >= 85).slice(0, 5).forEach(m => {
    console.log(`  ${m.excel_name} → ${m.db_full_name} (${m.confidence}%)`);
  });

  console.log('\nMedium confidence matches (review needed):');
  mappings.filter(m => m.confidence >= 70 && m.confidence < 85).slice(0, 5).forEach(m => {
    console.log(`  ${m.excel_name} → ${m.db_full_name} (${m.confidence}%)`);
  });

  console.log('\nNo matches (need creation):');
  mappings.filter(m => m.needs_creation).slice(0, 10).forEach(m => {
    console.log(`  - ${m.excel_name}`);
  });

  console.log(`\nMappings saved to: ${outputPath}`);

  // Generate SQL for creating missing teachers
  const needsCreation = mappings.filter(m => m.needs_creation);
  if (needsCreation.length > 0) {
    const sqlPath = path.join(__dirname, '../csv/create_missing_teachers.sql');
    let sql = '-- SQL to create missing teachers\n';
    sql += '-- Generated on ' + new Date().toISOString() + '\n';
    sql += '-- IMPORTANT: Review and complete email addresses before executing\n\n';

    for (const teacher of needsCreation) {
      const names = teacher.excel_name.split(' ');
      const firstName = names[0] || '';
      const lastName = names.slice(1).join(' ') || '';
      const code = `T${Date.now()}_${Math.random().toString(36).substr(2, 4)}`.toUpperCase();
      const email = `${firstName.toLowerCase()}.${lastName.toLowerCase().replace(/\s+/g, '')}@bau.cat`;

      sql += `-- ${teacher.excel_name}\n`;
      sql += `INSERT INTO teachers (code, first_name, last_name, email, max_hours) VALUES ('${code}', '${firstName}', '${lastName}', '${email}', 20);\n\n`;
    }

    fs.writeFileSync(sqlPath, sql);
    console.log(`\nSQL script for ${needsCreation.length} teachers saved to: ${sqlPath}`);
  }
}

// Run the mapping
createTeacherMappings();