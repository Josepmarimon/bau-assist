'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'
import { PublicReservationDialog } from '@/components/reservations/public-reservation-dialog'

interface ClassroomWeeklyScheduleProps {
  classroomId: string
  /** Si és cert, les franges lliures es poden clicar per demanar una reserva pública */
  reservable?: boolean
  classroomName?: string
  /** Callback en crear-se una reserva (p.ex. per refrescar llistes externes) */
  onReservationCreated?: () => void
}

type SlotType = 'class' | 'reservation'

interface Block {
  dayOfWeek: number // 1..5
  startHour: number
  endHour: number // exclusiu
  type: SlotType
}

// Files de la graella: una per hora, de 8:00 a 21:00.
const START_HOUR = 8
const END_HOUR = 21
const HOURS = Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i)
const DAYS = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']
const DAYS_SHORT = ['Dl', 'Dt', 'Dc', 'Dj', 'Dv']

const pad = (n: number) => n.toString().padStart(2, '0')
const toYMD = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const ddmm = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`

const MONTHS = ['gener', 'febrer', 'març', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre']
const VOWEL_MONTHS = new Set([3, 7, 9]) // abril, agost, octubre → "d'"
const dePrep = (m: number) => (VOWEL_MONTHS.has(m) ? "d'" : 'de ')

// "Setmana del 22 al 26 de setembre de 2025" (gestiona canvis de mes i d'any)
function humanWeekLabel(monday: Date): string {
  const fri = addDays(monday, 4)
  const d1 = monday.getDate(), d2 = fri.getDate()
  const m1 = monday.getMonth(), m2 = fri.getMonth()
  const y1 = monday.getFullYear(), y2 = fri.getFullYear()
  if (m1 === m2 && y1 === y2) {
    return `Setmana del ${d1} al ${d2} ${dePrep(m1)}${MONTHS[m1]} de ${y1}`
  }
  if (y1 === y2) {
    return `Setmana del ${d1} ${dePrep(m1)}${MONTHS[m1]} al ${d2} ${dePrep(m2)}${MONTHS[m2]} de ${y1}`
  }
  return `Setmana del ${d1} ${dePrep(m1)}${MONTHS[m1]} de ${y1} al ${d2} ${dePrep(m2)}${MONTHS[m2]} de ${y2}`
}

function relativeWeekLabel(weeksFromNow: number): string {
  if (weeksFromNow === 0) return 'Aquesta setmana'
  if (weeksFromNow === 1) return 'La setmana vinent'
  if (weeksFromNow === -1) return 'La setmana passada'
  if (weeksFromNow > 1) return `D'aquí ${weeksFromNow} setmanes`
  return `Fa ${Math.abs(weeksFromNow)} setmanes`
}

function mondayOf(date: Date): Date {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  const iso = (d.getDay() + 6) % 7 // Dl=0 … Dg=6
  d.setDate(d.getDate() - iso)
  return d
}
function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}
const minutes = (t: string) => {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + (m || 0)
}

export function ClassroomWeeklySchedule({ classroomId, reservable = false, classroomName, onReservationCreated }: ClassroomWeeklyScheduleProps) {
  const [monday, setMonday] = useState<Date>(() => mondayOf(new Date()))
  const [blocks, setBlocks] = useState<Block[]>([])
  const [loading, setLoading] = useState(true)
  const [reserveCell, setReserveCell] = useState<{ day: number; hour: number; date: string } | null>(null)
  const supabase = useMemo(() => createClient(), [])

  const todayYMD = useMemo(() => toYMD(new Date()), [])
  const todayMonday = useMemo(() => mondayOf(new Date()), [])
  const weekDates = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(monday, i)), [monday])

  // Swipe horitzontal per canviar de setmana (a part de les fletxes)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const suppressClick = useRef(false)
  const onTouchStart = (e: React.TouchEvent) => {
    suppressClick.current = false
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      suppressClick.current = true // evita que el swipe dispari un clic de reserva
      setMonday((prev) => addDays(prev, dx < 0 ? 7 : -7))
    }
  }

  useEffect(() => {
    let active = true
    const load = async () => {
      setLoading(true)
      const { data, error } = await supabase.rpc('classroom_week_occupancy', {
        p_classroom_id: classroomId,
        p_monday: toYMD(monday),
      })
      if (!active) return
      if (error) {
        console.error('Error loading week occupancy:', error)
        setBlocks([])
      } else {
        setBlocks(
          ((data as any[]) || []).map((r) => ({
            dayOfWeek: r.day_of_week,
            startHour: Math.floor(minutes(r.start_time) / 60),
            endHour: Math.ceil(minutes(r.end_time) / 60),
            type: r.kind as SlotType,
          }))
        )
      }
      setLoading(false)
    }
    load()
    return () => {
      active = false
    }
  }, [classroomId, monday, supabase])

  const occupancyAt = (day: number, hour: number): SlotType | null => {
    let result: SlotType | null = null
    for (const b of blocks) {
      if (b.dayOfWeek === day && hour >= b.startHour && hour < b.endHour) {
        if (b.type === 'class') return 'class'
        result = 'reservation'
      }
    }
    return result
  }

  const weeksFromNow = Math.round((monday.getTime() - todayMonday.getTime()) / (7 * 24 * 3600 * 1000))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Calendari de l&apos;aula
        </h2>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setMonday(addDays(monday, -7))} aria-label="Setmana anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setMonday(mondayOf(new Date()))}>
            Avui
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => setMonday(addDays(monday, 7))} aria-label="Setmana següent">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-baseline gap-x-2">
        <span className="text-sm font-semibold">{humanWeekLabel(monday)}</span>
        <span className="text-xs text-muted-foreground">· {relativeWeekLabel(weeksFromNow)}</span>
      </div>

      {/* Llegenda */}
      <div className="flex items-center gap-4 text-xs">
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-emerald-100 border border-emerald-300" />
          <span className="text-muted-foreground">Lliure</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-rose-400 border border-rose-500" />
          <span className="text-muted-foreground">Ocupat</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-amber-400 border border-amber-500" />
          <span className="text-muted-foreground">Reservat</span>
        </div>
      </div>

      {reservable && (
        <p className="text-xs text-muted-foreground">
          Pica una franja lliure (verda) per demanar una reserva en aquell dia i hora.
        </p>
      )}

      {/* Graella: 5 dies amb dates reals + columna d'hores */}
      <div className={`grid gap-px rounded-md overflow-hidden bg-border text-center transition-opacity touch-pan-y select-none ${loading ? 'opacity-50' : ''}`}
        style={{ gridTemplateColumns: '1.6rem repeat(5, 1fr)' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Capçalera amb dates */}
        <div className="bg-background" />
        {weekDates.map((d, i) => {
          const isToday = toYMD(d) === todayYMD
          return (
            <div key={i} className={`py-1 leading-tight ${isToday ? 'bg-primary/10' : 'bg-background'}`}>
              <div className="text-[11px] font-semibold text-muted-foreground">{DAYS_SHORT[i]}</div>
              <div className="text-[9px] text-muted-foreground/80">{ddmm(d)}</div>
            </div>
          )
        })}

        {/* Files per hora */}
        {HOURS.map((hour) => (
          <Fragment key={hour}>
            <div className="bg-background flex items-center justify-end pr-1 text-[9px] leading-none text-muted-foreground">
              {hour}
            </div>
            {weekDates.map((d, dayIndex) => {
              const occ = occupancyAt(dayIndex + 1, hour)
              const bg = occ === 'class' ? 'bg-rose-400' : occ === 'reservation' ? 'bg-amber-400' : 'bg-emerald-50'
              const label = occ === 'class' ? 'Ocupat' : occ === 'reservation' ? 'Reservat' : 'Lliure'
              const clickable = reservable && occ === null
              return (
                <div
                  key={dayIndex}
                  role={clickable ? 'button' : undefined}
                  tabIndex={clickable ? 0 : undefined}
                  onClick={clickable ? () => {
                    if (suppressClick.current) { suppressClick.current = false; return }
                    setReserveCell({ day: dayIndex + 1, hour, date: toYMD(d) })
                  } : undefined}
                  className={`h-5 ${bg} ${clickable ? 'cursor-pointer hover:bg-emerald-200 hover:ring-1 hover:ring-emerald-500' : ''}`}
                  title={clickable
                    ? `${DAYS[dayIndex]} ${ddmm(d)} ${hour}:00 — Lliure (clica per reservar)`
                    : `${DAYS[dayIndex]} ${ddmm(d)} ${hour}:00 — ${label}`}
                />
              )
            })}
          </Fragment>
        ))}
      </div>

      {reservable && (
        <PublicReservationDialog
          classroomId={classroomId}
          classroomName={classroomName}
          defaultDate={reserveCell?.date ?? null}
          defaultHour={reserveCell?.hour ?? null}
          open={!!reserveCell}
          onOpenChange={(o) => !o && setReserveCell(null)}
          onSuccess={onReservationCreated}
        />
      )}
    </div>
  )
}
