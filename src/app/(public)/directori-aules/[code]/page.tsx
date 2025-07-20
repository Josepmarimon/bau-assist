import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClassroomDetail } from '@/components/public/classroom-detail'

export const revalidate = 60 // Revalidate every minute

interface PageProps {
  params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: PageProps) {
  const { code } = await params
  const supabase = await createClient()
  
  const { data: classroom } = await supabase
    .from('classrooms')
    .select('*')
    .eq('code', code)
    .eq('is_public', true)
    .single()

  if (!classroom) {
    return {
      title: 'Aula no trobada',
    }
  }

  return {
    title: `${classroom.name} - ${classroom.code}`,
    description: `Informació sobre l'aula ${classroom.name} (${classroom.code}) - Capacitat: ${classroom.capacity} persones`,
  }
}

export default async function ClassroomDetailPage({ params }: PageProps) {
  const { code } = await params
  const supabase = await createClient()
  
  const { data: classroom, error } = await supabase
    .from('classrooms')
    .select('*')
    .eq('code', code)
    .eq('is_public', true)
    .single()

  if (error || !classroom) {
    notFound()
  }

  // Fetch equipment details if available
  let equipmentDetails = []
  if (classroom.equipment && classroom.equipment.length > 0) {
    const { data: equipment } = await supabase
      .from('equipment_inventory')
      .select(`
        *,
        equipment_types (
          name,
          category,
          description
        )
      `)
      .eq('classroom_id', classroom.id)
      .eq('status', 'operational')
    
    if (equipment) {
      equipmentDetails = equipment
    }
  }

  return <ClassroomDetail classroom={classroom} equipment={equipmentDetails} />
}