'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog'
import { CalendarPlus } from 'lucide-react'
import { isValidBauEmail, requestPublicReservation } from '@/lib/reservations/public'

interface PublicReservationDialogProps {
  classroomId: string
  classroomName?: string
  /** Data exacta (YYYY-MM-DD) de la cel·la clicada. Té prioritat sobre defaultDayOfWeek. */
  defaultDate?: string | null
  /** Dia (1=Dl … 5=Dv) de la cel·la clicada (s'usa si no hi ha defaultDate) */
  defaultDayOfWeek?: number | null
  defaultHour: number | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

const pad = (n: number) => n.toString().padStart(2, '0')
const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`

// Propera data (>= avui) que cau en el dia de la setmana donat (1=Dl … 7=Dg)
function nextDateForWeekday(dow: number): string {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const todayDow = ((today.getDay() + 6) % 7) + 1 // JS: Dg=0 → iso Dl=1…Dg=7
  const diff = (dow - todayDow + 7) % 7
  const d = new Date(today)
  d.setDate(today.getDate() + diff)
  return toYMD(d)
}

export function PublicReservationDialog({
  classroomId, classroomName, defaultDate, defaultDayOfWeek, defaultHour, open, onOpenChange, onSuccess,
}: PublicReservationDialogProps) {
  const supabase = useMemo(() => createClient(), [])
  const todayYMD = useMemo(() => toYMD(new Date()), [])

  const [date, setDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [endTime, setEndTime] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [description, setDescription] = useState('')
  const [pending, startTransition] = useTransition()

  // Pre-omplir en obrir-se a partir de la cel·la clicada
  useEffect(() => {
    if (!open) return
    const hour = defaultHour ?? 9
    setDate(defaultDate || nextDateForWeekday(defaultDayOfWeek ?? 1))
    setStartTime(`${pad(hour)}:00`)
    setEndTime(`${pad(Math.min(hour + 1, 23))}:00`)
    setName('')
    setEmail('')
    setDescription('')
  }, [open, defaultDate, defaultDayOfWeek, defaultHour])

  const emailValid = email === '' || isValidBauEmail(email)
  const canSubmit =
    !!date && !!startTime && !!endTime && endTime > startTime &&
    name.trim() !== '' && isValidBauEmail(email) && description.trim() !== ''

  const submit = () => {
    startTransition(async () => {
      const res = await requestPublicReservation(supabase, {
        classroomId, date, startTime, endTime, name, email, description,
      })
      if (res.ok) {
        toast.success('Sol·licitud de reserva enviada. Quedarà pendent d\'aprovació.')
        onOpenChange(false)
        onSuccess?.()
      } else {
        toast.error(res.error)
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarPlus className="h-5 w-5" /> Reservar espai
          </DialogTitle>
          <DialogDescription>
            {classroomName ? `${classroomName} · ` : ''}Indica el dia, l&apos;hora i les teves dades.
            La reserva quedarà pendent d&apos;aprovació.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="pr-date">Dia</Label>
            <Input id="pr-date" type="date" min={todayYMD} value={date} onChange={e => setDate(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="pr-start">Hora inici</Label>
              <Input id="pr-start" type="time" value={startTime} onChange={e => setStartTime(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="pr-end">Hora fi</Label>
              <Input id="pr-end" type="time" value={endTime} onChange={e => setEndTime(e.target.value)} />
            </div>
          </div>
          {startTime && endTime && endTime <= startTime && (
            <p className="text-xs text-rose-600">L&apos;hora de fi ha de ser posterior a la d&apos;inici.</p>
          )}

          <div className="space-y-1">
            <Label htmlFor="pr-name">Nom i cognoms</Label>
            <Input id="pr-name" value={name} onChange={e => setName(e.target.value)} />
          </div>

          <div className="space-y-1">
            <Label htmlFor="pr-email">Correu BAU</Label>
            <Input
              id="pr-email"
              type="email"
              placeholder="nom@bau.cat o nom@student.bau.cat"
              value={email}
              onChange={e => setEmail(e.target.value)}
              aria-invalid={!emailValid}
            />
            {!emailValid && (
              <p className="text-xs text-rose-600">Ha de ser un correu @bau.cat o @student.bau.cat.</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="pr-desc">Descripció de l&apos;activitat</Label>
            <Textarea id="pr-desc" rows={2} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel·lar</Button>
          <Button onClick={submit} disabled={pending || !canSubmit}>
            {pending ? 'Enviant…' : 'Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
