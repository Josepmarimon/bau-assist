'use client'

import { CalendarRange } from 'lucide-react'
import { useAcademicYear } from '@/contexts/academic-year-context'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

interface AcademicYearSelectorProps {
  collapsed?: boolean
  className?: string
}

export function AcademicYearSelector({ collapsed = false, className }: AcademicYearSelectorProps) {
  const { currentYear, allYears, setCurrentYearById, loading } = useAcademicYear()

  if (collapsed) {
    return (
      <div className={cn('flex justify-center', className)} title={currentYear?.name ?? ''}>
        <CalendarRange className="h-5 w-5 text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <CalendarRange className="h-3.5 w-3.5" />
        Curs acadèmic
      </label>
      <Select
        value={currentYear?.id ?? ''}
        onValueChange={setCurrentYearById}
        disabled={loading || allYears.length === 0}
      >
        <SelectTrigger className="h-9 text-sm">
          <SelectValue placeholder={loading ? 'Carregant…' : 'Selecciona…'} />
        </SelectTrigger>
        <SelectContent>
          {allYears.map((year) => (
            <SelectItem key={year.id} value={year.id}>
              <span className="flex items-center gap-2">
                {year.name}
                {year.is_current && (
                  <span className="text-[10px] font-medium text-primary uppercase tracking-wide">
                    actual
                  </span>
                )}
              </span>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
