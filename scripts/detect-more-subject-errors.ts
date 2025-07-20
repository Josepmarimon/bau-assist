#!/usr/bin/env tsx
/**
 * Detect more potential errors in subject names
 * Look for patterns that indicate extraction errors or incomplete data
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

interface SuspiciousSubject {
  id: string;
  code: string;
  name: string;
  year: number;
  type: string;
  reason: string;
  hasAssignments: boolean;
  confidence: 'high' | 'medium' | 'low';
}

async function detectMoreErrors() {
  console.log('Detecting potential errors in subject names...');
  console.log('=' + '='.repeat(79));

  // Get all subjects
  const { data: subjects, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching subjects:', error);
    return;
  }

  const suspiciousSubjects: SuspiciousSubject[] = [];

  // Check each subject for suspicious patterns
  for (const subject of subjects || []) {
    let reason = '';
    let confidence: 'high' | 'medium' | 'low' = 'low';

    // Check if it has assignments
    const { data: assignments } = await supabase
      .from('assignments')
      .select('id')
      .eq('subject_id', subject.id)
      .limit(1);
    
    const hasAssignments = !!(assignments && assignments.length > 0);

    // 1. Very short names (likely incomplete)
    if (subject.name.trim().length <= 3 && !['TFG', 'TFM'].includes(subject.name.trim())) {
      reason = 'Very short name (likely incomplete)';
      confidence = 'high';
    }
    
    // 2. Names ending with comma or other punctuation
    else if (/[,;:\-]$/.test(subject.name.trim())) {
      reason = 'Ends with punctuation (likely truncated)';
      confidence = 'high';
    }
    
    // 3. Names that are just numbers or codes
    else if (/^[A-Z]?\d+[a-z]?$/.test(subject.name.trim())) {
      reason = 'Appears to be a code, not a name';
      confidence = 'medium';
    }
    
    // 4. Names with suspicious patterns
    else if (/^Gm\d+[a-z]?$/i.test(subject.name.trim())) {
      reason = 'Group code pattern (Gm1, Gm2, etc.)';
      confidence = 'high';
    }
    
    // 5. Parentheses or brackets without content
    else if (/^\(.*\)$/.test(subject.name.trim()) || /^\[.*\]$/.test(subject.name.trim())) {
      reason = 'Name in parentheses/brackets only';
      confidence = 'medium';
    }
    
    // 6. Names that look like file paths or technical strings
    else if (subject.name.includes('/') && !subject.name.includes(' / ')) {
      reason = 'Contains forward slash (possible file path or date)';
      confidence = 'medium';
    }
    
    // 7. Repeated characters or obvious typos
    else if (/(.)\1{3,}/.test(subject.name)) {
      reason = 'Contains repeated characters';
      confidence = 'high';
    }
    
    // 8. Names that are incomplete phrases
    else if (subject.name.trim().endsWith(' i') || subject.name.trim().endsWith(' de') || 
             subject.name.trim().endsWith(' la') || subject.name.trim().endsWith(' el')) {
      reason = 'Ends with conjunction/article (likely incomplete)';
      confidence = 'high';
    }
    
    // 9. Names with multiple spaces or weird spacing
    else if (/\s{3,}/.test(subject.name) || /^\s+|\s+$/.test(subject.name)) {
      reason = 'Unusual spacing';
      confidence = 'medium';
    }
    
    // 10. Names that are just single words that look like fragments
    else if (/^(de|la|el|i|amb|per|en|un|una)$/i.test(subject.name.trim())) {
      reason = 'Single article/preposition';
      confidence = 'high';
    }

    if (reason) {
      suspiciousSubjects.push({
        id: subject.id,
        code: subject.code,
        name: subject.name,
        year: subject.year,
        type: subject.type,
        reason,
        hasAssignments,
        confidence
      });
    }
  }

  // Sort by confidence and then by reason
  suspiciousSubjects.sort((a, b) => {
    const confidenceOrder = { high: 0, medium: 1, low: 2 };
    const confDiff = confidenceOrder[a.confidence] - confidenceOrder[b.confidence];
    if (confDiff !== 0) return confDiff;
    return a.reason.localeCompare(b.reason);
  });

  // Display results
  console.log(`Found ${suspiciousSubjects.length} suspicious subjects:\n`);

  // Group by confidence
  const highConfidence = suspiciousSubjects.filter(s => s.confidence === 'high');
  const mediumConfidence = suspiciousSubjects.filter(s => s.confidence === 'medium');
  const lowConfidence = suspiciousSubjects.filter(s => s.confidence === 'low');

  if (highConfidence.length > 0) {
    console.log('HIGH CONFIDENCE ERRORS:');
    console.log('=' + '='.repeat(79));
    console.log('Name | Code | Reason | Has Assignments?');
    console.log('-'.repeat(80));
    
    highConfidence.forEach(s => {
      console.log(
        `"${s.name.padEnd(30)}" | ${s.code.padEnd(10)} | ${s.reason.padEnd(35)} | ${s.hasAssignments ? 'Yes' : 'No'}`
      );
    });
  }

  if (mediumConfidence.length > 0) {
    console.log('\n\nMEDIUM CONFIDENCE ERRORS:');
    console.log('=' + '='.repeat(79));
    console.log('Name | Code | Reason | Has Assignments?');
    console.log('-'.repeat(80));
    
    mediumConfidence.forEach(s => {
      console.log(
        `"${s.name.padEnd(30)}" | ${s.code.padEnd(10)} | ${s.reason.padEnd(35)} | ${s.hasAssignments ? 'Yes' : 'No'}`
      );
    });
  }

  // Look for these in Excel data
  console.log('\n\nCROSS-CHECKING WITH EXCEL DATA...');
  console.log('=' + '='.repeat(79));
  
  const excelDataPath = path.join(__dirname, '../csv/all_excel_schedules_merged.json');
  const excelData = JSON.parse(fs.readFileSync(excelDataPath, 'utf-8'));
  
  const notInExcel: SuspiciousSubject[] = [];
  
  for (const subject of highConfidence) {
    const found = excelData.data.some((entry: any) => 
      entry.asignatura.toLowerCase().includes(subject.name.toLowerCase().trim()) ||
      subject.name.toLowerCase().trim().includes(entry.asignatura.toLowerCase())
    );
    
    if (!found) {
      notInExcel.push(subject);
    }
  }

  console.log(`\n${notInExcel.length} high-confidence errors NOT found in Excel data`);

  // Generate deletion script for high confidence errors
  const toDelete = highConfidence.filter(s => 
    !s.hasAssignments && 
    (s.reason.includes('Group code pattern') || 
     s.reason.includes('Very short name') ||
     s.reason.includes('Ends with punctuation') ||
     s.reason.includes('Single article/preposition'))
  );

  if (toDelete.length > 0) {
    console.log('\n' + '='.repeat(80));
    console.log('RECOMMENDED FOR DELETION:');
    console.log('=' + '='.repeat(80));
    
    toDelete.forEach(s => {
      console.log(`  - "${s.name}" (${s.code}) - ${s.reason}`);
    });

    // Create deletion script
    const deletionScriptPath = path.join(__dirname, 'delete-error-subjects.ts');
    const deletionScript = `#!/usr/bin/env tsx
/**
 * Delete subjects that are clearly extraction errors
 * Generated on: ${new Date().toISOString()}
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteErrorSubjects() {
  const subjectsToDelete = ${JSON.stringify(toDelete.map(s => ({ 
    id: s.id, 
    name: s.name,
    reason: s.reason 
  })), null, 2)};

  console.log('Deleting subjects that are clearly errors...');
  console.log('Total to delete: ' + subjectsToDelete.length);
  
  for (const subject of subjectsToDelete) {
    console.log(\`\\nDeleting "\${subject.name}" - \${subject.reason}\`);
    
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subject.id);
    
    if (error) {
      console.error(\`Failed to delete \${subject.name}:\`, error);
    } else {
      console.log(\`✓ Deleted "\${subject.name}"\`);
    }
  }
  
  console.log('\\nDeletion complete!');
}

deleteErrorSubjects();
`;

    fs.writeFileSync(deletionScriptPath, deletionScript);
    console.log(`\nDeletion script created: ${deletionScriptPath}`);
    console.log('Run it with: npx tsx delete-error-subjects.ts');
  }

  // Save full report
  const reportPath = path.join(__dirname, '../csv/suspicious_subjects_report.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    total_suspicious: suspiciousSubjects.length,
    by_confidence: {
      high: highConfidence.length,
      medium: mediumConfidence.length,
      low: lowConfidence.length
    },
    subjects: suspiciousSubjects
  }, null, 2));
  
  console.log(`\n\nFull report saved to: ${reportPath}`);
}

// Run detection
detectMoreErrors();