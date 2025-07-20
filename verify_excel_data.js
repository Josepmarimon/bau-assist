const XLSX = require('xlsx');

// Read the Excel file
const workbook = XLSX.readFile('/Users/josepmarimon/Documents/grups.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet);

// Get unique subject IDs and teacher IDs from Excel
const uniqueSubjects = [...new Set(data.map(row => row['ID Assignatura']))];
const uniqueTeachers = [...new Set(data.map(row => row['ID Profe']))];

console.log('=== EXCEL DATA SUMMARY ===');
console.log(`Total rows: ${data.length}`);
console.log(`Unique subjects: ${uniqueSubjects.length}`);
console.log(`Unique teachers: ${uniqueTeachers.length}`);

// Group data by subject for analysis
const subjectGroups = {};
data.forEach(row => {
  const subjectId = row['ID Assignatura'];
  const groupCode = `${row['Curs']}-${row['Grup']}`;
  
  if (!subjectGroups[subjectId]) {
    subjectGroups[subjectId] = [];
  }
  
  subjectGroups[subjectId].push({
    groupCode: groupCode,
    teacherId: row['ID Profe'],
    curs: row['Curs'],
    grup: row['Grup'],
    orientacio: row['Orientació assig'] || null
  });
});

console.log('\n=== SAMPLE GROUP ASSIGNMENTS ===');
// Show first 5 subjects with their groups
Object.keys(subjectGroups).slice(0, 5).forEach(subjectId => {
  console.log(`\nSubject: ${subjectId}`);
  subjectGroups[subjectId].forEach(group => {
    console.log(`  Group: ${group.groupCode}, Teacher: ${group.teacherId}`);
  });
});

// Export data for SQL verification
console.log('\n=== SQL TO VERIFY SUBJECTS ===');
console.log(`SELECT code FROM subjects WHERE code IN (${uniqueSubjects.map(s => `'${s}'`).join(',')});`);

console.log('\n=== SQL TO VERIFY TEACHERS ===');
console.log(`SELECT id_profe FROM teachers WHERE id_profe IN (${uniqueTeachers.filter(t => t).map(t => `'${t}'`).join(',')});`);