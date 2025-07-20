const XLSX = require('xlsx');
const workbook = XLSX.readFile('/Users/josepmarimon/Documents/grups.xlsx');
const worksheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(worksheet);

// Check for Orientació assig column
const withOrientacio = data.filter(row => row['Orientació assig'] && row['Orientació assig'].trim() !== '');
console.log(`Total rows: ${data.length}`);
console.log(`Rows with Orientació assig: ${withOrientacio.length}`);

if (withOrientacio.length > 0) {
  console.log('\nExamples with Orientació:');
  withOrientacio.slice(0, 10).forEach(row => {
    console.log(`  ${row['ID Assignatura']} - ${row['Curs']}-${row['Grup']} - Orientació: "${row['Orientació assig']}"`);
  });
  
  // Count unique orientacions
  const uniqueOrientacions = new Set(withOrientacio.map(row => row['Orientació assig']));
  console.log(`\nUnique Orientacions: ${Array.from(uniqueOrientacions).join(', ')}`);
}