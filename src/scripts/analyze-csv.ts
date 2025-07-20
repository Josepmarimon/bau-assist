import * as fs from 'fs'
import * as path from 'path'

// Llegir fitxer CSV
const csvPath = path.join(process.cwd(), 'csv', 'AssignacioDocent_2526_Preparacio(DISSENY).csv')
const fileContent = fs.readFileSync(csvPath, 'latin1')

// Separar per línies i saltar les primeres 3
const lines = fileContent.split('\n').slice(3)

let professorIds = new Set<string>()
let professorNames = new Map<string, string>()

lines.forEach((line, index) => {
  if (!line.trim()) return
  
  const fields = line.split(';')
  
  // Columna 13 (índex 12) - ID Profe del curs 2024/2025
  if (fields[12] && fields[12].trim()) {
    professorIds.add(fields[12].trim())
    
    // Columna 17 (índex 16) - PDI
    if (fields[16] && fields[16].trim()) {
      professorNames.set(fields[12].trim(), fields[16].trim())
    }
  }
  
  // Columna 22 (índex 21) - ID Profe del curs 2025/2026
  if (fields[21] && fields[21].trim()) {
    professorIds.add(fields[21].trim())
    
    // Columna 24 (índex 23) - PDI del 2025/2026
    if (fields[23] && fields[23].trim()) {
      professorNames.set(fields[21].trim(), fields[23].trim())
    }
  }
})

console.log(`\n📊 Anàlisi del CSV:`)
console.log(`Total professors únics trobats: ${professorIds.size}`)
console.log(`\nPrimers 20 professors:`)

let count = 0
professorIds.forEach(id => {
  if (count < 20) {
    const name = professorNames.get(id) || 'Sense nom'
    console.log(`  ${id}: ${name}`)
    count++
  }
})

console.log(`\n🔍 IDs de tots els professors:`)
console.log(Array.from(professorIds).sort((a, b) => parseInt(a) - parseInt(b)).join(', '))