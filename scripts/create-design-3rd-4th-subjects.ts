import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createDesign3rd4thSubjects() {
  console.log('📚 CREANT ASSIGNATURES DE DISSENY 3r i 4t')
  console.log('=========================================\n')
  
  // Assignatures dels horaris que necessitem crear o mapejar
  const subjectsToCreate = [
    // 3r curs - Comunes
    { 
      code: 'GD301', 
      name: 'Projectes de Disseny Gràfic i Comunicació Visual I', 
      credits: 12, 
      year: 3, 
      type: 'obligatoria',
      department: 'EINES'
    },
    { 
      code: 'GD302', 
      name: 'Projectes de Disseny Gràfic i Comunicació Visual II', 
      credits: 12, 
      year: 3, 
      type: 'obligatoria',
      department: 'EINES'
    },
    { 
      code: 'GD303', 
      name: 'Ecoedició', 
      credits: 3, 
      year: 3, 
      type: 'obligatoria',
      department: 'EINES'
    },
    { 
      code: 'GD304', 
      name: 'Editorial', 
      credits: 3, 
      year: 3, 
      type: 'obligatoria',
      department: 'EINES'
    },
    { 
      code: 'GD305', 
      name: 'Experimental Type', 
      credits: 3, 
      year: 3, 
      type: 'obligatoria',
      department: 'EINES'
    },
    { 
      code: 'GD306', 
      name: 'Direcció d\'Art', 
      credits: 3, 
      year: 3, 
      type: 'obligatoria',
      department: 'EINES'
    },
    
    // 4t curs - Comunes
    { 
      code: 'GD401', 
      name: 'Projectes de Disseny Gràfic i Comunicació Visual III', 
      credits: 12, 
      year: 4, 
      type: 'obligatoria',
      department: 'EINES'
    },
    { 
      code: 'GD402', 
      name: 'Projectes de Disseny Gràfic i Comunicació Visual IV', 
      credits: 12, 
      year: 4, 
      type: 'obligatoria',
      department: 'EINES'
    },
    { 
      code: 'GD403', 
      name: 'Packaging', 
      credits: 3, 
      year: 4, 
      type: 'obligatoria',
      department: 'EINES'
    },
    { 
      code: 'GD404', 
      name: 'Disseny d\'Identitat Visual', 
      credits: 3, 
      year: 4, 
      type: 'obligatoria',
      department: 'EINES'
    },
    { 
      code: 'GD405', 
      name: 'Metodologies del Disseny', 
      credits: 3, 
      year: 4, 
      type: 'obligatoria',
      department: 'EINES'
    },
    { 
      code: 'GD499', 
      name: 'Treball Final de Grau', 
      credits: 12, 
      year: 4, 
      type: 'tfg',
      department: 'EINES'
    },
    
    // Optatives genèriques
    { 
      code: 'GDOPT', 
      name: 'Optativitat', 
      credits: 6, 
      year: 3, 
      type: 'optativa',
      department: 'EINES'
    }
  ]
  
  let created = 0
  let errors = 0
  let existing = 0
  
  for (const subject of subjectsToCreate) {
    try {
      // Primer comprovar si existeix
      const { data: existingSubject } = await supabase
        .from('subjects')
        .select('id, code, name')
        .eq('code', subject.code)
        .single()
      
      if (existingSubject) {
        console.log(`⏭️  Assignatura ja existeix: ${subject.code} - ${existingSubject.name}`)
        existing++
        continue
      }
      
      // Crear l'assignatura
      const { error } = await supabase
        .from('subjects')
        .insert({
          code: subject.code,
          name: subject.name,
          credits: subject.credits,
          year: subject.year,
          type: subject.type,
          department: subject.department
        })
      
      if (error) {
        console.error(`❌ Error creant ${subject.name}:`, error)
        errors++
      } else {
        console.log(`✅ Creada: ${subject.code} - ${subject.name} (${subject.credits} crèdits, ${subject.year}r any)`)
        created++
      }
    } catch (err) {
      console.error(`❌ Error processant ${subject.name}:`, err)
      errors++
    }
  }
  
  console.log('\n=========================================')
  console.log(`📊 Resum: ${created} assignatures creades, ${existing} ja existien, ${errors} errors`)
  
  // Suggerir mapeig amb assignatures existents
  console.log('\n💡 SUGGERIMENT DE MAPEIG AMB ASSIGNATURES EXISTENTS:')
  console.log('====================================================')
  console.log('Potser aquestes assignatures dels horaris corresponen a:')
  console.log('- "Projectes de Disseny Gràfic..." → "Taller de Gràfic i Comunicació Visual I/II/III"')
  console.log('- "Experimental Type" → "Tipografia I/II"')
  console.log('- "Direcció d\'Art" → Part del taller de gràfic')
  console.log('- Les optatives són assignatures específiques que s\'haurien d\'assignar individualment')
}

// Executar
createDesign3rd4thSubjects().catch(console.error)