import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function addMissingTeacher() {
  console.log('Adding missing teacher ID 610...');
  
  const { data, error } = await supabase
    .from('teachers')
    .insert({
      id_profe: '610',
      first_name: 'Professor',
      last_name: '610',
      email: 'professor610@bau.edu',
      department: 'Unknown',
      contract_type: 'Pending'
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error adding teacher:', error);
  } else {
    console.log('Successfully added teacher:', data);
  }
}

addMissingTeacher();