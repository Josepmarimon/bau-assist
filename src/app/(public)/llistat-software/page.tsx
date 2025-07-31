'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Monitor, Building2, Info, Search, MapPin, X, Download } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { WeeklyScheduleMini } from '@/components/classrooms/weekly-schedule-mini'
import * as XLSX from 'xlsx'

interface Software {
  id: string
  name: string
  version?: string
  category: string
  license_type: string
  required_by_subjects?: string
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

interface ClassroomWithSoftware {
  id: string
  code: string
  name: string
  building: string
  paid: Software[]
  educational: Software[]
  free: Software[]
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
  const supabase = createClient()

  useEffect(() => {
    loadClassroomRequirements()
    loadAllSoftware()
  }, [])

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

  const loadClassroomRequirements = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load all classroom software requirements that are installed
      const { data: requirementsData, error: requirementsError } = await supabase
        .from('classroom_software_requirements')
        .select('*')
        .eq('is_installed', true)
        .order('classroom_code')
        .order('software_name')

      if (requirementsError) {
        console.error('Error loading requirements:', requirementsError)
        setError('Error carregant els requeriments de software')
        return
      }

      // Group by classroom and collect unique software
      const classroomMap = new Map<string, ClassroomWithSoftware>()
      
      requirementsData?.forEach(req => {
        if (!classroomMap.has(req.classroom_id)) {
          classroomMap.set(req.classroom_id, {
            id: req.classroom_id,
            code: req.classroom_code,
            name: req.classroom_name,
            building: req.building,
            paid: [],
            educational: [],
            free: [],
            open_source: []
          })
        }
        
        const classroom = classroomMap.get(req.classroom_id)!
        const software: Software = {
          id: req.software_id,
          name: req.software_name,
          version: req.software_version,
          category: req.category || 'general',
          license_type: req.license_type,
          required_by_subjects: req.required_by_subjects
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
    // Create workbook
    const wb = XLSX.utils.book_new()
    
    // Create data structure
    const excelData: any[] = []
    
    // Header row with classroom information
    const headerRow1: any = { 'Tipus': 'AULA' }
    const headerRow2: any = { 'Tipus': 'EDIFICI' }
    const headerRow3: any = { 'Tipus': 'NOM' }
    
    classroomsWithSoftware.forEach(classroom => {
      headerRow1[classroom.code] = classroom.code
      headerRow2[classroom.code] = classroom.building
      headerRow3[classroom.code] = classroom.name
    })
    
    excelData.push(headerRow1)
    excelData.push(headerRow2)
    excelData.push(headerRow3)
    
    // Add separator
    const separatorRow: any = { 'Tipus': '---' }
    classroomsWithSoftware.forEach(classroom => {
      separatorRow[classroom.code] = '---'
    })
    excelData.push(separatorRow)
    
    // Find max number of software per type across all classrooms
    const maxCounts = {
      paid: 0,
      educational: 0,
      free: 0,
      open_source: 0
    }
    
    classroomsWithSoftware.forEach(classroom => {
      maxCounts.paid = Math.max(maxCounts.paid, classroom.paid.length)
      maxCounts.educational = Math.max(maxCounts.educational, classroom.educational.length)
      maxCounts.free = Math.max(maxCounts.free, classroom.free.length)
      maxCounts.open_source = Math.max(maxCounts.open_source, classroom.open_source.length)
    })
    
    // Add software by type
    const sections = [
      { type: 'paid', label: 'PAGAMENT', data: 'paid' as keyof ClassroomWithSoftware },
      { type: 'educational', label: 'EDUCATIU', data: 'educational' as keyof ClassroomWithSoftware },
      { type: 'free', label: 'GRATUÏT', data: 'free' as keyof ClassroomWithSoftware },
      { type: 'open_source', label: 'CODI OBERT', data: 'open_source' as keyof ClassroomWithSoftware }
    ]
    
    sections.forEach(({ type, label, data }) => {
      // Section header
      const sectionHeader: any = { 'Tipus': label }
      classroomsWithSoftware.forEach(classroom => {
        sectionHeader[classroom.code] = ''
      })
      excelData.push(sectionHeader)
      
      // Add rows for this section
      const maxRows = maxCounts[type as keyof typeof maxCounts]
      for (let i = 0; i < maxRows; i++) {
        const row: any = { 'Tipus': '' }
        
        classroomsWithSoftware.forEach(classroom => {
          const softwareList = classroom[data] as Software[]
          if (i < softwareList.length) {
            const software = softwareList[i]
            row[classroom.code] = software.version 
              ? `${software.name} (v${software.version})`
              : software.name
          } else {
            row[classroom.code] = ''
          }
        })
        
        excelData.push(row)
      }
      
      // Add empty row between sections (except after last)
      if (type !== 'open_source') {
        const emptyRow: any = { 'Tipus': '' }
        classroomsWithSoftware.forEach(classroom => {
          emptyRow[classroom.code] = ''
        })
        excelData.push(emptyRow)
      }
    })
    
    // Add summary row at the end
    const summaryRow: any = { 'Tipus': 'TOTAL SOFTWARE' }
    classroomsWithSoftware.forEach(classroom => {
      const total = classroom.paid.length + 
                   classroom.educational.length + 
                   classroom.free.length + 
                   classroom.open_source.length
      summaryRow[classroom.code] = total.toString()
    })
    excelData.push({ 'Tipus': '' })
    excelData.push(summaryRow)
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(excelData)
    
    // Set column widths
    const colWidths = [{ wch: 15 }] // First column for types
    classroomsWithSoftware.forEach(() => {
      colWidths.push({ wch: 40 }) // Wider columns for software lists
    })
    ws['!cols'] = colWidths
    
    // Apply text wrapping and vertical alignment
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1')
    for (let R = range.s.r; R <= range.e.r; ++R) {
      for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = XLSX.utils.encode_cell({ r: R, c: C })
        if (!ws[address]) continue
        
        if (!ws[address].s) ws[address].s = {}
        ws[address].s.alignment = { vertical: 'top', wrapText: true }
        
        // Bold for header rows (first 3 rows)
        if (R < 3) {
          ws[address].s.font = { bold: true }
          // Add background color to header rows for better visibility
          ws[address].s.fill = { fgColor: { rgb: "E0E0E0" } }
        }
        
        // Bold for section titles in first column
        if (C === 0 && (ws[address].v === 'PAGAMENT' || ws[address].v === 'EDUCATIU' || 
            ws[address].v === 'GRATUÏT' || ws[address].v === 'CODI OBERT' || 
            ws[address].v === 'TOTAL SOFTWARE')) {
          ws[address].s.font = { bold: true }
        }
      }
    }
    
    XLSX.utils.book_append_sheet(wb, ws, 'Software per Aula')
    
    // Generate filename with current date
    const date = new Date()
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    const filename = `BAU_Software_Llista_${dateStr}.xlsx`
    
    // Write file
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
        <h1 className="text-3xl font-bold mb-4">Software instal·lat per aula</h1>
        <p className="text-gray-600 mb-2">
          Llistat complet del software disponible a cada aula del centre
        </p>
        <div className="flex justify-between items-center">
          <div className="flex gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-red-100 rounded"></div>
              Pagament
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-blue-100 rounded"></div>
              Educatiu
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-green-100 rounded"></div>
              Gratuït
            </span>
            <span className="flex items-center gap-1">
              <div className="w-3 h-3 bg-purple-100 rounded"></div>
              Codi Obert
            </span>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="destructive" 
              onClick={downloadExcel}
              className="gap-2"
              disabled={classroomsWithSoftware.length === 0}
            >
              <Download className="h-4 w-4" />
              Descarregar Excel
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setShowSearch(!showSearch)}
              className="gap-2"
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
          const allSoftwareList = [
            ...classroom.paid,
            ...classroom.educational,
            ...classroom.free,
            ...classroom.open_source
          ]
          
          const totalSoftware = allSoftwareList.length
          
          return (
            <div 
              key={classroom.id} 
              className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
            >
              {/* Classroom header */}
              <div className="border-b border-gray-200 pb-3 mb-3">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Monitor className="h-5 w-5 text-gray-600" />
                  AULA {classroom.code}
                </h3>
                <p className="text-sm text-gray-600 flex items-center gap-2 mt-1">
                  <Building2 className="h-4 w-4" />
                  {classroom.building} • {totalSoftware} programes
                </p>
              </div>
              
              {/* Software list */}
              <div className="space-y-2">
                {allSoftwareList.map((software, idx) => {
                  const colorClass = getLicenseTypeColor(software.license_type)
                  
                  return (
                    <div 
                      key={software.id} 
                      className="flex items-center gap-2 py-1"
                    >
                      <span className="text-xs text-gray-400 font-mono w-6">
                        {(idx + 1).toString().padStart(2, '0')}
                      </span>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate block">
                          {software.name}
                        </span>
                        {software.version && (
                          <span className="text-xs text-gray-500">
                            v{software.version}
                          </span>
                        )}
                      </div>
                      <Badge className={`${colorClass} text-xs px-2 py-0.5`}>
                        {getLicenseTypeName(software.license_type)}
                      </Badge>
                    </div>
                  )
                })}
              </div>
              
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
    </div>
  )
}