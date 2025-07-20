#!/usr/bin/env tsx
/**
 * Delete malformed subjects that appear to be extraction errors
 * Generated on: 2025-07-14T16:24:07.272Z
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteMalformedSubjects() {
  const subjectsToDelete = [
  {
    "id": "8e1adc79-5f1c-4893-bf35-dde05246c852",
    "name": "22/04)"
  },
  {
    "id": "e55dc564-007d-4ac6-8623-6a721ca6f806",
    "name": "28/04)"
  }
];

  console.log('Deleting malformed subjects...');
  
  for (const subject of subjectsToDelete) {
    console.log(`Deleting "${subject.name}"...`);
    
    // First delete any assignments
    await supabase
      .from('assignments')
      .delete()
      .eq('subject_id', subject.id);
    
    // Then delete the subject
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', subject.id);
    
    if (error) {
      console.error(`Failed to delete ${subject.name}:`, error);
    } else {
      console.log(`✓ Deleted "${subject.name}"`);
    }
  }
  
  console.log('\nDeletion complete!');
}

deleteMalformedSubjects();
