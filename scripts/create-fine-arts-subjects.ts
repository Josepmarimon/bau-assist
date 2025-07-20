import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createFineArtsSubjects() {
  console.log('🎨 CREANT ASSIGNATURES DE BELLES ARTS')
  console.log('=====================================\n')
  
  const fineArtsSubjects = [
    // 1r curs
    { code: 'BA101', name: '2D. Llenguatges, Tècniques i Tecnologies', credits: 6, year: 1, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA102', name: 'Visualisation and Documentation Workshop', credits: 6, year: 1, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA103', name: '4D. Llenguatges, Tècniques i Tecnologies', credits: 6, year: 1, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA104', name: 'Taller de Dibuix I', credits: 6, year: 1, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA105', name: 'Pensament Modern i Pràctiques Artístiques', credits: 6, year: 1, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA106', name: 'Taller de Dibuix II', credits: 6, year: 1, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA107', name: '3D. Llenguatges, Tècniques i Tecnologies', credits: 6, year: 1, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA108', name: 'Estètica', credits: 6, year: 1, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA109', name: 'Art, Institució i Mercat', credits: 6, year: 1, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA110', name: 'Laboratori de Processos i Projectes I', credits: 6, year: 1, type: 'obligatoria', department: 'BELLES ARTS' },
    
    // 2n curs
    { code: 'BA201', name: '4D. Llenguatges, Tècniques i Tecnologies Instal·lades', credits: 6, year: 2, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA202', name: '2D. Llenguatges, Tècniques i Tecnologies Instal·lades', credits: 6, year: 2, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA203', name: 'Laboratori de Processos i Projectes II', credits: 6, year: 2, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA204', name: 'Pensament Contemporani i Pràctiques Crítiques', credits: 6, year: 2, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA205', name: 'Writing and Communication Workshop', credits: 6, year: 2, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA206', name: 'Antropologia', credits: 6, year: 2, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA207', name: 'Laboratori de Processos i Projectes III', credits: 6, year: 2, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA208', name: 'XD. Llenguatges, Tècniques i Tecnologies', credits: 6, year: 2, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA209', name: 'Art, Activisme, Mediació i Pedagogia', credits: 6, year: 2, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA210', name: '3D. Llenguatges, Tècniques i Tecnologies Instal·lades', credits: 6, year: 2, type: 'obligatoria', department: 'BELLES ARTS' },
    
    // 3r curs
    { code: 'BA301', name: 'Pràctiques Artístiques i Recerca', credits: 6, year: 3, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA302', name: 'Laboratori de Processos i Projectes IV', credits: 6, year: 3, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA303', name: 'Laboratori de Processos i Projectes V', credits: 6, year: 3, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA304', name: 'Art Practices in Context Seminar I', credits: 6, year: 3, type: 'obligatoria', department: 'BELLES ARTS' },
    
    // 4t curs
    { code: 'BA401', name: 'Art Practices in Context Seminar II', credits: 6, year: 4, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA402', name: 'Laboratori de Processos i Projectes VI', credits: 6, year: 4, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA403', name: 'Metodologies Transdisciplinàries i Experimentals', credits: 6, year: 4, type: 'obligatoria', department: 'BELLES ARTS' },
    { code: 'BA404', name: 'Treball Final de Grau', credits: 12, year: 4, type: 'tfg', department: 'BELLES ARTS' }
  ]
  
  let created = 0
  let errors = 0
  
  for (const subject of fineArtsSubjects) {
    try {
      // Primer comprovar si existeix
      const { data: existing } = await supabase
        .from('subjects')
        .select('id')
        .eq('code', subject.code)
        .single()
      
      if (existing) {
        console.log(`⏭️  Assignatura ja existeix: ${subject.name}`)
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
        console.log(`✅ Creada: ${subject.name}`)
        created++
      }
    } catch (err) {
      console.error(`❌ Error processant ${subject.name}:`, err)
      errors++
    }
  }
  
  console.log('\n=====================================')
  console.log(`📊 Resum: ${created} assignatures creades, ${errors} errors`)
}

// Executar
createFineArtsSubjects().catch(console.error)