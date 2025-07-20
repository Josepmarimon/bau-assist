#!/usr/bin/env tsx
/**
 * Find potential duplicate subjects between Excel and Database
 * Uses fuzzy matching to identify subjects that might be the same
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

interface SubjectMatch {
  dbSubject: {
    id: string;
    code: string;
    name: string;
    year: number;
    type: string;
  };
  excelName: string;
  similarity: number;
  matchType: 'exact' | 'high' | 'medium' | 'partial';
}

// Calculate Levenshtein distance
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,
          dp[i][j - 1] + 1,
          dp[i - 1][j - 1] + 1
        );
      }
    }
  }

  return dp[m][n];
}

// Calculate similarity percentage
function calculateSimilarity(str1: string, str2: string): number {
  const maxLen = Math.max(str1.length, str2.length);
  if (maxLen === 0) return 100;
  const distance = levenshteinDistance(str1, str2);
  return Math.round((1 - distance / maxLen) * 100);
}

// Normalize text for comparison
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[.,;:!?'"]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ') // Normalize spaces
    .replace(/·/g, '.') // Normalize dots
    .replace(/\s*i\s*/g, ' ') // Normalize "i" conjunction
    .replace(/d'/g, 'de ') // Normalize "d'"
    .replace(/l'/g, 'la '); // Normalize "l'"
}

// Check if one string contains significant parts of another
function containsSignificantParts(str1: string, str2: string): boolean {
  const words1 = str1.split(' ').filter(w => w.length > 3);
  const words2 = str2.split(' ').filter(w => w.length > 3);
  
  // Check if all significant words from the shorter string are in the longer one
  const shorter = words1.length < words2.length ? words1 : words2;
  const longer = words1.length < words2.length ? words2 : words1;
  
  if (shorter.length === 0) return false;
  
  const matchedWords = shorter.filter(word => 
    longer.some(w => w.includes(word) || word.includes(w))
  );
  
  return matchedWords.length / shorter.length >= 0.7;
}

async function findDuplicateSubjects() {
  console.log('Finding potential duplicate subjects between Excel and Database...');
  console.log('=' + '='.repeat(79));

  // Load Excel data
  const excelDataPath = path.join(__dirname, '../csv/all_excel_schedules_merged.json');
  const excelData = JSON.parse(fs.readFileSync(excelDataPath, 'utf-8'));
  
  // Get unique subject names from Excel
  const excelSubjectNames = new Set<string>();
  const excelSubjectsByName = new Map<string, Set<string>>(); // name -> set of degrees
  
  for (const entry of excelData.data) {
    const normalized = normalizeText(entry.asignatura);
    excelSubjectNames.add(normalized);
    
    if (!excelSubjectsByName.has(normalized)) {
      excelSubjectsByName.set(normalized, new Set());
    }
    excelSubjectsByName.get(normalized)!.add(entry.degree);
  }

  // Get all subjects from database
  const { data: dbSubjects, error } = await supabase
    .from('subjects')
    .select('*')
    .order('name');

  if (error) {
    console.error('Error fetching subjects:', error);
    return;
  }

  const potentialDuplicates: SubjectMatch[] = [];
  const exactMatches: SubjectMatch[] = [];
  
  // For each DB subject, find best matches in Excel
  for (const dbSubject of dbSubjects || []) {
    const dbNormalized = normalizeText(dbSubject.name);
    let bestMatch: SubjectMatch | null = null;
    
    for (const excelName of excelSubjectNames) {
      // Skip if it's the same normalized name (exact match)
      if (dbNormalized === excelName) {
        exactMatches.push({
          dbSubject: {
            id: dbSubject.id,
            code: dbSubject.code,
            name: dbSubject.name,
            year: dbSubject.year,
            type: dbSubject.type
          },
          excelName: Array.from(excelSubjectsByName.entries())
            .find(([normalized]) => normalized === excelName)?.[0] || excelName,
          similarity: 100,
          matchType: 'exact'
        });
        continue;
      }
      
      // Calculate similarity
      const similarity = calculateSimilarity(dbNormalized, excelName);
      
      // Also check if one contains significant parts of the other
      const containsParts = containsSignificantParts(dbNormalized, excelName);
      
      // Determine match quality
      let matchType: 'high' | 'medium' | 'partial' = 'partial';
      if (similarity >= 85) matchType = 'high';
      else if (similarity >= 70 || containsParts) matchType = 'medium';
      
      // Only consider matches above 60% similarity or that contain significant parts
      if (similarity >= 60 || containsParts) {
        const adjustedSimilarity = containsParts ? Math.max(similarity, 70) : similarity;
        
        if (!bestMatch || adjustedSimilarity > bestMatch.similarity) {
          // Find original Excel name (not normalized)
          const originalExcelName = Array.from(excelSubjectsByName.entries())
            .find(([normalized]) => normalized === excelName)?.[0] || excelName;
          
          bestMatch = {
            dbSubject: {
              id: dbSubject.id,
              code: dbSubject.code,
              name: dbSubject.name,
              year: dbSubject.year,
              type: dbSubject.type
            },
            excelName: originalExcelName,
            similarity: adjustedSimilarity,
            matchType: matchType as any
          };
        }
      }
    }
    
    if (bestMatch && bestMatch.matchType !== 'partial') {
      potentialDuplicates.push(bestMatch);
    }
  }

  // Print results
  console.log(`\nFound ${exactMatches.length} exact matches`);
  console.log(`Found ${potentialDuplicates.length} potential duplicates\n`);

  // Group by match type
  const highMatches = potentialDuplicates.filter(m => m.matchType === 'high');
  const mediumMatches = potentialDuplicates.filter(m => m.matchType === 'medium');

  if (highMatches.length > 0) {
    console.log('HIGH SIMILARITY MATCHES (85%+ or very similar):');
    console.log('=' + '='.repeat(79));
    console.log('DB Name | Excel Name | Similarity | Code');
    console.log('-'.repeat(80));
    
    highMatches.forEach(match => {
      console.log(
        `${match.dbSubject.name.padEnd(35)} | ` +
        `${match.excelName.padEnd(35)} | ` +
        `${match.similarity}% | ` +
        `${match.dbSubject.code}`
      );
    });
  }

  if (mediumMatches.length > 0) {
    console.log('\n\nMEDIUM SIMILARITY MATCHES (70-84% or contains significant parts):');
    console.log('=' + '='.repeat(79));
    console.log('DB Name | Excel Name | Similarity | Code');
    console.log('-'.repeat(80));
    
    mediumMatches.forEach(match => {
      console.log(
        `${match.dbSubject.name.padEnd(35)} | ` +
        `${match.excelName.padEnd(35)} | ` +
        `${match.similarity}% | ` +
        `${match.dbSubject.code}`
      );
    });
  }

  // Special cases: Look for subjects that might be split or merged
  console.log('\n\nSPECIAL CASES - Possible splits or different formatting:');
  console.log('=' + '='.repeat(79));
  
  // Find DB subjects with numbers that might be split in Excel
  const numberedSubjects = (dbSubjects || []).filter(s => 
    /\d+D[,.]/.test(s.name) || /[IVX]+$/.test(s.name)
  );
  
  for (const subject of numberedSubjects) {
    // Remove numbers and roman numerals for base comparison
    const baseName = subject.name
      .replace(/\d+D[,.]?\s*/g, '')
      .replace(/\s+[IVX]+$/g, '')
      .trim();
    
    const baseNormalized = normalizeText(baseName);
    const excelMatches: string[] = [];
    
    for (const [excelName, degrees] of excelSubjectsByName.entries()) {
      if (excelName.includes(baseNormalized) || baseNormalized.includes(excelName)) {
        // Find original name
        const original = Array.from(excelSubjectsByName.entries())
          .find(([normalized]) => normalized === excelName)?.[0] || excelName;
        excelMatches.push(original);
      }
    }
    
    if (excelMatches.length > 0 && !exactMatches.some(m => m.dbSubject.id === subject.id)) {
      console.log(`\nDB: "${subject.name}" (${subject.code})`);
      console.log('Possible Excel matches:');
      excelMatches.forEach(match => console.log(`  - "${match}"`));
    }
  }

  // Save detailed report
  const reportPath = path.join(__dirname, '../csv/duplicate_subjects_analysis.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    generated_at: new Date().toISOString(),
    summary: {
      exact_matches: exactMatches.length,
      high_similarity: highMatches.length,
      medium_similarity: mediumMatches.length,
      total_potential_duplicates: potentialDuplicates.length
    },
    exact_matches: exactMatches,
    potential_duplicates: potentialDuplicates
  }, null, 2));
  
  console.log(`\n\nDetailed report saved to: ${reportPath}`);
}

// Run the analysis
findDuplicateSubjects();