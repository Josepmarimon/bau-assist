#!/usr/bin/env tsx
/**
 * Delete subjects that are clearly extraction errors
 * Generated on: 2025-07-14T16:26:39.669Z
 */

import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '../.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function deleteErrorSubjects() {
  const subjectsToDelete = [
  {
    "id": "7721bc41-f98d-46b0-832b-7b83593508d7",
    "name": "Empresa i Economia,",
    "reason": "Ends with punctuation (likely truncated)"
  },
  {
    "id": "efe12b90-51a4-4ea3-9c0a-6173ccd2f3fa",
    "name": "Gm1b",
    "reason": "Group code pattern (Gm1, Gm2, etc.)"
  }
];

  console.log('Deleting subjects that are clearly errors...');
  console.log('Total to delete: ' + subjectsToDelete.length);
  
  for (const subject of subjectsToDelete) {
    console.log(`\nDeleting "${subject.name}" - ${subject.reason}`);
    
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

deleteErrorSubjects();
