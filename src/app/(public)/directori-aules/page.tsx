import { createClient } from '@/lib/supabase/server'
import { ClassroomGrid } from '@/components/public/classroom-grid'
import { Building2 } from 'lucide-react'
import Image from 'next/image'

export const revalidate = 60 // Revalidate every minute

export default async function PublicClassroomsPage() {
  const supabase = await createClient()
  
  const { data: classrooms, error } = await supabase
    .from('classrooms')
    .select(`
      *,
      equipment_inventory (
        equipment_types (
          name,
          category
        )
      )
    `)
    .eq('is_public', true)
    .order('code')

  if (error) {
    console.error('Error fetching public classrooms:', error)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Error carregant les aules</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="relative h-[400px] mb-12">
        <Image
          src="/imatges/imatge_bau.jpeg"
          alt="BAU - Centre Universitari d'Arts i Disseny"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative h-full flex flex-col items-center justify-center text-white">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Espais de BAU</h1>
          <p className="text-xl">
            Descobreix els nostres espais d'aprenentatge
          </p>
        </div>
      </div>

      {/* Content Section */}
      <div className="container mx-auto px-4 pb-12">

        {classrooms && classrooms.length > 0 ? (
          <ClassroomGrid classrooms={classrooms} />
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No hi ha aules públiques disponibles en aquest moment
            </p>
          </div>
        )}
      </div>
    </div>
  )
}