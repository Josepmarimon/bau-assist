#!/usr/bin/env tsx
/**
 * Create a backup of current database data before applying changes
 * Backs up: subjects, classrooms, teachers, assignments
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

async function backupTable(tableName: string, outputDir: string) {
  console.log(`Backing up table: ${tableName}...`);
  
  const { data, error } = await supabase
    .from(tableName)
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error(`Error backing up ${tableName}:`, error);
    return false;
  }

  const backupPath = path.join(outputDir, `backup_${tableName}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
  
  console.log(`  ✓ Backed up ${data?.length || 0} records to ${path.basename(backupPath)}`);
  return true;
}

async function createBackup() {
  console.log('Creating database backup...');
  console.log('=' + '='.repeat(79));

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupDir = path.join(__dirname, '../csv', `backup_${timestamp}`);
  
  // Create backup directory
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // Tables to backup
  const tables = [
    'subjects',
    'classrooms', 
    'teachers',
    'assignments',
    'subject_groups',
    'student_groups'
  ];

  let allSuccess = true;

  for (const table of tables) {
    const success = await backupTable(table, backupDir);
    if (!success) {
      allSuccess = false;
    }
  }

  // Create backup metadata
  const metadata = {
    created_at: new Date().toISOString(),
    tables_backed_up: tables,
    backup_reason: 'Pre-synchronization backup',
    success: allSuccess
  };

  fs.writeFileSync(
    path.join(backupDir, 'backup_metadata.json'),
    JSON.stringify(metadata, null, 2)
  );

  // Create restore script
  const restoreScript = `#!/bin/bash
# Restore script for backup ${timestamp}
# Generated on ${new Date().toISOString()}

echo "WARNING: This will restore the database to the state from ${timestamp}"
echo "All current data will be lost!"
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled"
  exit 1
fi

# Add restore commands here
# Example: psql commands to truncate tables and insert backup data
echo "Restore functionality needs to be implemented based on your database setup"
`;

  fs.writeFileSync(
    path.join(backupDir, 'restore.sh'),
    restoreScript
  );
  fs.chmodSync(path.join(backupDir, 'restore.sh'), '755');

  console.log('\n' + '='.repeat(80));
  console.log('BACKUP COMPLETE');
  console.log('='.repeat(80));
  console.log(`Backup location: ${backupDir}`);
  console.log(`Status: ${allSuccess ? 'SUCCESS' : 'PARTIAL SUCCESS'}`);
  
  if (allSuccess) {
    console.log('\n✅ All tables backed up successfully');
    console.log('You can now safely proceed with synchronization');
  } else {
    console.log('\n⚠️  Some tables failed to backup');
    console.log('Review errors before proceeding');
  }

  // Create a symlink to latest backup
  const latestLink = path.join(__dirname, '../csv', 'latest_backup');
  if (fs.existsSync(latestLink)) {
    fs.unlinkSync(latestLink);
  }
  fs.symlinkSync(backupDir, latestLink);
  console.log(`\nLatest backup symlink: ${latestLink}`);
}

// Run the backup
createBackup();