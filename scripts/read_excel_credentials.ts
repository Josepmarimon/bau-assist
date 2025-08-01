import * as XLSX from 'xlsx'
import * as fs from 'fs'

const filePath = './csv/usuaris-guies-docents.xlsx'

try {
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const worksheet = workbook.Sheets[sheetName]
  const data = XLSX.utils.sheet_to_json(worksheet)
  
  console.log('Excel data sample (first 5 rows):')
  console.log(JSON.stringify(data.slice(0, 5), null, 2))
  
  console.log('\nTotal rows:', data.length)
  console.log('Columns:', Object.keys(data[0] || {}))
  
  // Save as JSON for the web page
  fs.writeFileSync('./csv/credentials_data.json', JSON.stringify(data, null, 2))
  console.log('\nData saved to csv/credentials_data.json')
} catch (error) {
  console.error('Error reading Excel file:', error)
}