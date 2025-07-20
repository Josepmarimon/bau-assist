import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function updateClassroomTypes() {
  try {
    console.log('Updating classroom types based on names...');
    
    // First, let's see what classrooms we have
    const { data: classrooms, error: fetchError } = await supabase
      .from('classrooms')
      .select('id, name, type');
      
    if (fetchError) {
      console.error('Error fetching classrooms:', fetchError);
      return;
    }
    
    console.log(`Found ${classrooms?.length} classrooms`);
    
    // Update classrooms that have "Projectes" in their name to type 'projectes'
    const projectesClassrooms = classrooms?.filter(c => 
      c.name.toLowerCase().includes('projectes') || 
      c.name.toLowerCase().includes('projecte')
    ) || [];
    
    if (projectesClassrooms.length > 0) {
      console.log(`\nUpdating ${projectesClassrooms.length} project classrooms...`);
      for (const classroom of projectesClassrooms) {
        const { error } = await supabase
          .from('classrooms')
          .update({ type: 'polivalent' }) // Using 'polivalent' since 'projectes' might not exist yet
          .eq('id', classroom.id);
          
        if (error) {
          console.error(`Error updating ${classroom.name}:`, error);
        } else {
          console.log(`Updated ${classroom.name} to type 'polivalent'`);
        }
      }
    }
    
    // Show summary of classroom types
    const { data: updatedClassrooms } = await supabase
      .from('classrooms')
      .select('type');
      
    const typeCounts = updatedClassrooms?.reduce((acc: any, curr) => {
      acc[curr.type] = (acc[curr.type] || 0) + 1;
      return acc;
    }, {}) || {};
    
    console.log('\nClassroom type summary:');
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`- ${type}: ${count} classrooms`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
}

// Run the script
updateClassroomTypes();