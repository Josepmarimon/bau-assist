import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function clearAllAssignments() {
  try {
    console.log('Starting to clear all assignment data...\n');

    // 1. Clear scheduling conflicts first (if any)
    console.log('1. Clearing scheduling conflicts...');
    const { error: conflictsError, count: conflictsCount } = await supabase
      .from('scheduling_conflicts')
      .delete()
      .not('id', 'is', null)
      .select();

    if (conflictsError) {
      console.error('Error clearing scheduling conflicts:', conflictsError);
    } else {
      console.log(`   ✅ Cleared ${conflictsCount || 0} scheduling conflicts`);
    }

    // 2. Clear main assignments table (classroom scheduling)
    console.log('\n2. Clearing classroom assignments...');
    const { error: assignmentsError, count: assignmentsCount } = await supabase
      .from('assignments')
      .delete()
      .not('id', 'is', null)
      .select();

    if (assignmentsError) {
      console.error('Error clearing assignments:', assignmentsError);
    } else {
      console.log(`   ✅ Cleared ${assignmentsCount || 0} classroom assignments`);
    }

    // 3. Clear teaching assignments (teacher-subject assignments)
    console.log('\n3. Clearing teaching assignments...');
    const { error: teachingError, count: teachingCount } = await supabase
      .from('teaching_assignments')
      .delete()
      .not('id', 'is', null)
      .select();

    if (teachingError) {
      console.error('Error clearing teaching assignments:', teachingError);
    } else {
      console.log(`   ✅ Cleared ${teachingCount || 0} teaching assignments`);
    }

    console.log('\n🎉 All assignment data has been cleared successfully!');
    console.log('\nSummary:');
    console.log(`- Scheduling conflicts cleared: ${conflictsCount || 0}`);
    console.log(`- Classroom assignments cleared: ${assignmentsCount || 0}`);
    console.log(`- Teaching assignments cleared: ${teachingCount || 0}`);
    console.log('\nThe system is now ready for manual assignment of subjects to classrooms.');

  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Run the script
clearAllAssignments();