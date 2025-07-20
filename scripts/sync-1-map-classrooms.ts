#!/usr/bin/env tsx
/**
 * Step 1: Map classroom codes from Excel format to Database format
 * Excel uses: P0.5, G1.2, L0.1
 * Database uses: P.0.5, G.1.2, L.0.1
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

interface ClassroomMapping {
  excel_code: string;
  db_code: string;
  exists_in_db: boolean;
  db_id?: string;
  db_capacity?: number;
  db_type?: string;
}

async function createClassroomMappings() {
  console.log('Creating classroom code mappings...');
  console.log('=' + '='.repeat(79));

  // Load Excel data
  const excelDataPath = path.join(__dirname, '../csv/all_excel_schedules_merged.json');
  const excelData = JSON.parse(fs.readFileSync(excelDataPath, 'utf-8'));

  // Extract unique classroom codes from Excel
  const excelClassrooms = new Set<string>();
  for (const entry of excelData.data) {
    if (entry.aulas && Array.isArray(entry.aulas)) {
      entry.aulas.forEach((aula: string) => excelClassrooms.add(aula));
    }
  }

  console.log(`\nFound ${excelClassrooms.size} unique classroom codes in Excel`);

  // Get all classrooms from database
  const { data: dbClassrooms, error } = await supabase
    .from('classrooms')
    .select('*');

  if (error) {
    console.error('Error fetching classrooms:', error);
    return;
  }

  console.log(`Found ${dbClassrooms?.length || 0} classrooms in database`);

  // Create mappings
  const mappings: ClassroomMapping[] = [];
  const unmappedExcel: string[] = [];
  const createRequired: string[] = [];

  for (const excelCode of excelClassrooms) {
    // Generate potential DB code
    let dbCode = excelCode;
    
    // Standard pattern: Add dot after letter for standard codes
    if (/^[PGLC]\d+\.\d+/.test(excelCode)) {
      // P0.5 → P.0.5
      dbCode = excelCode.replace(/^([PGLC])(\d+\.)/, '$1.$2');
    }
    
    // Check if exists in DB (exact match)
    let dbClassroom = dbClassrooms?.find(c => c.code === dbCode);
    
    // If not found, try original Excel code
    if (!dbClassroom) {
      dbClassroom = dbClassrooms?.find(c => c.code === excelCode);
    }
    
    // If not found, try case-insensitive match
    if (!dbClassroom) {
      dbClassroom = dbClassrooms?.find(c => 
        c.code.toLowerCase() === dbCode.toLowerCase() ||
        c.code.toLowerCase() === excelCode.toLowerCase()
      );
    }

    if (dbClassroom) {
      mappings.push({
        excel_code: excelCode,
        db_code: dbClassroom.code,
        exists_in_db: true,
        db_id: dbClassroom.id,
        db_capacity: dbClassroom.capacity,
        db_type: dbClassroom.type
      });
    } else {
      // Special cases
      if (excelCode === 'Platós') {
        const platos = dbClassrooms?.find(c => c.code === 'PLATÓS');
        if (platos) {
          mappings.push({
            excel_code: excelCode,
            db_code: platos.code,
            exists_in_db: true,
            db_id: platos.id,
            db_capacity: platos.capacity,
            db_type: platos.type
          });
          continue;
        }
      } else if (excelCode === 'Sala Carolines') {
        const sala = dbClassrooms?.find(c => c.code === 'SALA_CAROLINES');
        if (sala) {
          mappings.push({
            excel_code: excelCode,
            db_code: sala.code,
            exists_in_db: true,
            db_id: sala.id,
            db_capacity: sala.capacity,
            db_type: sala.type
          });
          continue;
        }
      }

      // Not found - needs to be created
      unmappedExcel.push(excelCode);
      createRequired.push(dbCode);
      mappings.push({
        excel_code: excelCode,
        db_code: dbCode,
        exists_in_db: false
      });
    }
  }

  // Save mappings
  const outputPath = path.join(__dirname, '../csv/classroom_mappings.json');
  fs.writeFileSync(outputPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    total_excel_codes: excelClassrooms.size,
    total_db_classrooms: dbClassrooms?.length || 0,
    mapped_count: mappings.filter(m => m.exists_in_db).length,
    unmapped_count: unmappedExcel.length,
    mappings: mappings.sort((a, b) => a.excel_code.localeCompare(b.excel_code))
  }, null, 2));

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('MAPPING SUMMARY');
  console.log('='.repeat(80));
  console.log(`Successfully mapped: ${mappings.filter(m => m.exists_in_db).length}`);
  console.log(`Need to create: ${unmappedExcel.length}`);

  if (unmappedExcel.length > 0) {
    console.log('\nClassrooms to create:');
    for (const code of createRequired.sort()) {
      console.log(`  - ${code}`);
    }
  }

  console.log('\nSample mappings:');
  for (const mapping of mappings.slice(0, 10)) {
    console.log(`  ${mapping.excel_code} → ${mapping.db_code} ${mapping.exists_in_db ? '✓' : '✗'}`);
  }

  console.log(`\nMappings saved to: ${outputPath}`);

  // Generate SQL for creating missing classrooms
  if (createRequired.length > 0) {
    const sqlPath = path.join(__dirname, '../csv/create_missing_classrooms.sql');
    let sql = '-- SQL to create missing classrooms\n';
    sql += '-- Generated on ' + new Date().toISOString() + '\n\n';

    for (const code of createRequired.sort()) {
      // Determine type based on code
      let type = 'polivalent';
      let capacity = 30;
      let name = code;

      if (code.startsWith('P.')) {
        type = 'teoria';
        capacity = 40;
      } else if (code.startsWith('G.')) {
        type = 'taller';
        capacity = 25;
      } else if (code.startsWith('L.')) {
        type = 'informatica';
        capacity = 20;
      }

      sql += `INSERT INTO classrooms (code, name, capacity, type, is_available) VALUES ('${code}', '${name}', ${capacity}, '${type}', true);\n`;
    }

    fs.writeFileSync(sqlPath, sql);
    console.log(`\nSQL script saved to: ${sqlPath}`);
  }
}

// Run the mapping
createClassroomMappings();