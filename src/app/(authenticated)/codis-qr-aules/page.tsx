import { createClient } from '@/lib/supabase/server'
import { QRCodeSheet } from '@/components/classrooms/qr-code-sheet'

export const metadata = {
  title: 'Codis QR de les aules',
}

export default async function CodisQRAulesPage() {
  const supabase = await createClient()

  const { data: classrooms, error } = await supabase
    .from('classrooms')
    .select('id, code, name, type, building, floor')
    .order('building', { ascending: true })
    .order('floor', { ascending: true })
    .order('code', { ascending: true })

  if (error) {
    console.error('Error fetching classrooms:', error)
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Error carregant les aules</p>
      </div>
    )
  }

  if (!classrooms || classrooms.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No hi ha aules disponibles</p>
      </div>
    )
  }

  return <QRCodeSheet classrooms={classrooms} />
}
