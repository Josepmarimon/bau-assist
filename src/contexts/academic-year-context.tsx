'use client'

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react'
import { createClient } from '@/lib/supabase/client'

export interface AcademicYear {
  id: string
  name: string
  start_date: string
  end_date: string
  is_current: boolean
}

interface AcademicYearContextValue {
  currentYear: AcademicYear | null
  allYears: AcademicYear[]
  setCurrentYearById: (id: string) => void
  loading: boolean
  refresh: () => Promise<void>
}

const STORAGE_KEY = 'bau-assist:academic-year-id'

const AcademicYearContext = createContext<AcademicYearContextValue | null>(null)

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const [allYears, setAllYears] = useState<AcademicYear[]>([])
  const [currentYear, setCurrentYear] = useState<AcademicYear | null>(null)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('academic_years')
      .select('id, name, start_date, end_date, is_current')
      .order('start_date', { ascending: true })

    if (error || !data) {
      setLoading(false)
      return
    }

    setAllYears(data as AcademicYear[])

    const storedId = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY) : null
    const stored = storedId ? data.find(y => y.id === storedId) : null
    const fallback = data.find(y => y.is_current) ?? data[data.length - 1] ?? null
    setCurrentYear((stored as AcademicYear) ?? (fallback as AcademicYear) ?? null)
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const setCurrentYearById = useCallback((id: string) => {
    const year = allYears.find(y => y.id === id)
    if (!year) return
    setCurrentYear(year)
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, id)
    }
  }, [allYears])

  return (
    <AcademicYearContext.Provider
      value={{ currentYear, allYears, setCurrentYearById, loading, refresh: load }}
    >
      {children}
    </AcademicYearContext.Provider>
  )
}

export function useAcademicYear() {
  const ctx = useContext(AcademicYearContext)
  if (!ctx) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider')
  }
  return ctx
}
