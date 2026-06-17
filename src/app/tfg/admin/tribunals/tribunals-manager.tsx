'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ITINERARIS } from '@/lib/tfg/constants'
import { createTribunal, updateTribunal, deleteTribunal } from './actions'

type Tribunal = {
  id: string
  name: string
  itinerari: string | null
  display_order: number
  active: boolean
}

const NONE_ITINERARI = '__none__'

export function TribunalsManager({ initialTribunals }: { initialTribunals: Tribunal[] }) {
  const router = useRouter()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleCreate(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const r = await createTribunal(formData)
      if (r.ok) {
        setAdding(false)
        router.refresh()
      } else setError(r.error)
    })
  }

  function handleUpdate(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const r = await updateTribunal(formData)
      if (r.ok) {
        setEditingId(null)
        router.refresh()
      } else setError(r.error)
    })
  }

  function handleDelete(id: string) {
    if (!confirm('Segur que vols esborrar aquest tribunal?')) return
    startTransition(async () => {
      await deleteTribunal(id)
      router.refresh()
    })
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Tribunals</CardTitle>
          <CardDescription>
            Llista editable. Es mostren al desplegable del formulari segons l&apos;itinerari escollit.
          </CardDescription>
        </div>
        {!adding && (
          <Button onClick={() => setAdding(true)} disabled={pending}>
            <Plus className="h-4 w-4 mr-1" /> Nou tribunal
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-3 p-2 rounded bg-destructive/10 text-destructive text-sm">{error}</div>
        )}

        {adding && (
          <form
            action={handleCreate}
            className="border rounded-lg p-4 mb-4 space-y-3 bg-slate-50/50"
          >
            <h3 className="font-medium text-sm">Nou tribunal</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5 md:col-span-2">
                <Label>Nom *</Label>
                <Input name="name" required placeholder="Ex: G7. #Memòria #Arxiu I #Identitat" />
              </div>
              <div className="space-y-1.5">
                <Label>Itinerari</Label>
                <Select name="itinerari" defaultValue={NONE_ITINERARI}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_ITINERARI}>— Tots —</SelectItem>
                    {ITINERARIS.map((i) => (
                      <SelectItem key={i} value={i}>
                        {i}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Ordre</Label>
                <Input name="display_order" type="number" defaultValue={0} />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setAdding(false)} disabled={pending}>
                Cancel·lar
              </Button>
              <Button type="submit" disabled={pending}>
                Crear
              </Button>
            </div>
          </form>
        )}

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-muted-foreground border-b">
              <th className="py-2 pr-3 font-medium">Nom</th>
              <th className="py-2 pr-3 font-medium">Itinerari</th>
              <th className="py-2 pr-3 font-medium text-center">Ordre</th>
              <th className="py-2 pr-3 font-medium text-center">Actiu</th>
              <th className="py-2 pr-3 font-medium"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {initialTribunals.map((t) =>
              editingId === t.id ? (
                <tr key={t.id} className="bg-slate-50">
                  <td colSpan={5} className="p-3">
                    <form action={handleUpdate} className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
                      <input type="hidden" name="id" value={t.id} />
                      <div className="md:col-span-2 space-y-1">
                        <Label className="text-xs">Nom</Label>
                        <Input name="name" defaultValue={t.name} required />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Itinerari</Label>
                        <Select name="itinerari" defaultValue={t.itinerari ?? NONE_ITINERARI}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value={NONE_ITINERARI}>— Tots —</SelectItem>
                            {ITINERARIS.map((i) => (
                              <SelectItem key={i} value={i}>
                                {i}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Ordre</Label>
                        <Input name="display_order" type="number" defaultValue={t.display_order} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Actiu</Label>
                        <div className="h-10 flex items-center">
                          <input
                            type="checkbox"
                            name="active"
                            defaultChecked={t.active}
                            className="h-5 w-5"
                          />
                        </div>
                      </div>
                      <div className="md:col-span-5 flex justify-end gap-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setEditingId(null)}
                        >
                          <X className="h-4 w-4 mr-1" /> Cancel·lar
                        </Button>
                        <Button type="submit" size="sm" disabled={pending}>
                          <Check className="h-4 w-4 mr-1" /> Desar
                        </Button>
                      </div>
                    </form>
                  </td>
                </tr>
              ) : (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="py-2 pr-3 font-medium">{t.name}</td>
                  <td className="py-2 pr-3 text-muted-foreground">
                    {t.itinerari || <span className="italic">Tots</span>}
                  </td>
                  <td className="py-2 pr-3 text-center text-muted-foreground">{t.display_order}</td>
                  <td className="py-2 pr-3 text-center">
                    {t.active ? (
                      <Badge variant="success">Actiu</Badge>
                    ) : (
                      <Badge variant="secondary">Inactiu</Badge>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right">
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(t.id)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(t.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}
