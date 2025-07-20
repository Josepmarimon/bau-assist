import { createClient } from '@/lib/supabase/server'
import { ClassroomGrid } from '@/components/public/classroom-grid'
import { Building2 } from 'lucide-react'

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
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Building2 className="h-12 w-12 text-primary" />
          </div>
          <h1 className="text-4xl font-bold mb-2">Directori d'Aules</h1>
          <p className="text-lg text-muted-foreground">
            Descobreix els nostres espais d'aprenentatge
          </p>
        </div>

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