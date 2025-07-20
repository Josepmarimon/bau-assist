const XLSX = require('xlsx');
const fs = require('fs');

// Read the Excel file
const workbook = XLSX.readFile('/Users/josepmarimon/Documents/grups.xlsx');

// Get sheet names
console.log('Sheet names:', workbook.SheetNames);

// Read the first sheet
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

// Convert to JSON
const data = XLSX.utils.sheet_to_json(worksheet);

console.log(`\nTotal rows: ${data.length}`);
console.log('\nFirst 5 rows:');
console.log(JSON.stringify(data.slice(0, 5), null, 2));

// Get column names
if (data.length > 0) {
  console.log('\nColumn names:');
  Object.keys(data[0]).forEach(col => {
    console.log(`  - ${col}`);
  });
}

// Analyze unique values
const uniqueAssignatures = new Set();
const uniqueProfessors = new Set();
const uniqueCursos = new Set();
const uniqueGrups = new Set();
const uniqueOrientacions = new Set();

data.forEach(row => {
  if (row['ID Assignatura']) uniqueAssignatures.add(row['ID Assignatura']);
  if (row['ID Profe']) uniqueProfessors.add(row['ID Profe']);
  if (row['Curs']) uniqueCursos.add(row['Curs']);
  if (row['Grup']) uniqueGrups.add(row['Grup']);
  if (row['Orientació assig']) uniqueOrientacions.add(row['Orientació assig']);
});

console.log(`\nUnique Assignatures: ${uniqueAssignatures.size}`);
console.log(`Unique Professors: ${uniqueProfessors.size}`);
console.log(`Unique Cursos: ${Array.from(uniqueCursos).sort().join(', ')}`);
console.log(`Unique Grups: ${Array.from(uniqueGrups).sort().join(', ')}`);
console.log(`Unique Orientacions: ${Array.from(uniqueOrientacions).sort().join(', ')}`);

// Show some examples of group naming
console.log('\nExamples of group combinations:');
const groupExamples = data.slice(0, 20).map(row => {
  return `${row['Curs']}-${row['Grup']} (Assignatura: ${row['ID Assignatura']}, Professor: ${row['ID Profe']})`;
});
groupExamples.forEach(ex => console.log(`  ${ex}`));