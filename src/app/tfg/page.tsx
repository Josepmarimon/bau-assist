import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import { GraduationCap, Plus, LogOut, FileText, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { signOut } from './actions'
import { createDraft } from '@/lib/tfg/actions'
import { isTfgAdmin } from '@/lib/tfg/auth'

export default async function TfgDashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/tfg/login')
  }

  const { data: submissions } = await supabase
    .from('tfg_submissions')
    .select('id, titol, status, updated_at, submitted_at')
    .order('updated_at', { ascending: false })

  const isAdmin = await isTfgAdmin(supabase)

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Image src="/imatges/BAU-black-CAT.svg" alt="BAU" width={100} height={32} />
          <span className="text-muted-foreground">·</span>
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Lliurament de TFG
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground hidden sm:inline">{user.email}</span>
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm">
              <LogOut className="h-4 w-4 mr-1" />
              Sortir
            </Button>
          </form>
        </div>
      </header>

      {isAdmin && (
        <Card className="mb-6 border-amber-300/60 bg-amber-50/50">
          <CardContent className="flex items-center justify-between gap-4 py-4">
            <div className="flex items-center gap-2 text-sm">
              <ShieldCheck className="h-4 w-4 text-amber-700" />
              <span>Accés d&apos;administració disponible.</span>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link href="/tfg/admin">Backoffice</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle>Els teus TFGs</CardTitle>
            <CardDescription>
              Pots tenir un esborrany obert i editar-lo fins a enviar-lo definitivament.
            </CardDescription>
          </div>
          <form action={createDraft}>
            <Button type="submit">
              <Plus className="h-4 w-4 mr-1" />
              Nou TFG
            </Button>
          </form>
        </CardHeader>
        <CardContent>
          {!submissions || submissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>Encara no tens cap TFG. Comença creant-ne un.</p>
            </div>
          ) : (
            <ul className="divide-y">
              {submissions.map((s) => (
                <li key={s.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/tfg/${s.id}/edit`}
                      className="font-medium hover:underline truncate block"
                    >
                      {s.titol || <span className="text-muted-foreground italic">Sense títol</span>}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      Actualitzat {new Date(s.updated_at).toLocaleString('ca-ES')}
                    </p>
                  </div>
                  <Badge variant={s.status === 'submitted' ? 'default' : 'secondary'}>
                    {s.status === 'draft' ? 'Esborrany' : s.status === 'submitted' ? 'Enviat' : 'Revisat'}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
