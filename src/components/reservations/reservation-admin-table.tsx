'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { Check, X } from 'lucide-react'
import { approveReservation, rejectReservation } from '@/lib/reservations/actions'
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

// Quan/com es mostra una reserva: per data concreta (pública) o per franja+setmanes
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
  { key: 'all', label: 'Totes' },
]

export function ReservationAdminTable({ reservations }: { reservations: AdminReservation[] }) {
  const router = useRouter()
  const [filter, setFilter] = useState<ReservationStatus | 'all'>('pending')
  const [pending, startTransition] = useTransition()
  const [rejectTarget, setRejectTarget] = useState<AdminReservation | null>(null)
  const [rejectNote, setRejectNote] = useState('')

  const visible = reservations.filter(r => filter === 'all' || r.status === filter)

  const approve = (id: string) => {
    startTransition(async () => {
      const res = await approveReservation(id)
      if (res.ok) { toast.success('Reserva aprovada.'); router.refresh() }
      else toast.error(res.error)
    })
  }

  const confirmReject = () => {
    if (!rejectTarget) return
    const id = rejectTarget.id
    const note = rejectNote
    startTransition(async () => {
      const res = await rejectReservation(id, note)
      if (res.ok) {
        toast.success('Reserva refusada.')
        setRejectTarget(null)
        setRejectNote('')
        router.refresh()
      } else {
        toast.error(res.error)
      }
    })
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
            <div key={r.id} className="border rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold truncate">{r.title}</span>
                  <Badge className={statusColor(r.status)}>{STATUS_LABELS[r.status]}</Badge>
                </div>
                <div className="text-sm text-muted-foreground flex items-center gap-3 flex-wrap">
                  {r.classroom && <span>{r.classroom.name} ({r.classroom.code}){r.classroom.building ? ` · ${r.classroom.building}` : ''}</span>}
                  <span>{whenLabel(r)}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {[r.requester_name, r.requester_email].filter(Boolean).join(' · ') || '—'}
                </div>
                {r.status === 'rejected' && r.review_note && (
                  <p className="text-sm text-rose-700">Motiu: {r.review_note}</p>
                )}
              </div>

              {r.status === 'pending' && (
                <div className="flex gap-2 shrink-0">
                  <Button size="sm" onClick={() => approve(r.id)} disabled={pending}>
                    <Check className="h-4 w-4 mr-1" /> Acceptar
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => { setRejectTarget(r); setRejectNote('') }} disabled={pending}>
                    <X className="h-4 w-4 mr-1" /> Refusar
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Diàleg de refús amb motiu */}
      <Dialog open={!!rejectTarget} onOpenChange={(o) => !o && setRejectTarget(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Refusar reserva</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="reject-note">Motiu (opcional, es mostrarà al sol·licitant)</Label>
            <Textarea id="reject-note" value={rejectNote} onChange={e => setRejectNote(e.target.value)} rows={3} />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setRejectTarget(null)}>Cancel·lar</Button>
            <Button variant="destructive" onClick={confirmReject} disabled={pending}>
              {pending ? 'Refusant…' : 'Refusar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
