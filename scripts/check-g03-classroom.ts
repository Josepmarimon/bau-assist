import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkG03Classroom() {
  const { data } = await supabase
    .from('classrooms')
    .select('code, name')
    .or('code.ilike.%G.0.3%,name.ilike.%G.0.3%,code.ilike.%G0.3%,code.eq.G.0.3_TALLER_D\'ESCULTURA_CERAMICA_METALL')
  
  console.log('Aules relacionades amb G.0.3:')
  data?.forEach(c => console.log(`- ${c.code}: ${c.name}`))
  
  // Buscar també P.0.11
  const { data: p011 } = await supabase
    .from('classrooms')
    .select('code, name')
    .or('code.ilike.%P.0.11%,code.eq.P.0.11')
  
  console.log('\nAules relacionades amb P.0.11:')
  p011?.forEach(c => console.log(`- ${c.code}: ${c.name}`))
}

checkG03Classroom()