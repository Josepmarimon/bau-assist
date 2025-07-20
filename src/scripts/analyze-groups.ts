import * as fs from 'fs'
import * as path from 'path'

// Llegir fitxer CSV
const csvPath = path.join(process.cwd(), 'csv', 'AssignacioDocent_2526_Preparacio(DISSENY).csv')
const fileContent = fs.readFileSync(csvPath, 'latin1')

// Separar per línies i saltar les primeres 3
const lines = fileContent.split('\n').slice(3)

let groups = new Set<string>()
let groupsByYear = new Map<string, Set<string>>()

lines.forEach((line) => {
  if (!line.trim()) return
  
  const fields = line.split(';')
  
  // Columna 3 (índex 2) - Curs (GR1, GR2, etc.)
  const curs = fields[2]?.trim()
  // Columna 10 (índex 9) - Grup (M1, M2, T1, etc.)
  const grup = fields[9]?.trim()
  
  if (curs && grup && grup !== 'Grup') {
    groups.add(grup)
    
    if (!groupsByYear.has(curs)) {
      groupsByYear.set(curs, new Set<string>())
    }
    groupsByYear.get(curs)!.add(grup)
  }
})

console.log(`\n📊 Anàlisi de grups:`)
console.log(`Total grups únics trobats: ${groups.size}`)
console.log(`\nGrups per curs:`)

groupsByYear.forEach((grups, curs) => {
  console.log(`\n${curs}: ${grups.size} grups`)
  console.log(`  ${Array.from(grups).sort().join(', ')}`)
})

console.log(`\n🔍 Tots els grups únics:`)
console.log(Array.from(groups).sort().join(', '))