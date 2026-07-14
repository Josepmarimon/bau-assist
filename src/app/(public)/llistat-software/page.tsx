'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Monitor, Building2, Info, Search, MapPin, X, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import * as XLSX from 'xlsx'

interface Software {
  id: string
  name: string
  version?: string
  category: string
  license_type: string
}

interface ClassroomWithSoftware {
  id: string
  code: string
  name: string
  building: string
  main: Software[]        // privatiu: paid + educational + free
  open_source: Software[]
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

// Programes que no es mostren al llistat.
const HIDDEN_SOFTWARE = new Set<string>([
  'Teams',
])

// Ordre canònic perquè totes les aules mostrin els mateixos programes
// a la mateixa posició. Software no llistat aquí cau al final, alfabètic.
const SOFTWARE_PRIORITY: string[] = [
  'Suite Adobe completa', 'Figma', 'Autocad', 'Rhino', '3D MAX', 'VRAY',
  '5D Render', 'Corona Render', 'Lumion', 'Cinema 4D', 'Blender', 'Unreal',
  'Touch Designer', 'Processing', 'Arduino', 'Sublime Text', 'Filezilla',
  'Glyphs', 'Clo 3D', 'Gerber', 'Resolume free', 'Resolume Full',
  'Davinci Resolve', 'Audacity', 'Cura3D', 'Freecad', 'Spout', 'Inkscape',
  'Gimp', 'Hand brake', 'Shotcut', 'VLC', 'MediaInfo', 'LibreOffice',
  'Enscape', 'AnyDesk', 'RustDesk',
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

const sortByClassroomCode = (a: { code: string }, b: { code: string }): number => {
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
}

export default function SoftwareListPage() {
  const [classroomsWithSoftware, setClassroomsWithSoftware] = useState<ClassroomWithSoftware[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [allSoftware, setAllSoftware] = useState<Software[]>([])
  const [filteredSoftware, setFilteredSoftware] = useState<Software[]>([])
  const [selectedSoftware, setSelectedSoftware] = useState<Software | null>(null)
  const [classroomsForSelected, setClassroomsForSelected] = useState<ClassroomWithSoftware[]>([])
  const [showSearch, setShowSearch] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (searchTerm) {
      setFilteredSoftware(
        allSoftware.filter(sw => sw.name.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    } else {
      setFilteredSoftware([])
    }
  }, [searchTerm, allSoftware])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [{ data: softwareRows }, { data: classroomRows }, { data: csRows }] = await Promise.all([
        supabase.from('software').select('id, name, version, category, license_type').order('name'),
        supabase.from('classrooms').select('id, code, name, building'),
        supabase.from('classroom_software').select('classroom_id, software:software_id (*)'),
      ])

      setAllSoftware((softwareRows || []) as Software[])

      const classroomMap = new Map<string, ClassroomWithSoftware>()
      for (const c of classroomRows || []) {
        classroomMap.set(c.id, {
          id: c.id,
          code: c.code,
          name: c.name,
          building: c.building || 'Sense edifici',
          main: [],
          open_source: [],
        })
      }

      for (const row of (csRows || []) as any[]) {
        const room = classroomMap.get(row.classroom_id)
        const sw = row.software
        if (!room || !sw) continue
        if (HIDDEN_SOFTWARE.has(sw.name)) continue
        const software: Software = {
          id: sw.id,
          name: sw.name,
          version: sw.version,
          category: sw.category || 'general',
          license_type: sw.license_type,
        }
        if (sw.license_type === 'open_source') {
          room.open_source.push(software)
        } else {
          room.main.push(software)
        }
      }

      // Només mostrem aules amb algun software instal·lat
      const list = Array.from(classroomMap.values())
        .map(c => ({ ...c, main: sortSoftware(c.main), open_source: sortSoftware(c.open_source) }))
        .filter(c => c.main.length > 0 || c.open_source.length > 0)
        .sort(sortByClassroomCode)

      setClassroomsWithSoftware(list)
    } catch (error) {
      console.error('Error loading software data:', error)
      setError('Error carregant les dades de software')
    } finally {
      setLoading(false)
    }
  }

  const loadClassroomsForSoftware = (software: Software) => {
    setSelectedSoftware(software)
    const rooms = classroomsWithSoftware.filter(c =>
      [...c.main, ...c.open_source].some(s => s.id === software.id)
    )
    setClassroomsForSelected(rooms)
  }

  const downloadExcel = () => {
    const wb = XLSX.utils.book_new()
    const rows: any[][] = []
    rows.push(['Software instal·lat per aula'])
    rows.push([])
    rows.push(['Aula', 'Edifici', 'Software', 'Versió', 'Llicència'])

    for (const classroom of classroomsWithSoftware) {
      const list = [...classroom.main, ...classroom.open_source]
      if (!list.length) {
        rows.push([classroom.code, classroom.building, '(cap)', '', ''])
        continue
      }
      for (const s of list) {
        rows.push([
          classroom.code,
          classroom.building,
          s.name,
          s.version ? `v${s.version}` : '',
          getLicenseTypeName(s.license_type),
        ])
      }
    }

    const ws = XLSX.utils.aoa_to_sheet(rows)
    ws['!cols'] = [14, 22, 32, 10, 14].map(w => ({ wch: w }))
    XLSX.utils.book_append_sheet(wb, ws, 'Software per Aula')

    const date = new Date()
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    XLSX.writeFile(wb, `BAU_Software_${dateStr}.xlsx`)
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

  const renderSoftwareItem = (software: Software) => (
    <div key={software.id} className="flex items-center gap-2 py-1">
      <Monitor className="h-4 w-4 text-gray-300 shrink-0" />
      <div className="flex-1 min-w-0">
        <span className="text-sm font-medium truncate block">{software.name}</span>
        {software.version && (
          <span className="text-xs text-gray-500">v{software.version}</span>
        )}
      </div>
    </div>
  )

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8">
        <div className="mb-2">
          <h1 className="text-3xl font-bold mb-2">Software per aula</h1>
          <p className="text-gray-600">
            Software instal·lat a cada aula del centre
          </p>
        </div>

        <div className="mt-6 mb-2 flex flex-wrap items-center justify-end gap-2">
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

          {searchTerm && filteredSoftware.length === 0 && (
            <div className="text-center py-8">
              <Monitor className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600">
                No s'ha trobat cap software amb "{searchTerm}"
              </p>
            </div>
          )}

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

              {classroomsForSelected.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {classroomsForSelected.map((classroom) => (
                    <Link
                      key={classroom.id}
                      href={`/directori-aules/${classroom.code}`}
                    >
                      <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-base flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            Aula {classroom.code}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-2 text-sm">
                            <Building2 className="h-3 w-3" />
                            {classroom.building}
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-600">
                            {classroom.name}
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
        {classroomsWithSoftware.map((classroom) => (
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
            <section>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2 flex items-center gap-1.5">
                <Monitor className="h-3.5 w-3.5" />
                Software
              </h4>

              {classroom.main.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-semibold text-gray-700 mb-1.5">
                    Privatiu ({classroom.main.length})
                  </div>
                  <div className="space-y-0.5 pl-2">
                    {classroom.main.map(renderSoftwareItem)}
                  </div>
                </div>
              )}

              {classroom.open_source.length > 0 && (
                <details className="group" open>
                  <summary className="cursor-pointer text-xs font-semibold text-gray-700 hover:text-gray-900 flex items-center gap-2 select-none">
                    Codi obert ({classroom.open_source.length})
                    <span className="text-[10px] text-gray-400 ml-auto group-open:hidden">obrir ▾</span>
                    <span className="text-[10px] text-gray-400 ml-auto hidden group-open:inline">tancar ▴</span>
                  </summary>
                  <div className="mt-1.5 space-y-0.5 pl-2">
                    {classroom.open_source.map(renderSoftwareItem)}
                  </div>
                </details>
              )}

              {classroom.main.length === 0 && classroom.open_source.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Info className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">Cap software instal·lat</p>
                </div>
              )}
            </section>
          </div>
        ))}
      </div>
    </div>
  )
}
