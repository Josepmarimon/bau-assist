'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Upload, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { importAllowedEmails, deleteAllowedEmail } from './actions'

type Email = {
  id: string
  email: string
  full_name: string | null
  itinerari: string | null
  tutor: string | null
  notes: string | null
}

export function AccessManager({ emails }: { emails: Email[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<{ inserted: number; skipped: string[] } | null>(null)
  const [rows, setRows] = useState('')

  function handleImport() {
    setError(null)
    setSuccess(null)
    const formData = new FormData()
    formData.set('rows', rows)
    startTransition(async () => {
      const r = await importAllowedEmails(formData)
      if (r.ok) {
        setSuccess({ inserted: r.inserted, skipped: r.skipped })
        setRows('')
        router.refresh()
      } else {
        setError(r.error)
      }
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Esborrar aquest email de la llista?')) return
    startTransition(async () => {
      await deleteAllowedEmail(id)
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Importar emails autoritzats</CardTitle>
          <CardDescription>
            Enganxa una llista d&apos;emails (un per línia) o un CSV amb format:
            <code className="ml-1 px-1 py-0.5 rounded bg-slate-100 text-xs">
              email,nom_complet,itinerari,tutor,notes
            </code>
            . Els camps després de l&apos;email són opcionals. Si un email ja existeix
            s&apos;actualitza.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label>Emails / CSV</Label>
            <Textarea
              rows={8}
              value={rows}
              onChange={(e) => setRows(e.target.value)}
              placeholder={`marina.lopez@bau.cat,Marina López,Disseny Gràfic,Anna Roig
joan.puig@bau.cat,Joan Puig,Disseny Audiovisual
...`}
              className="font-mono text-xs"
            />
          </div>

          {error && (
            <div className="p-2 rounded bg-destructive/10 text-destructive text-sm">{error}</div>
          )}
          {success && (
            <div className="p-2 rounded bg-emerald-50 border border-emerald-200 text-emerald-900 text-sm flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <p>
                  <strong>{success.inserted}</strong> email(s) afegits o actualitzats.
                </p>
                {success.skipped.length > 0 && (
                  <p className="text-xs mt-1 text-emerald-800">
                    {success.skipped.length} línia(es) ignorada(es):{' '}
                    {success.skipped.slice(0, 3).join('; ')}
                    {success.skipped.length > 3 ? '...' : ''}
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={handleImport} disabled={pending || !rows.trim()}>
              <Upload className="h-4 w-4 mr-1" /> Importar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Emails autoritzats ({emails.length})</CardTitle>
          <CardDescription>
            Només aquests correus poden demanar el magic link i lliurar un TFG.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {emails.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Encara no hi ha cap email autoritzat. Importa&apos;n abans d&apos;enviar els enllaços.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b">
                    <th className="py-2 pr-3 font-medium">Email</th>
                    <th className="py-2 pr-3 font-medium">Nom</th>
                    <th className="py-2 pr-3 font-medium">Itinerari</th>
                    <th className="py-2 pr-3 font-medium">Tutor</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {emails.map((e) => (
                    <tr key={e.id} className="hover:bg-slate-50">
                      <td className="py-2 pr-3 font-mono text-xs">{e.email}</td>
                      <td className="py-2 pr-3">{e.full_name || '—'}</td>
                      <td className="py-2 pr-3 text-xs">{e.itinerari || '—'}</td>
                      <td className="py-2 pr-3 text-xs">{e.tutor || '—'}</td>
                      <td className="py-2 pr-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(e.id)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
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
