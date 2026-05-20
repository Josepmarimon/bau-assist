'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Monitor, Building2, Info, Search, MapPin, X, Download, CheckCircle2, AlertTriangle, BookOpen, ChevronRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { WeeklyScheduleMini } from '@/components/classrooms/weekly-schedule-mini'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import * as XLSX from 'xlsx'

interface Software {
  id: string
  name: string
  version?: string
  category: string
  license_type: string
  required_by_subjects?: string
  is_installed: boolean
  is_required_by_subjects: boolean
}

interface ClassroomSubject {
  code: string
  name: string
}

interface SubjectNote {
  subject_id: string
  subject_code: string
  subject_name: string
  category: string
  content: string
}

const NOTE_CATEGORY_LABEL: Record<string, string> = {
  tecnologia_av_prestec: 'Tecnologia AV de préstec',
  altres: 'Altres',
  activitats_taller: 'Activitats al taller',
  materials_professor: 'Materials del professor',
  materials_estudiants: 'Materials per a l\'estudiant',
  altres_consideracions: 'Altres consideracions',
  anotacions: 'Anotacions',
  altre_software: 'Altre software no llistat',
  materies_necessaries: 'Matèries necessàries',
}

interface ClassroomRequirement {
  classroom_id: string
  classroom_code: string
  classroom_name: string
  building: string
  software_id: string
  software_name: string
  software_version?: string
  license_type: string
  category: string
  is_installed: boolean
  is_required: boolean
  required_by_subjects?: string
}

interface ClassroomProgram {
  code: string
  name: string
  type: string
  software: string[]
}

interface ClassroomWithSoftware {
  id: string
  code: string
  name: string
  building: string
  paid: Software[]
  educational: Software[]
  free: Software[]
  open_source: Software[]
  subjects: ClassroomSubject[]
  programs: ClassroomProgram[]
  notes: SubjectNote[]
}

const getLicenseTypeName = (type: string): string => {
  const types: Record<string, string> = {
    'paid': 'Pagament',
    'educational': 'Educatiu',
    'free': 'Gratuït',
    'open_source': 'Codi obert'
  }
  return types[type] || type
}

const getLicenseTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    'paid': 'bg-red-100 text-red-700',
    'educational': 'bg-blue-100 text-blue-700',
    'free': 'bg-green-100 text-green-700',
    'open_source': 'bg-purple-100 text-purple-700'
  }
  return colors[type] || 'bg-gray-100 text-gray-700'
}

// Programes que no es mostren al llistat (irrelevants per a la planificació docent).
const HIDDEN_SOFTWARE = new Set<string>([
  'Teams',
])

// Ordre canònic per a que totes les aules mostrin els mateixos programes
// a la mateixa posició. Software no llistat aquí cau al final, alfabètic.
const SOFTWARE_PRIORITY: string[] = [
  'Suite Adobe completa',
  'Figma',
  'Autocad',
  'Rhino',
  '3D MAX',
  'VRAY',
  '5D Render',
  'Corona Render',
  'Lumion',
  'Cinema 4D',
  'Blender',
  'Unreal',
  'Touch Designer',
  'Processing',
  'Arduino',
  'Sublime Text',
  'Filezilla',
  'Glyphs',
  'Clo 3D',
  'Gerber',
  'Resolume free',
  'Resolume Full',
  'Davinci Resolve',
  'Audacity',
  'Cura3D',
  'Freecad',
  'Spout',
  'Inkscape',
  'Gimp',
  'Hand brake',
  'Shotcut',
  'VLC',
  'MediaInfo',
  'LibreOffice',
  'Enscape',
  'AnyDesk',
  'RustDesk',
]
const PRIORITY_INDEX = new Map(SOFTWARE_PRIORITY.map((n, i) => [n, i]))

const sortSoftware = (list: Software[]): Software[] => {
  return [...list].sort((a, b) => {
    const ia = PRIORITY_INDEX.has(a.name) ? PRIORITY_INDEX.get(a.name)! : Number.POSITIVE_INFINITY
    const ib = PRIORITY_INDEX.has(b.name) ? PRIORITY_INDEX.get(b.name)! : Number.POSITIVE_INFINITY
    if (ia !== ib) return ia - ib
    return a.name.localeCompare(b.name)
  })
}

export default function SoftwareListPage() {
  const [classroomsWithSoftware, setClassroomsWithSoftware] = useState<ClassroomWithSoftware[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [allSoftware, setAllSoftware] = useState<Software[]>([])
  const [filteredSoftware, setFilteredSoftware] = useState<Software[]>([])
  const [selectedSoftware, setSelectedSoftware] = useState<Software | null>(null)
  const [classroomsForSelected, setClassroomsForSelected] = useState<ClassroomRequirement[]>([])
  const [loadingClassrooms, setLoadingClassrooms] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [currentYearName, setCurrentYearName] = useState<string>('')
  const [availableYears, setAvailableYears] = useState<string[]>([])
  const [softwareSubjectsMap, setSoftwareSubjectsMap] = useState<Map<string, ClassroomSubject[]>>(new Map())
  const supabase = createClient()

  useEffect(() => {
    const init = async () => {
      const { data: years } = await supabase
        .from('academic_years')
        .select('name, is_current, start_date')
        .order('start_date', { ascending: true })
      const sortedYears = years || []
      const list = sortedYears.map(y => y.name)
      setAvailableYears(list)

      // Default: el curs vinent (el següent al `is_current`). Si no n'hi ha,
      // fallback al current; si tampoc, agafem l'últim.
      const currentIdx = sortedYears.findIndex(y => y.is_current)
      const next = currentIdx >= 0 && currentIdx + 1 < sortedYears.length
        ? sortedYears[currentIdx + 1]
        : sortedYears[currentIdx] ?? sortedYears[sortedYears.length - 1]
      const yearName = next?.name ?? ''
      setCurrentYearName(yearName)
      await loadAllSoftware()
      if (yearName) await loadClassroomRequirements(yearName)
    }
    init()
  }, [])

  useEffect(() => {
    if (currentYearName) loadClassroomRequirements(currentYearName)
  }, [currentYearName])

  useEffect(() => {
    if (searchTerm) {
      const filtered = allSoftware.filter(software =>
        software.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredSoftware(filtered)
    } else {
      setFilteredSoftware([])
    }
  }, [searchTerm, allSoftware])

  const loadAllSoftware = async () => {
    try {
      const { data, error } = await supabase
        .from('software')
        .select('*')
        .order('name')

      if (error) throw error
      setAllSoftware(data || [])
    } catch (error) {
      console.error('Error loading software:', error)
    }
  }

  const loadClassroomRequirements = async (yearName: string) => {
    try {
      setLoading(true)
      setError(null)

      // Load classroom software requirements:
      //  · permanently-installed software (academic_year IS NULL) — always shown
      //  · software needed by subjects at the current academic year
      let query = supabase
        .from('classroom_software_requirements')
        .select('*')
      if (yearName) {
        query = query.or(`academic_year.eq.${yearName},academic_year.is.null`)
      } else {
        query = query.is('academic_year', null)
      }
      const { data: requirementsData, error: requirementsError } = await query
        .order('classroom_code')
        .order('software_name')

      if (requirementsError) {
        console.error('Error loading requirements:', requirementsError)
        setError('Error carregant els requeriments de software')
        return
      }

      // Dedupe: un mateix (classroom, software) pot aparèixer dues vegades
      // (academic_year=NULL i academic_year=current). Combinem les dues files
      // perquè el software pugui ser alhora `is_installed` (de classroom_software)
      // i `required_by_subjects` (de subject_software al curs).
      const dedupKey = (r: any) => `${r.classroom_id}|||${r.software_id}`
      const dedupMap = new Map<string, any>()
      requirementsData?.forEach(req => {
        const key = dedupKey(req)
        const existing = dedupMap.get(key)
        if (!existing) {
          dedupMap.set(key, { ...req })
          return
        }
        // Combinar: prioritzem is_installed=true i required_by_subjects no buit
        existing.is_installed = existing.is_installed || req.is_installed
        if (!existing.required_by_subjects && req.required_by_subjects) {
          existing.required_by_subjects = req.required_by_subjects
        }
        existing.requiring_subject_count = Math.max(
          existing.requiring_subject_count || 0,
          req.requiring_subject_count || 0
        )
      })

      // Group by classroom and collect unique software
      const classroomMap = new Map<string, ClassroomWithSoftware>()

      Array.from(dedupMap.values()).forEach(req => {
        if (!classroomMap.has(req.classroom_id)) {
          classroomMap.set(req.classroom_id, {
            id: req.classroom_id,
            code: req.classroom_code,
            name: req.classroom_name,
            building: req.building,
            paid: [],
            educational: [],
            free: [],
            open_source: [],
            subjects: [],
            programs: [],
            notes: []
          })
        }

        const classroom = classroomMap.get(req.classroom_id)!
        const software: Software = {
          id: req.software_id,
          name: req.software_name,
          version: req.software_version,
          category: req.category || 'general',
          license_type: req.license_type,
          required_by_subjects: req.required_by_subjects,
          is_installed: !!req.is_installed,
          is_required_by_subjects: (req.requiring_subject_count || 0) > 0
        }

        // Categorize software
        if (req.license_type === 'paid') {
          classroom.paid.push(software)
        } else if (req.license_type === 'educational') {
          classroom.educational.push(software)
        } else if (req.license_type === 'free') {
          classroom.free.push(software)
        } else if (req.license_type === 'open_source') {
          classroom.open_source.push(software)
        }
      })

      // Carrega les assignatures que demanen cada software al curs seleccionat
      // (no filtrant per aula). Serveix per mostrar al desplegable de cada software
      // qui el necessita, encara que aquella aula no l'utilitzi com a requerit.
      const swSubjMap = new Map<string, ClassroomSubject[]>()
      if (yearName) {
        const { data: ssList } = await supabase
          .from('subject_software')
          .select('software_id, subjects:subjects(code, name)')
          .eq('academic_year', yearName)
          .eq('is_required', true)
        for (const r of (ssList || []) as any[]) {
          if (!r.subjects) continue
          const arr = swSubjMap.get(r.software_id) || []
          if (!arr.some(x => x.code === r.subjects.code)) {
            arr.push({ code: r.subjects.code, name: r.subjects.name })
          }
          swSubjMap.set(r.software_id, arr)
        }
        // També afegim els masters/postgraus que demanen cada software al curs
        const { data: psList } = await supabase
          .from('program_software')
          .select('software_id, programs:programs(code, name)')
          .or(`academic_year.eq.${yearName},academic_year.is.null`)
        for (const r of (psList || []) as any[]) {
          if (!r.programs) continue
          const arr = swSubjMap.get(r.software_id) || []
          // Format: codi del master + nom (per coherència amb el render)
          if (!arr.some(x => x.code === r.programs.code)) {
            arr.push({ code: r.programs.code, name: r.programs.name })
          }
          swSubjMap.set(r.software_id, arr)
        }
        // Ordena per codi
        swSubjMap.forEach((list, id) => {
          list.sort((a, b) => a.code.localeCompare(b.code))
          swSubjMap.set(id, list)
        })
      }
      setSoftwareSubjectsMap(swSubjMap)

      // Carrega les assignatures impartides a cada aula al curs seleccionat.
      if (yearName) {
        const { data: sems } = await supabase
          .from('semesters')
          .select('id, academic_years!inner(name)')
          .eq('academic_years.name', yearName)
        const semIds = (sems || []).map((s: any) => s.id)
        if (semIds.length) {
          const { data: assigs } = await supabase
            .from('assignments')
            .select('subject:subjects(code, name), assignment_classrooms(classroom_id)')
            .in('semester_id', semIds)
          const subjMap = new Map<string, Map<string, ClassroomSubject>>()
          for (const a of (assigs || []) as any[]) {
            const subj = a.subject
            if (!subj) continue
            for (const ac of a.assignment_classrooms || []) {
              if (!subjMap.has(ac.classroom_id)) subjMap.set(ac.classroom_id, new Map())
              subjMap.get(ac.classroom_id)!.set(subj.code, { code: subj.code, name: subj.name })
            }
          }
          subjMap.forEach((subjects, classroomId) => {
            const room = classroomMap.get(classroomId)
            if (room) {
              room.subjects = Array.from(subjects.values()).sort((a, b) => a.code.localeCompare(b.code))
            }
          })

          // Carrega els masters/postgraus que utilitzen cada aula, combinant
          // master_schedules (horaris reals) + program_classrooms (planificació Airtable).
          const [{ data: msRows }, { data: pcRows }] = await Promise.all([
            supabase
              .from('master_schedules')
              .select('classroom_id, programs!inner(id, code, name, type)')
              .eq('active', true)
              .in('programs.type', ['master', 'postgrau']),
            supabase
              .from('program_classrooms')
              .select('classroom_id, programs!inner(id, code, name, type)')
              .in('programs.type', ['master', 'postgrau']),
          ])

          // Map (classroom_id, program_id) → program info, deduplicant
          const roomToPrograms = new Map<string, Map<string, { id: string; code: string; name: string; type: string }>>()
          const collectedProgramIds = new Set<string>()
          const ingestProgram = (classroomId: string, p: any) => {
            if (!p) return
            collectedProgramIds.add(p.id)
            if (!roomToPrograms.has(classroomId)) roomToPrograms.set(classroomId, new Map())
            if (!roomToPrograms.get(classroomId)!.has(p.id)) {
              roomToPrograms.get(classroomId)!.set(p.id, {
                id: p.id, code: p.code, name: p.name, type: p.type,
              })
            }
          }
          for (const r of (msRows || []) as any[]) ingestProgram(r.classroom_id, r.programs)
          for (const r of (pcRows || []) as any[]) ingestProgram(r.classroom_id, r.programs)

          // Software per programa al curs actual (o sense any), amb info completa
          const swByProgram = new Map<string, { id: string; name: string; version?: string; license_type: string; category: string }[]>()
          if (collectedProgramIds.size) {
            const { data: psRows } = await supabase
              .from('program_software')
              .select('program_id, software:software(id, name, version, license_type, category)')
              .in('program_id', Array.from(collectedProgramIds))
              .or(`academic_year.eq.${yearName},academic_year.is.null`)
            for (const r of (psRows || []) as any[]) {
              const sw = r.software
              if (!sw) continue
              if (!swByProgram.has(r.program_id)) swByProgram.set(r.program_id, [])
              swByProgram.get(r.program_id)!.push(sw)
            }
          }

          // Comprovar quin software està instal·lat a cada aula (via classroom_software)
          const allRoomIds = Array.from(classroomMap.keys())
          const installedByRoom = new Map<string, Set<string>>()
          if (allRoomIds.length) {
            const { data: csRows } = await supabase
              .from('classroom_software')
              .select('classroom_id, software_id')
              .in('classroom_id', allRoomIds)
            for (const r of (csRows || []) as any[]) {
              if (!installedByRoom.has(r.classroom_id)) installedByRoom.set(r.classroom_id, new Set())
              installedByRoom.get(r.classroom_id)!.add(r.software_id)
            }
          }

          roomToPrograms.forEach((progs, classroomId) => {
            const room = classroomMap.get(classroomId)
            if (!room) return

            // Llistat per a la secció "Masters i postgraus"
            room.programs = Array.from(progs.values())
              .map(p => ({
                code: p.code,
                name: p.name,
                type: p.type,
                software: (swByProgram.get(p.id) || []).map(s => s.name).sort(),
              }))
              .sort((a, b) => a.code.localeCompare(b.code))

            // Barrejar el software dels masters amb el panell principal:
            // si ja hi és, afegir el master al required_by_subjects; sinó, afegir-lo nou.
            const programNames = new Map<string, Set<string>>()  // sw_id -> set<program_code>
            for (const [_pid, p] of progs) {
              for (const sw of (swByProgram.get(p.id) || [])) {
                if (!programNames.has(sw.id)) programNames.set(sw.id, new Set())
                programNames.get(sw.id)!.add(`${p.code}: ${p.name}`)
              }
            }

            // Per cada llista (paid/educational/free/open_source), buscar matches
            const buckets: (keyof ClassroomWithSoftware)[] = ['paid', 'educational', 'free', 'open_source']
            for (const sw of Array.from(swByProgram.values()).flat()) {
              const masters = Array.from(programNames.get(sw.id) || [])
              if (!masters.length) continue
              const installed = installedByRoom.get(classroomId)?.has(sw.id) || false
              // Mira si ja hi és a algun bucket
              let found = false
              for (const b of buckets) {
                const arr = room[b] as Software[]
                const existing = arr.find(x => x.id === sw.id)
                if (existing) {
                  existing.is_required_by_subjects = true
                  const merged = [existing.required_by_subjects, masters.join(', ')].filter(Boolean).join(', ')
                  existing.required_by_subjects = merged
                  found = true
                  break
                }
              }
              if (!found) {
                const bucket = (sw.license_type as keyof ClassroomWithSoftware) in { paid: 1, educational: 1, free: 1, open_source: 1 }
                  ? (sw.license_type as keyof ClassroomWithSoftware)
                  : 'free'
                const newSw: Software = {
                  id: sw.id,
                  name: sw.name,
                  version: sw.version,
                  category: sw.category || 'general',
                  license_type: sw.license_type,
                  required_by_subjects: masters.join(', '),
                  is_installed: installed,
                  is_required_by_subjects: true,
                }
                ;(room[bucket] as Software[]).push(newSw)
              }
            }
          })

          // Carrega les notes de les assignatures que s'imparteixen a cada aula
          const allSubjectIds = new Set<string>()
          subjMap.forEach((m) => m.forEach((s) => {
            // s only has code/name; we'll fetch by subject_id via assignments table
          }))
          // Recuperar subject_ids de tots els classrooms en aquest curs
          const { data: assigSubjects } = await supabase
            .from('assignments')
            .select('subject_id, assignment_classrooms(classroom_id)')
            .in('semester_id', semIds)
          const classroomToSubjectIds = new Map<string, Set<string>>()
          for (const a of (assigSubjects || []) as any[]) {
            for (const ac of a.assignment_classrooms || []) {
              if (!classroomToSubjectIds.has(ac.classroom_id)) classroomToSubjectIds.set(ac.classroom_id, new Set())
              classroomToSubjectIds.get(ac.classroom_id)!.add(a.subject_id)
              allSubjectIds.add(a.subject_id)
            }
          }

          if (allSubjectIds.size) {
            const { data: notesRows } = await supabase
              .from('subject_notes')
              .select('subject_id, category, content, subjects!inner(code, name)')
              .eq('academic_year', yearName)
              .in('subject_id', Array.from(allSubjectIds))
            const notesBySubject = new Map<string, SubjectNote[]>()
            for (const n of (notesRows || []) as any[]) {
              const note: SubjectNote = {
                subject_id: n.subject_id,
                subject_code: n.subjects?.code || '',
                subject_name: n.subjects?.name || '',
                category: n.category,
                content: n.content,
              }
              if (!notesBySubject.has(n.subject_id)) notesBySubject.set(n.subject_id, [])
              notesBySubject.get(n.subject_id)!.push(note)
            }
            classroomToSubjectIds.forEach((subjectIds, classroomId) => {
              const room = classroomMap.get(classroomId)
              if (!room) return
              const allNotes: SubjectNote[] = []
              subjectIds.forEach(sid => {
                const ns = notesBySubject.get(sid) || []
                allNotes.push(...ns)
              })
              // Ordenar per codi i categoria
              allNotes.sort((a, b) => {
                if (a.subject_code !== b.subject_code) return a.subject_code.localeCompare(b.subject_code)
                return a.category.localeCompare(b.category)
              })
              room.notes = allNotes
            })
          }
        }
      }

      // Sort software within each category
      const sortedClassrooms = Array.from(classroomMap.values()).map(classroom => ({
        ...classroom,
        paid: classroom.paid.sort((a, b) => a.name.localeCompare(b.name)),
        educational: classroom.educational.sort((a, b) => a.name.localeCompare(b.name)),
        free: classroom.free.sort((a, b) => a.name.localeCompare(b.name)),
        open_source: classroom.open_source.sort((a, b) => a.name.localeCompare(b.name))
      }))

      // Sort classrooms by code
      sortedClassrooms.sort((a, b) => {
        const partsA = a.code.split('.')
        const partsB = b.code.split('.')
        
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
          const partA = partsA[i] || ''
          const partB = partsB[i] || ''
          
          const numA = parseInt(partA.replace(/\D/g, ''), 10)
          const numB = parseInt(partB.replace(/\D/g, ''), 10)
          
          if (!isNaN(numA) && !isNaN(numB)) {
            if (numA !== numB) return numA - numB
          } else {
            const comparison = partA.localeCompare(partB)
            if (comparison !== 0) return comparison
          }
        }
        
        return 0
      })

      setClassroomsWithSoftware(sortedClassrooms)
    } catch (error) {
      console.error('Error loading requirements:', error)
      setError('Error general carregant les dades')
    } finally {
      setLoading(false)
    }
  }

  const loadClassroomsForSoftware = async (software: Software) => {
    setLoadingClassrooms(true)
    setSelectedSoftware(software)
    
    try {
      const { data, error } = await supabase
        .from('classroom_software_requirements')
        .select('*')
        .eq('software_id', software.id)
        .eq('is_installed', true)
        .order('classroom_code')

      if (error) throw error
      setClassroomsForSelected(data || [])
    } catch (error) {
      console.error('Error loading classrooms:', error)
    } finally {
      setLoadingClassrooms(false)
    }
  }

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new()
    const yearLabel = currentYearName || '—'

    // Helpers ----------------------------------------------------------------

    // Llista visible de software per aula (filtrada + ordenada com a la UI)
    const visibleSoftware = (classroom: ClassroomWithSoftware): Software[] => {
      return sortSoftware(
        [
          ...classroom.paid,
          ...classroom.educational,
          ...classroom.free,
          ...classroom.open_source,
        ].filter(s => !HIDDEN_SOFTWARE.has(s.name))
      )
    }

    const stateLabel = (s: Software) => {
      if (s.is_required_by_subjects && s.is_installed) return '✓ Instal·lat + Requerit'
      if (s.is_required_by_subjects && !s.is_installed) return '⚠ Requerit no instal·lat'
      return '○ Instal·lat'
    }

    const setColWidths = (ws: XLSX.WorkSheet, widths: number[]) => {
      ws['!cols'] = widths.map(w => ({ wch: w }))
    }

    // ── Pestanya 1: Software per aula ───────────────────────────────────────
    const sw1: any[][] = []
    sw1.push([`Software per aula — Curs ${yearLabel}`])
    sw1.push([])
    sw1.push(['Aula', 'Edifici', 'Software', 'Versió', 'Llicència', 'Estat', 'Assignatures que el demanen'])

    for (const classroom of classroomsWithSoftware) {
      const list = visibleSoftware(classroom)
      if (!list.length) {
        sw1.push([classroom.code, classroom.building, '(cap)', '', '', '', ''])
        continue
      }
      for (const s of list) {
        const subjectsList = (softwareSubjectsMap.get(s.id) || [])
          .map(x => `${x.code}: ${x.name}`)
          .join(' · ')
        sw1.push([
          classroom.code,
          classroom.building,
          s.name,
          s.version ? `v${s.version}` : '',
          getLicenseTypeName(s.license_type),
          stateLabel(s),
          subjectsList,
        ])
      }
    }

    const ws1 = XLSX.utils.aoa_to_sheet(sw1)
    setColWidths(ws1, [14, 22, 32, 10, 14, 28, 60])
    XLSX.utils.book_append_sheet(wb, ws1, 'Software per Aula')

    // ── Pestanya 2: Assignatures per aula ───────────────────────────────────
    const sub: any[][] = []
    sub.push([`Assignatures impartides per aula — Curs ${yearLabel}`])
    sub.push([])
    sub.push(['Aula', 'Edifici', 'Codi', 'Assignatura'])
    for (const classroom of classroomsWithSoftware) {
      if (!classroom.subjects.length) {
        sub.push([classroom.code, classroom.building, '', '(cap assignatura assignada)'])
        continue
      }
      for (const s of classroom.subjects) {
        sub.push([classroom.code, classroom.building, s.code, s.name])
      }
    }
    const ws2 = XLSX.utils.aoa_to_sheet(sub)
    setColWidths(ws2, [14, 22, 14, 50])
    XLSX.utils.book_append_sheet(wb, ws2, 'Assignatures per Aula')

    // ── Pestanya 3: Pendents d'instal·lar ──────────────────────────────────
    const pend: any[][] = []
    pend.push([`Software requerit pendent d'instal·lar — Curs ${yearLabel}`])
    pend.push([])
    pend.push(['Aula', 'Edifici', 'Software', 'Assignatures que el demanen'])
    let anyPending = false
    for (const classroom of classroomsWithSoftware) {
      const pending = visibleSoftware(classroom).filter(
        s => s.is_required_by_subjects && !s.is_installed
      )
      for (const s of pending) {
        anyPending = true
        const subjectsList = (softwareSubjectsMap.get(s.id) || [])
          .map(x => `${x.code}: ${x.name}`)
          .join(' · ')
        pend.push([classroom.code, classroom.building, s.name, subjectsList])
      }
    }
    if (!anyPending) pend.push(['—', '—', 'Cap pendent', ''])
    const ws3 = XLSX.utils.aoa_to_sheet(pend)
    setColWidths(ws3, [14, 22, 32, 60])
    XLSX.utils.book_append_sheet(wb, ws3, 'Pendents d\'instal·lar')

    // ── Pestanya 4: Software → assignatures (vista global) ──────────────────
    const swSubj: any[][] = []
    swSubj.push([`Assignatures que requereixen cada software — Curs ${yearLabel}`])
    swSubj.push([])
    swSubj.push(['Software', 'Nombre assignatures', 'Assignatures'])
    const orderedIds = Array.from(softwareSubjectsMap.entries())
      .sort((a, b) => b[1].length - a[1].length)
    for (const [softwareId, subjects] of orderedIds) {
      // Trobem el nom del software
      let name = ''
      outer: for (const classroom of classroomsWithSoftware) {
        for (const s of [...classroom.paid, ...classroom.educational, ...classroom.free, ...classroom.open_source]) {
          if (s.id === softwareId) {
            name = s.name
            break outer
          }
        }
      }
      if (!name) {
        const fallback = allSoftware.find(s => s.id === softwareId)
        name = fallback?.name ?? softwareId
      }
      swSubj.push([
        name,
        subjects.length,
        subjects.map(s => `${s.code}: ${s.name}`).join(' · '),
      ])
    }
    const ws4 = XLSX.utils.aoa_to_sheet(swSubj)
    setColWidths(ws4, [28, 18, 80])
    XLSX.utils.book_append_sheet(wb, ws4, 'Software per Assignatura')

    // ── Nom del fitxer ──────────────────────────────────────────────────────
    const date = new Date()
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const yearForFile = yearLabel.replace('/', '-')
    const filename = `BAU_Software_${yearForFile}_${dateStr}.xlsx`

    XLSX.writeFile(wb, filename)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">Carregant...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="mb-2">
          <h1 className="text-3xl font-bold mb-2">Software per aula</h1>
          <p className="text-gray-600">
            Software instal·lat + software requerit per les assignatures del curs seleccionat
          </p>
        </div>

        {/* Selector de curs acadèmic destacat + accions */}
        <div className="mt-6 mb-2 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 shadow-sm">
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-sm font-semibold uppercase tracking-wide text-primary">
              Curs acadèmic
            </span>
            <Tabs value={currentYearName} onValueChange={setCurrentYearName}>
              <TabsList className="bg-white border border-primary/20">
                {availableYears.map(y => (
                  <TabsTrigger
                    key={y}
                    value={y}
                    className="px-4 py-1.5 text-base data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow"
                  >
                    {y}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="destructive"
              onClick={downloadExcel}
              className="gap-2"
              disabled={classroomsWithSoftware.length === 0}
            >
              <Download className="h-4 w-4" />
              Descarregar
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowSearch(!showSearch)}
              className="gap-2 bg-white"
            >
              <Search className="h-4 w-4" />
              {showSearch ? 'Tancar cerca' : 'Cercar software'}
            </Button>
          </div>
        </div>
      </div>

      {/* Search section */}
      {showSearch && (
        <div className="mb-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
          <h2 className="text-xl font-semibold mb-4">Cerca de software</h2>
          <p className="text-gray-600 mb-4">
            Busca un software per veure en quines aules està instal·lat
          </p>
          
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <Input
              type="text"
              placeholder="Buscar software (ex: Photoshop, Blender, AutoCAD...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 text-lg bg-white"
            />
          </div>

          {/* Software search results */}
          {searchTerm && filteredSoftware.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-3">
                Resultats ({filteredSoftware.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredSoftware.map((software) => (
                  <Card 
                    key={software.id} 
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedSoftware?.id === software.id ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => loadClassroomsForSoftware(software)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-base flex items-center gap-2">
                            <Monitor className="h-4 w-4" />
                            {software.name}
                          </CardTitle>
                          {software.version && (
                            <CardDescription className="text-sm">Versió {software.version}</CardDescription>
                          )}
                        </div>
                        <Badge className={`${getLicenseTypeColor(software.license_type)} text-xs`}>
                          {getLicenseTypeName(software.license_type)}
                        </Badge>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Empty state for search */}
          {searchTerm && filteredSoftware.length === 0 && (
            <div className="text-center py-8">
              <Monitor className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                No s'ha trobat cap software amb "{searchTerm}"
              </p>
            </div>
          )}

          {/* Classrooms where selected software is installed */}
          {selectedSoftware && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">
                  Aules amb {selectedSoftware.name}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedSoftware(null)
                    setClassroomsForSelected([])
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              {loadingClassrooms ? (
                <div className="text-center py-6">
                  <p>Carregant aules...</p>
                </div>
              ) : classroomsForSelected.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {classroomsForSelected.map((classroom) => (
                    <Link
                      key={classroom.classroom_id}
                      href={`/directori-aules/${classroom.classroom_code}`}
                    >
                      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Aula {classroom.classroom_code}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 text-sm">
                            <Building2 className="h-3 w-3" />
                            {classroom.building}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600">
                            {classroom.classroom_name}
                          </p>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6">
                  <MapPin className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600">
                    Aquest software no està instal·lat en cap aula
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Classroom grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {classroomsWithSoftware.map((classroom) => {
          const mainList = sortSoftware(
            [
              ...classroom.paid,
              ...classroom.educational,
              ...classroom.free,
            ].filter(s => !HIDDEN_SOFTWARE.has(s.name))
          )
          const openSourceList = sortSoftware(
            classroom.open_source.filter(s => !HIDDEN_SOFTWARE.has(s.name))
          )

          const totalSoftware = mainList.length + openSourceList.length

          const renderSoftwareItem = (software: Software) => {
            const requiredAndInstalled = software.is_installed && software.is_required_by_subjects
            const requiredNotInstalled = !software.is_installed && software.is_required_by_subjects
            const installedOnly = software.is_installed && !software.is_required_by_subjects
            const rowClass = requiredNotInstalled
              ? 'bg-amber-50 border border-amber-200 rounded px-1'
              : ''

            // Llistat global d'assignatures que demanen aquest software al curs.
            // Va més enllà del filtre per aula: així Figma (instal·lat a P.1.2) mostra
            // que la demanen Infografia II encara que aquella aula no la imparteixi.
            const globalSubjects = softwareSubjectsMap.get(software.id) || []
            const subjects = globalSubjects.map(s => `${s.code}: ${s.name}`)
            const hasSubjects = subjects.length > 0

            const inner = (
              <>
                {requiredAndInstalled && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                )}
                {requiredNotInstalled && (
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                )}
                {installedOnly && (
                  <Monitor className="h-4 w-4 text-gray-300 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <span className={`text-sm truncate block ${requiredNotInstalled ? 'font-semibold text-amber-900' : 'font-medium'}`}>
                    {software.name}
                  </span>
                  {software.version && (
                    <span className="text-xs text-gray-500">
                      v{software.version}
                    </span>
                  )}
                </div>
                {hasSubjects && (
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400 shrink-0 transition-transform group-open:rotate-90" />
                )}
              </>
            )

            if (!hasSubjects) {
              return (
                <div key={software.id} className={`flex items-center gap-2 py-1 ${rowClass}`}>
                  {inner}
                </div>
              )
            }

            return (
              <details key={software.id} className="group">
                <summary
                  className={`flex items-center gap-2 py-1 cursor-pointer list-none [&::-webkit-details-marker]:hidden ${rowClass}`}
                >
                  {inner}
                </summary>
                <ul className="mt-1 mb-2 ml-6 space-y-0.5 text-xs text-gray-600">
                  {subjects.map((s) => {
                    const m = s.match(/^([A-Z]{2,}\d+\w*):\s*(.+)$/)
                    if (m) {
                      return (
                        <li key={s} className="leading-tight">
                          <span className="font-mono text-gray-400">{m[1]}</span>
                          <span className="ml-2">{m[2]}</span>
                        </li>
                      )
                    }
                    return <li key={s} className="leading-tight">{s}</li>
                  })}
                </ul>
              </details>
            )
          }
          
          return (
            <div 
              key={classroom.id} 
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* CAPÇALERA */}
              <div className="border-b border-gray-200 pb-3 mb-3">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-gray-600" />
                  AULA {classroom.code}
                </h3>
                <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                  <Building2 className="h-4 w-4" />
                  {classroom.building}
                </p>
              </div>

              {/* SOFTWARE */}
              {(mainList.length > 0 || openSourceList.length > 0) && (
                <section className="mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                    <Monitor className="h-3.5 w-3.5" />
                    Software
                  </h4>

                  {/* Llegenda d'estats */}
                  <div className="flex flex-wrap gap-2 mb-2 text-[10px] text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3 text-emerald-600" /> inst+req
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-amber-600" /> requerit no inst
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Monitor className="h-3 w-3 text-gray-400" /> instal·lat
                    </span>
                  </div>

                  {mainList.length > 0 && (
                    <div className="mb-3">
                      <div className="text-xs font-semibold text-gray-700 mb-1.5">
                        Privatiu ({mainList.length})
                      </div>
                      <div className="space-y-0.5 pl-2">
                        {mainList.map(renderSoftwareItem)}
                      </div>
                    </div>
                  )}

                  {openSourceList.length > 0 && (
                    <details className="group" open>
                      <summary className="cursor-pointer text-xs font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2 select-none">
                        Codi obert ({openSourceList.length})
                        <span className="text-[10px] text-gray-400 ml-auto group-open:hidden">obrir ▾</span>
                        <span className="text-[10px] text-gray-400 ml-auto hidden group-open:inline">tancar ▴</span>
                      </summary>
                      <div className="mt-1.5 space-y-0.5 pl-2">
                        {openSourceList.map(renderSoftwareItem)}
                      </div>
                    </details>
                  )}
                </section>
              )}

              {/* ASSIGNATURES */}
              {(classroom.subjects.length > 0 || classroom.programs.length > 0) && (
                <section className="mb-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                    <BookOpen className="h-3.5 w-3.5" />
                    Assignatures
                  </h4>

                  {classroom.subjects.length > 0 && (
                    <details className="mb-2 group">
                      <summary className="cursor-pointer text-xs font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2 select-none">
                        Grau ({classroom.subjects.length})
                        <span className="text-[10px] text-gray-400 ml-auto group-open:hidden">obrir ▾</span>
                        <span className="text-[10px] text-gray-400 ml-auto hidden group-open:inline">tancar ▴</span>
                      </summary>
                      <ul className="mt-1.5 space-y-1 text-xs text-gray-600 pl-4">
                        {classroom.subjects.map(s => (
                          <li key={s.code} className="leading-tight">
                            <span className="font-mono text-gray-400">{s.code}</span>
                            <span className="ml-2">{s.name}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {classroom.programs.length > 0 && (
                    <details className="group">
                      <summary className="cursor-pointer text-xs font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2 select-none">
                        Masters i postgraus ({classroom.programs.length})
                        <span className="text-[10px] text-gray-400 ml-auto group-open:hidden">obrir ▾</span>
                        <span className="text-[10px] text-gray-400 ml-auto hidden group-open:inline">tancar ▴</span>
                      </summary>
                      <ul className="mt-1.5 space-y-1.5 text-xs text-gray-600 pl-4">
                        {classroom.programs.map(p => (
                          <li key={p.code} className="leading-tight">
                            <div>
                              <span className="font-mono text-gray-400">{p.code}</span>
                              <span className="ml-2 font-medium">{p.name}</span>
                              <span className="ml-2 text-[10px] uppercase tracking-wide text-purple-500">{p.type}</span>
                            </div>
                            {p.software.length > 0 && (
                              <div className="ml-3 mt-0.5 text-gray-500 text-[11px]">
                                <span className="font-semibold">Software:</span> {p.software.join(', ')}
                              </div>
                            )}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </section>
              )}

              {/* Comptador de notes amb enllaç a la secció global */}
              {classroom.notes.length > 0 && (
                <a
                  href={`#notes-${classroom.id}`}
                  className="block border-t border-gray-200 pt-3 text-xs text-blue-700 hover:text-blue-900 flex items-center gap-1.5"
                >
                  <Info className="h-3.5 w-3.5" />
                  <span className="font-semibold">
                    {classroom.notes.length} {classroom.notes.length === 1 ? 'comentari' : 'comentaris'} del professorat
                  </span>
                  <ChevronRight className="h-3 w-3" />
                </a>
              )}

              {totalSoftware === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Info className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Cap software instal·lat</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* SECCIÓ GLOBAL: COMENTARIS DEL PROFESSORAT PER AULA */}
      {(() => {
        const classroomsWithNotes = classroomsWithSoftware.filter(c => c.notes.length > 0)
        if (classroomsWithNotes.length === 0) return null

        const totalNotes = classroomsWithNotes.reduce((acc, c) => acc + c.notes.length, 0)

        return (
          <section className="mt-12 pt-8 border-t-2 border-gray-300">
            <div className="mb-6">
              <h2 className="text-2xl font-bold mb-1 flex items-center gap-2">
                <Info className="h-6 w-6 text-blue-600" />
                Comentaris del professorat
              </h2>
              <p className="text-sm text-gray-600">
                {totalNotes} {totalNotes === 1 ? 'comentari recollit' : 'comentaris recollits'} a través de les fitxes d'assignatures del curs {currentYearName}, agrupats per aula on s'imparteix la matèria.
              </p>
            </div>

            {/* Índex ràpid de navegació */}
            <div className="mb-8 rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
                Saltar a l'aula
              </div>
              <div className="flex flex-wrap gap-1.5">
                {classroomsWithNotes.map(c => (
                  <a
                    key={c.id}
                    href={`#notes-${c.id}`}
                    className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2 py-1 text-xs font-mono text-gray-700 hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors"
                  >
                    {c.code}
                    <Badge className="bg-blue-100 text-blue-700 text-[10px] px-1.5 py-0">
                      {c.notes.length}
                    </Badge>
                  </a>
                ))}
              </div>
            </div>

            <div className="space-y-8">
              {classroomsWithNotes.map(classroom => {
                // Agrupar per categoria, dins de cada categoria per assignatura
                const byCategory = new Map<string, Map<string, SubjectNote[]>>()
                for (const n of classroom.notes) {
                  if (!byCategory.has(n.category)) byCategory.set(n.category, new Map())
                  const bySubj = byCategory.get(n.category)!
                  if (!bySubj.has(n.subject_id)) bySubj.set(n.subject_id, [])
                  bySubj.get(n.subject_id)!.push(n)
                }

                return (
                  <article
                    key={classroom.id}
                    id={`notes-${classroom.id}`}
                    className="scroll-mt-6 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden"
                  >
                    {/* Capçalera de l'aula */}
                    <header className="bg-gradient-to-r from-blue-50 to-blue-100/60 border-b border-blue-200 px-5 py-3 flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <h3 className="text-lg font-bold flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-blue-700" />
                          AULA {classroom.code}
                        </h3>
                        <p className="text-xs text-gray-600 flex items-center gap-1.5 mt-0.5">
                          <Building2 className="h-3.5 w-3.5" />
                          {classroom.building}
                        </p>
                      </div>
                      <Badge className="bg-blue-600 text-white">
                        {classroom.notes.length} {classroom.notes.length === 1 ? 'comentari' : 'comentaris'}
                      </Badge>
                    </header>

                    {/* Llistat de comentaris agrupats per categoria */}
                    <div className="p-5 space-y-5">
                      {Array.from(byCategory.entries()).map(([category, bySubject]) => (
                        <div key={category}>
                          <h4 className="text-xs font-bold uppercase tracking-wider text-blue-700 mb-2 pb-1 border-b border-blue-100">
                            {NOTE_CATEGORY_LABEL[category] || category}
                          </h4>
                          <ul className="space-y-3">
                            {Array.from(bySubject.entries()).map(([sid, notes]) => (
                              <li key={sid} className="pl-3 border-l-4 border-blue-200">
                                <div className="text-sm font-medium text-gray-800 mb-1">
                                  <span className="font-mono text-xs text-gray-500 mr-2">
                                    {notes[0].subject_code}
                                  </span>
                                  {notes[0].subject_name}
                                </div>
                                {notes.map((n, idx) => (
                                  <p
                                    key={idx}
                                    className="text-sm text-gray-700 whitespace-pre-line leading-relaxed"
                                  >
                                    {n.content}
                                  </p>
                                ))}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
          </section>
        )
      })()}
    </div>
  )
}