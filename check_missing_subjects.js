const XLSX = require('xlsx');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkMissingSubjects() {
  // Read Excel data
  const workbook = XLSX.readFile('/Users/josepmarimon/Documents/grups.xlsx');
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = XLSX.utils.sheet_to_json(worksheet);
  
  // Get unique subjects from Excel
  const excelSubjects = [...new Set(data.map(row => row['ID Assignatura']))];
  console.log(`Total unique subjects in Excel: ${excelSubjects.length}`);
  
  // Get subjects from database
  const { data: dbSubjects, error } = await supabase
    .from('subjects')
    .select('code');
    
  if (error) {
    console.error('Error fetching subjects:', error);
    return;
  }
  
  const dbSubjectCodes = dbSubjects.map(s => s.code);
  console.log(`Total subjects in database: ${dbSubjectCodes.length}`);
  
  // Find missing subjects
  const missingSubjects = excelSubjects.filter(code => !dbSubjectCodes.includes(code));
  
  console.log(`\nMissing subjects (in Excel but not in DB): ${missingSubjects.length}`);
  if (missingSubjects.length > 0) {
    console.log('Missing subjects:', missingSubjects.sort().join(', '));
  }
  
  // Check teachers too
  const excelTeachers = [...new Set(data.map(row => row['ID Profe']))].filter(id => id);
  console.log(`\nTotal unique teachers in Excel: ${excelTeachers.length}`);
  
  const { data: dbTeachers, error: teacherError } = await supabase
    .from('teachers')
    .select('id_profe');
    
  if (teacherError) {
    console.error('Error fetching teachers:', teacherError);
    return;
  }
  
  const dbTeacherIds = dbTeachers.map(t => t.id_profe).filter(id => id);
  console.log(`Total teachers with id_profe in database: ${dbTeacherIds.length}`);
  
  const missingTeachers = excelTeachers.filter(id => !dbTeacherIds.includes(String(id)));
  console.log(`\nMissing teachers (in Excel but not in DB): ${missingTeachers.length}`);
  if (missingTeachers.length > 0) {
    console.log('Missing teacher IDs:', missingTeachers.sort((a,b) => a-b).join(', '));
  }
}

checkMissingSubjects();