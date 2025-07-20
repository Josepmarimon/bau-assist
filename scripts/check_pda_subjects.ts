import { createClient } from '@supabase/supabase-js';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkPDASubjects() {
  console.log('Checking Projectes de Disseny Audiovisual subjects...\n');

  // Get all PDA subjects
  const { data: subjects, error: subjectsError } = await supabase
    .from('subjects')
    .select('*')
    .like('name', '%Projectes de Disseny Audiovisual%')
    .order('name');

  if (subjectsError) {
    console.error('Error fetching subjects:', subjectsError);
    return;
  }

  console.log(`Found ${subjects?.length || 0} PDA subjects:\n`);

  for (const subject of subjects || []) {
    console.log(`Subject: ${subject.name}`);
    console.log(`  Code: ${subject.code}`);
    console.log(`  ID: ${subject.id}`);
    console.log(`  Credits: ${subject.credits}`);
    console.log(`  Type: ${subject.type}`);

    // Get groups for this subject
    const { data: groups, error: groupsError } = await supabase
      .from('subject_groups')
      .select('*')
      .eq('subject_id', subject.id)
      .order('name');

    if (groupsError) {
      console.error(`  Error fetching groups: ${groupsError.message}`);
    } else {
      console.log(`  Groups (${groups?.length || 0}):`);
      for (const group of groups || []) {
        console.log(`    - ${group.name} (${group.type}, max: ${group.max_students})`);
      }
    }

    // Get assignments for this subject
    const { data: assignments, error: assignmentsError } = await supabase
      .from('assignments')
      .select('*, subject_groups(name), time_slots(day_of_week, start_time, end_time)')
      .eq('subject_id', subject.id);

    if (assignmentsError) {
      console.error(`  Error fetching assignments: ${assignmentsError.message}`);
    } else {
      console.log(`  Assignments (${assignments?.length || 0}):`);
      for (const assignment of assignments || []) {
        const timeSlot = assignment.time_slots;
        console.log(`    - Group: ${assignment.subject_groups?.name || 'N/A'}`);
        if (timeSlot) {
          console.log(`      Time: ${timeSlot.day_of_week} ${timeSlot.start_time}-${timeSlot.end_time}`);
        }
        console.log(`      Hours/week: ${assignment.hours_per_week}`);
      }
    }

    console.log();
  }
}

checkPDASubjects()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  });