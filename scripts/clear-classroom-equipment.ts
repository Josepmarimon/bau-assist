import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function clearEquipment() {
  try {
    console.log('Clearing equipment data from all classrooms...');
    
    // Update all classrooms to have empty equipment array
    const { data, error } = await supabase
      .from('classrooms')
      .update({ equipment: [] })
      .not('id', 'is', null) // Update all rows
      .select();

    if (error) {
      console.error('Error clearing equipment:', error);
      return;
    }

    console.log(`\nSuccessfully cleared equipment data from ${data.length} classrooms!`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
clearEquipment();