#!/usr/bin/env tsx
/**
 * Step 3: Map subjects from Excel to Database
 * Identifies missing subjects and prepares them for insertion
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

interface SubjectMapping {
  excel_name: string;
  excel_grado: string;
  excel_curso: string;
  excel_tipo: string;
  excel_itinerari: string | null;
  db_id?: string;
  db_code?: string;
  db_name?: string;
  exists_in_db: boolean;
  needs_itinerari_update: boolean;
}

function normalizeSubjectName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function generateSubjectCode(name: string, grado: string, year: string): string {
  // Generate a code based on name and metadata
  const prefix = grado === 'GBA' ? 'BA' : 'DIS';
  const yearNum = year.replace(/[^0-9]/g, '') || '1';
  const namePart = name
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 4);
  
  const timestamp = Date.now().toString(36).substring(-4);
  return `${prefix}${yearNum}${namePart}_${timestamp}`.toUpperCase();
}

async function createSubjectMappings() {
  console.log('Creating subject mappings...');
  console.log('=' + '='.repeat(79));

  // Load Excel data
  const excelDataPath = path.join(__dirname, '../csv/all_excel_schedules_merged.json');
  const excelData = JSON.parse(fs.readFileSync(excelDataPath, 'utf-8'));

  // Get unique subjects from Excel
  const excelSubjects = new Map<string, any>();
  for (const entry of excelData.data) {
    const key = `${entry.grado_code}_${entry.curso}_${entry.asignatura}`;
    if (!excelSubjects.has(key)) {
      excelSubjects.set(key, {
        name: entry.asignatura,
        grado: entry.grado_code,
        curso: entry.curso,
        tipo: entry.tipo || 'Obligatoria',
        itinerari: entry.itinerari
      });
    }
  }

  console.log(`\nFound ${excelSubjects.size} unique subjects in Excel`);

  // Get all subjects from database
  const { data: dbSubjects, error } = await supabase
    .from('subjects')
    .select('*');

  if (error) {
    console.error('Error fetching subjects:', error);
    return;
  }

  console.log(`Found ${dbSubjects?.length || 0} subjects in database`);

  // Create mappings
  const mappings: SubjectMapping[] = [];
  const stats = {
    exact_match: 0,
    fuzzy_match: 0,
    missing: 0,
    needs_itinerari: 0
  };

  for (const [key, excelSubject] of excelSubjects) {
    const normalizedExcel = normalizeSubjectName(excelSubject.name);
    
    // Find matching subject in DB
    let dbMatch = null;
    let matchType = 'none';

    // First try exact match
    dbMatch = dbSubjects?.find(s => 
      normalizeSubjectName(s.name) === normalizedExcel
    );

    if (dbMatch) {
      matchType = 'exact';
      stats.exact_match++;
    } else {
      // Try fuzzy match
      dbMatch = dbSubjects?.find(s => {
        const normalizedDb = normalizeSubjectName(s.name);
        return (
          normalizedDb.includes(normalizedExcel) ||
          normalizedExcel.includes(normalizedDb) ||
          // Check similarity
          calculateStringSimilarity(normalizedExcel, normalizedDb) > 0.8
        );
      });

      if (dbMatch) {
        matchType = 'fuzzy';
        stats.fuzzy_match++;
      }
    }

    // Check if itinerari needs update
    const needsItinerariUpdate = dbMatch && 
      excelSubject.itinerari && 
      (!dbMatch.itinerari || dbMatch.itinerari !== excelSubject.itinerari);

    if (needsItinerariUpdate) {
      stats.needs_itinerari++;
    }

    const mapping: SubjectMapping = {
      excel_name: excelSubject.name,
      excel_grado: excelSubject.grado,
      excel_curso: excelSubject.curso,
      excel_tipo: excelSubject.tipo,
      excel_itinerari: excelSubject.itinerari,
      exists_in_db: !!dbMatch,
      needs_itinerari_update: needsItinerariUpdate
    };

    if (dbMatch) {
      mapping.db_id = dbMatch.id;
      mapping.db_code = dbMatch.code;
      mapping.db_name = dbMatch.name;
    } else {
      stats.missing++;
    }

    mappings.push(mapping);
  }

  // Sort mappings
  mappings.sort((a, b) => {
    if (a.exists_in_db !== b.exists_in_db) {
      return a.exists_in_db ? 1 : -1;
    }
    return a.excel_name.localeCompare(b.excel_name);
  });

  // Save mappings
  const outputPath = path.join(__dirname, '../csv/subject_mappings.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    total_excel_subjects: excelSubjects.size,
    total_db_subjects: dbSubjects?.length || 0,
    stats: stats,
    mappings: mappings
  }, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('MAPPING SUMMARY');
  console.log('='.repeat(80));
  console.log(`Exact matches: ${stats.exact_match}`);
  console.log(`Fuzzy matches: ${stats.fuzzy_match}`);
  console.log(`Missing from DB: ${stats.missing}`);
  console.log(`Need itinerari update: ${stats.needs_itinerari}`);

  // Show missing subjects by degree
  const missingByDegree: Record<string, string[]> = {};
  mappings.filter(m => !m.exists_in_db).forEach(m => {
    if (!missingByDegree[m.excel_grado]) {
      missingByDegree[m.excel_grado] = [];
    }
    missingByDegree[m.excel_grado].push(`${m.excel_name} (${m.excel_curso})`);
  });

  console.log('\nMissing subjects by degree:');
  for (const [grado, subjects] of Object.entries(missingByDegree)) {
    console.log(`\n${grado} (${subjects.length} subjects):`);
    subjects.slice(0, 10).forEach(s => console.log(`  - ${s}`));
    if (subjects.length > 10) {
      console.log(`  ... and ${subjects.length - 10} more`);
    }
  }

  console.log(`\nMappings saved to: ${outputPath}`);

  // Generate SQL for missing subjects
  const missing = mappings.filter(m => !m.exists_in_db);
  if (missing.length > 0) {
    const sqlPath = path.join(__dirname, '../csv/create_missing_subjects.sql');
    let sql = '-- SQL to create missing subjects\n';
    sql += '-- Generated on ' + new Date().toISOString() + '\n\n';

    for (const subject of missing) {
      const code = generateSubjectCode(subject.excel_name, subject.excel_grado, subject.excel_curso);
      const year = parseInt(subject.excel_curso.replace(/[^0-9]/g, '')) || 1;
      const type = subject.excel_tipo.toLowerCase() === 'optativa' ? 'optativa' : 'obligatoria';
      const credits = type === 'optativa' ? 3 : 6;

      sql += `-- ${subject.excel_name} (${subject.excel_grado} ${subject.excel_curso})\n`;
      sql += `INSERT INTO subjects (code, name, credits, year, type, itinerari) VALUES (\n`;
      sql += `  '${code}',\n`;
      sql += `  '${subject.excel_name.replace(/'/g, "''")}',\n`;
      sql += `  ${credits},\n`;
      sql += `  ${year},\n`;
      sql += `  '${type}',\n`;
      sql += `  ${subject.excel_itinerari ? `'${subject.excel_itinerari}'` : 'NULL'}\n`;
      sql += `);\n\n`;
    }

    fs.writeFileSync(sqlPath, sql);
    console.log(`\nSQL script for ${missing.length} subjects saved to: ${sqlPath}`);
  }

  // Generate SQL for itinerari updates
  const needsItinerari = mappings.filter(m => m.needs_itinerari_update);
  if (needsItinerari.length > 0) {
    const sqlPath = path.join(__dirname, '../csv/update_subject_itineraris.sql');
    let sql = '-- SQL to update subject itineraris\n';
    sql += '-- Generated on ' + new Date().toISOString() + '\n\n';

    for (const subject of needsItinerari) {
      sql += `-- ${subject.db_name}\n`;
      sql += `UPDATE subjects SET itinerari = '${subject.excel_itinerari}' WHERE id = '${subject.db_id}';\n\n`;
    }

    fs.writeFileSync(sqlPath, sql);
    console.log(`SQL script for ${needsItinerari.length} itinerari updates saved to: ${sqlPath}`);
  }
}

function calculateStringSimilarity(str1: string, str2: string): number {
  const longer = str1.length > str2.length ? str1 : str2;
  const shorter = str1.length > str2.length ? str2 : str1;
  
  if (longer.length === 0) return 1.0;
  
  const editDistance = getEditDistance(longer, shorter);
  return (longer.length - editDistance) / longer.length;
}

function getEditDistance(str1: string, str2: string): number {
  const matrix: number[][] = [];
  
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
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
  
  return matrix[str2.length][str1.length];
}

// Run the mapping
createSubjectMappings();