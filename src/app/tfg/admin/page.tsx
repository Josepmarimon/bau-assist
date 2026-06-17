import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { FileText } from 'lucide-react'

type SearchParams = Promise<{ status?: string; itinerari?: string }>

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams: SearchParams
}) {
  const { status = 'all', itinerari = 'all' } = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from('tfg_submissions')
    .select(
      'id, status, titol, autor, autora, correu_electrponic, itinerari_matriculat, tribunal_assignat, submitted_at, updated_at'
    )
    .order('submitted_at', { ascending: false, nullsFirst: false })

  if (status !== 'all') query = query.eq('status', status)
  if (itinerari !== 'all') query = query.eq('itinerari_matriculat', itinerari)

  const { data: submissions } = await query

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle>Lliuraments de TFG</CardTitle>
          <CardDescription>
            {submissions?.length ?? 0} lliurament(s). Filtra per estat o itinerari amb els enllaços de sota.
          </CardDescription>
          <div className="flex flex-wrap gap-2 mt-3">
            <FilterChip label="Tots" active={status === 'all'} href={hrefWith({ status: 'all' })} />
            <FilterChip
              label="Esborranys"
              active={status === 'draft'}
              href={hrefWith({ status: 'draft' })}
            />
            <FilterChip
              label="Enviats"
              active={status === 'submitted'}
              href={hrefWith({ status: 'submitted' })}
            />
            <FilterChip
              label="Revisats"
              active={status === 'reviewed'}
              href={hrefWith({ status: 'reviewed' })}
            />
          </div>
        </CardHeader>
        <CardContent>
          {!submissions || submissions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>No hi ha cap lliurament que coincideixi amb els filtres.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-3 font-medium">Títol</th>
                    <th className="py-2 pr-3 font-medium">Autor/a</th>
                    <th className="py-2 pr-3 font-medium">Itinerari</th>
                    <th className="py-2 pr-3 font-medium">Tribunal</th>
                    <th className="py-2 pr-3 font-medium">Estat</th>
                    <th className="py-2 pr-3 font-medium">Data</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {submissions.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50">
                      <td className="py-2 pr-3">
                        <Link
                          href={`/tfg/${s.id}/edit`}
                          className="font-medium hover:underline"
                        >
                          {s.titol || <span className="text-muted-foreground italic">Sense títol</span>}
                        </Link>
                      </td>
                      <td className="py-2 pr-3">
                        <div>{s.autor || '—'}</div>
                        {s.autora && <div className="text-xs text-muted-foreground">{s.autora}</div>}
                        <div className="text-xs text-muted-foreground">{s.correu_electrponic}</div>
                      </td>
                      <td className="py-2 pr-3">{s.itinerari_matriculat || '—'}</td>
                      <td className="py-2 pr-3 text-xs">{s.tribunal_assignat || '—'}</td>
                      <td className="py-2 pr-3">
                        <Badge variant={s.status === 'submitted' ? 'default' : 'secondary'}>
                          {s.status === 'draft' ? 'Esborrany' : s.status === 'submitted' ? 'Enviat' : 'Revisat'}
                        </Badge>
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {new Date(s.submitted_at ?? s.updated_at).toLocaleDateString('ca-ES')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

function hrefWith(params: { status?: string; itinerari?: string }): string {
  const sp = new URLSearchParams()
  if (params.status && params.status !== 'all') sp.set('status', params.status)
  if (params.itinerari && params.itinerari !== 'all') sp.set('itinerari', params.itinerari)
  const qs = sp.toString()
  return `/tfg/admin${qs ? `?${qs}` : ''}`
}

function FilterChip({
  label,
  active,
  href,
}: {
  label: string
  active: boolean
  href: string
}) {
  return (
    <Link
      href={href}
      className={`px-3 py-1 text-xs rounded-full border transition-colors ${
        active ? 'bg-foreground text-background' : 'bg-background hover:bg-slate-50'
      }`}
    >
      {label}
    </Link>
  )
}
