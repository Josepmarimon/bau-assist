'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { Check, X, Ban, Mail, User, MapPin, Clock } from 'lucide-react'
import { approveReservation, rejectReservation, adminCancelReservation } from '@/lib/reservations/actions'
import { STATUS_LABELS, type ReservationStatus } from '@/lib/reservations/types'

const DAY_NAMES = ['', 'Dl', 'Dt', 'Dc', 'Dj', 'Dv']
const fmt = (t: string) => t.slice(0, 5)

const statusColor = (s: ReservationStatus) => ({
  pending: 'bg-amber-100 text-amber-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
  cancelled: 'bg-gray-100 text-gray-600',
}[s])

export interface AdminReservation {
  id: string
  title: string
  description: string | null
  status: ReservationStatus
  requester_email: string | null
  requester_name: string | null
  reservation_date: string | null
  start_time: string | null
  end_time: string | null
  review_note: string | null
  classroom: { code: string; name: string; building: string | null } | null
  time_slot: { day_of_week: number; start_time: string; end_time: string } | null
  space_reservation_weeks: { week_number: number }[]
}

function whenLabel(r: AdminReservation): string {
  if (r.reservation_date) {
    const start = r.start_time ? fmt(r.start_time) : ''
    const end = r.end_time ? fmt(r.end_time) : ''
    return `${r.reservation_date} · ${start}–${end}`
  }
  if (r.time_slot) {
    const weeks = r.space_reservation_weeks.map(w => w.week_number).sort((a, b) => a - b).join(', ')
    return `${DAY_NAMES[r.time_slot.day_of_week]} ${fmt(r.time_slot.start_time)}–${fmt(r.time_slot.end_time)} · Setm. ${weeks}`
  }
  return '—'
}

const FILTERS: { key: ReservationStatus | 'all'; label: string }[] = [
  { key: 'pending', label: 'Pendents' },
  { key: 'approved', label: 'Aprovades' },
  { key: 'rejected', label: 'Refusades' },
  { key: 'cancelled', label: 'Anul·lades' },
  { key: 'all', label: 'Totes' },
]

export function ReservationAdminTable({
  reservations,
  onChanged,
}: {
  reservations: AdminReservation[]
  onChanged?: () => void
}) {
  const router = useRouter()
  const [filter, setFilter] = useState<ReservationStatus | 'all'>('pending')
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<AdminReservation | null>(null)
  const [reason, setReason] = useState('')

  const visible = reservations.filter(r => filter === 'all' || r.status === filter)

  const refresh = () => {
    if (onChanged) onChanged()
    else router.refresh()
  }

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>, okMsg: string) => {
    startTransition(async () => {
      const res = await fn()
      if (res.ok) {
        toast.success(okMsg)
        setSelected(null)
        setReason('')
        refresh()
      } else {
        toast.error(res.error || 'Error')
      }
    })
  }

  const openDetail = (r: AdminReservation) => {
    setSelected(r)
    setReason('')
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(f => {
          const count = f.key === 'all' ? reservations.length : reservations.filter(r => r.status === f.key).length
          return (
            <Button
              key={f.key}
              variant={filter === f.key ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(f.key)}
            >
              {f.label} <span className="ml-1.5 opacity-70">{count}</span>
            </Button>
          )
        })}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No hi ha reserves en aquest estat.</p>
      ) : (
        <div className="space-y-2">
          {visible.map(r => (
            <button
              key={r.id}
              onClick={() => openDetail(r)}
              className="w-full text-left border rounded-lg p-4 hover:bg-accent/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold truncate">{r.title}</span>
                    <Badge className={statusColor(r.status)}>{STATUS_LABELS[r.status]}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                    {r.classroom && <span>{r.classroom.name} ({r.classroom.code})</span>}
                    <span>{whenLabel(r)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {[r.requester_name, r.requester_email].filter(Boolean).join(' · ') || 'Sense identificar'}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Detall + accions */}
      <Dialog open={!!selected} onOpenChange={(o) => { if (!o) { setSelected(null); setReason('') } }}>
        <DialogContent className="max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selected.title}
                  <Badge className={statusColor(selected.status)}>{STATUS_LABELS[selected.status]}</Badge>
                </DialogTitle>
                <DialogDescription>Detalls de la reserva</DialogDescription>
              </DialogHeader>

              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div>
                    <div className="font-medium">{selected.requester_name || 'Sense nom'}</div>
                    {selected.requester_email && (
                      <a href={`mailto:${selected.requester_email}`} className="text-muted-foreground underline flex items-center gap-1">
                        <Mail className="h-3 w-3" />{selected.requester_email}
                      </a>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{selected.classroom ? `${selected.classroom.name} (${selected.classroom.code})${selected.classroom.building ? ` · ${selected.classroom.building}` : ''}` : '—'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>{whenLabel(selected)}</span>
                </div>
                {selected.description && (
                  <p className="text-muted-foreground whitespace-pre-wrap border-l-2 pl-3">{selected.description}</p>
                )}
                {selected.review_note && (
                  <p className="text-rose-700">Motiu registrat: {selected.review_note}</p>
                )}
              </div>

              {/* Motiu (per refusar o anul·lar) */}
              {(selected.status === 'pending' || selected.status === 'approved') && (
                <div className="space-y-1">
                  <Label htmlFor="admin-reason">Motiu (per refusar o anul·lar)</Label>
                  <Textarea id="admin-reason" rows={2} value={reason} onChange={e => setReason(e.target.value)} placeholder="S'afegirà a la reserva com a motiu." />
                </div>
              )}

              <DialogFooter className="flex-wrap gap-2">
                {selected.requester_email && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      const subject = `Reserva a ${selected.classroom?.name ?? 'aula'} (${whenLabel(selected)})`
                      const body = `Hola${selected.requester_name ? ' ' + selected.requester_name : ''},\n\n`
                        + `En relació amb la teva reserva de ${selected.classroom?.name ?? 'aula'} (${whenLabel(selected)}):\n\n`
                        + `${reason || '[escriu aquí el motiu]'}\n\nSalutacions,\nBAU`
                      window.location.href = `mailto:${selected.requester_email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
                    }}
                    disabled={pending}
                  >
                    <Mail className="h-4 w-4 mr-1" /> Escriure correu
                  </Button>
                )}
                {selected.status === 'pending' && (
                  <>
                    <Button onClick={() => run(() => approveReservation(selected.id), 'Reserva aprovada.')} disabled={pending}>
                      <Check className="h-4 w-4 mr-1" /> Acceptar
                    </Button>
                    <Button variant="outline" onClick={() => run(() => rejectReservation(selected.id, reason), 'Reserva refusada.')} disabled={pending}>
                      <X className="h-4 w-4 mr-1" /> Refusar
                    </Button>
                  </>
                )}
                {(selected.status === 'pending' || selected.status === 'approved') && (
                  <Button variant="destructive" onClick={() => run(() => adminCancelReservation(selected.id, reason), 'Reserva anul·lada.')} disabled={pending}>
                    <Ban className="h-4 w-4 mr-1" /> Anul·lar
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
