'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { Alert, AlertDescription } from '@/components/ui/alert'
import './print-page.css'

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

const getCategoryName = (category: string): string => {
  const categoryMap: Record<string, string> = {
    'general': 'General',
    '3d_modeling': 'Modelat 3D',
    'design': 'Disseny',
    'programming': 'Programació',
    'web_development': 'Desenvolupament Web',
    'cad': 'CAD',
    'audio': 'Àudio',
    'render': 'Render',
    'patronatge': 'Patronatge'
  }
  return categoryMap[category] || category
}

export default function SoftwarePrintPage() {
  const [classroomsWithSoftware, setClassroomsWithSoftware] = useState<ClassroomWithSoftware[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [allSoftware, setAllSoftware] = useState<Software[]>([])
  const componentRef = useRef<HTMLDivElement>(null)
  const supabase = createClient()

  useEffect(() => {
    loadClassroomRequirements()
  }, [])

  const loadClassroomRequirements = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Check authentication status
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      if (authError || !user) {
        console.error('Authentication error:', authError || 'No user found')
        setError('Cal estar autenticat per veure aquesta pàgina')
        return
      }
      
      // Load all classroom software requirements
      const { data: requirementsData, error: requirementsError } = await supabase
        .from('classroom_software_requirements')
        .select('*')
        .eq('is_required', true)
        .order('classroom_code')
        .order('software_name')

      if (requirementsError) {
        console.error('Error loading requirements:', requirementsError)
        setError('Error carregant els requeriments de software')
        return
      }

      // Group by classroom and collect unique software
      const classroomMap = new Map<string, ClassroomWithSoftware>()
      const softwareMap = new Map<string, Software>()
      
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
        
        // Add to unique software map
        if (!softwareMap.has(req.software_id)) {
          softwareMap.set(req.software_id, software)
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

      // Sort classrooms by code (handle P.1.2, P.1.3, etc. format)
      sortedClassrooms.sort((a, b) => {
        // Split codes by dots to compare each part numerically
        const partsA = a.code.split('.')
        const partsB = b.code.split('.')
        
        for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
          const partA = partsA[i] || ''
          const partB = partsB[i] || ''
          
          // Extract numbers from parts for proper numerical comparison
          const numA = parseInt(partA.replace(/\D/g, ''), 10)
          const numB = parseInt(partB.replace(/\D/g, ''), 10)
          
          // If both parts have numbers, compare numerically
          if (!isNaN(numA) && !isNaN(numB)) {
            if (numA !== numB) return numA - numB
          } else {
            // Otherwise compare alphabetically
            const comparison = partA.localeCompare(partB)
            if (comparison !== 0) return comparison
          }
        }
        
        return 0
      })

      setClassroomsWithSoftware(sortedClassrooms)
      
      // Sort all unique software by name
      const sortedSoftware = Array.from(softwareMap.values()).sort((a, b) => 
        a.name.localeCompare(b.name)
      )
      setAllSoftware(sortedSoftware)
    } catch (error) {
      console.error('Error loading requirements:', error)
      setError('Error general carregant les dades')
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const currentDate = new Date().toLocaleDateString('ca-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })

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
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Link href="/programari" className="mt-4 inline-block">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tornar a programari
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="print-page">
      {/* Screen view header */}
      <div className="mb-6 space-y-4 container mx-auto px-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/programari">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tornar a programari
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Llistat de software</h1>
          </div>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
        <p className="text-muted-foreground">
          Aquest document mostra el software que s'ha d'instal·lar a cada aula, organitzat per facilitar la instal·lació.
        </p>
      </div>

      {/* Print content - this will be printed */}
      <div id="print-content" ref={componentRef} style={{ padding: '20px' }}>
        {/* Print header */}
        <div style={{ textAlign: 'center', marginBottom: '30px', display: 'none' }} className="print-header">
          <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '10px' }}>
            BAU, Centre Universitari d'Arts i Disseny
          </h1>
          <h2 style={{ fontSize: '20px', marginBottom: '10px' }}>Llistat de software</h2>
          <p style={{ fontSize: '14px', color: '#666' }}>{currentDate}</p>
        </div>

        {/* Classrooms grid with inline styles for print */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(3, 1fr)', 
          gap: '15px',
          width: '100%'
        }}>
          {classroomsWithSoftware.map((classroom, index) => {
              // Group software by type in the desired order
              const allSoftwareList = [
                ...classroom.paid.sort((a, b) => a.name.localeCompare(b.name)),
                ...classroom.educational.sort((a, b) => a.name.localeCompare(b.name)),
                ...classroom.free.sort((a, b) => a.name.localeCompare(b.name)),
                ...classroom.open_source.sort((a, b) => a.name.localeCompare(b.name))
              ]
              
              const totalSoftware = allSoftwareList.length
              
              return (
                <div 
                  key={classroom.id} 
                  style={{
                    border: '1px solid #9ca3af',
                    borderRadius: '8px',
                    padding: '12px',
                    breakInside: 'avoid',
                    pageBreakInside: 'avoid',
                    backgroundColor: 'white'
                  }}
                >
                  {/* Classroom header */}
                  <div style={{ 
                    marginBottom: '8px', 
                    borderBottom: '1px solid #d1d5db', 
                    paddingBottom: '6px' 
                  }}>
                    <h3 style={{ 
                      fontWeight: 'bold', 
                      fontSize: '14px',
                      marginBottom: '2px'
                    }}>
                      AULA {classroom.code}
                    </h3>
                    <p style={{ 
                      fontSize: '11px', 
                      color: '#6b7280' 
                    }}>
                      {classroom.building} • {totalSoftware} programes
                    </p>
                  </div>
                  
                  {/* Software list */}
                  <div>
                    {allSoftwareList.map((software, idx) => {
                      const licenseColors = {
                        'paid': { bg: '#fee2e2', text: '#b91c1c' },
                        'educational': { bg: '#dbeafe', text: '#1d4ed8' },
                        'free': { bg: '#dcfce7', text: '#15803d' },
                        'open_source': { bg: '#f3e8ff', text: '#6b21a8' }
                      }
                      const colors = licenseColors[software.license_type as keyof typeof licenseColors] || { bg: '#f3f4f6', text: '#374151' }
                      
                      return (
                        <div 
                          key={software.id} 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            paddingTop: '4px',
                            paddingBottom: '4px',
                            fontSize: '11px'
                          }}
                        >
                          <span style={{ 
                            color: '#9ca3af', 
                            fontFamily: 'monospace',
                            fontSize: '10px',
                            width: '20px'
                          }}>
                            {(idx + 1).toString().padStart(2, '0')}
                          </span>
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: '500' }}>
                              {software.name}
                            </span>
                            {software.version && (
                              <span style={{ color: '#6b7280', marginLeft: '4px', fontSize: '10px' }}>
                                v{software.version}
                              </span>
                            )}
                          </div>
                          <span style={{
                            fontSize: '9px',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: colors.bg,
                            color: colors.text,
                            fontWeight: '500'
                          }}>
                            {software.license_type === 'paid' && 'Pagament'}
                            {software.license_type === 'educational' && 'Educatiu'}
                            {software.license_type === 'free' && 'Gratuït'}
                            {software.license_type === 'open_source' && 'Codi Obert'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Installation checkbox */}
                  <div style={{
                    marginTop: '10px',
                    paddingTop: '8px',
                    borderTop: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '11px'
                  }}>
                    <div style={{
                      width: '12px',
                      height: '12px',
                      border: '1px solid #9ca3af',
                      borderRadius: '2px'
                    }}></div>
                    <span style={{ color: '#6b7280' }}>Instal·lat</span>
                    <span style={{ 
                      marginLeft: 'auto',
                      fontSize: '10px',
                      color: '#9ca3af'
                    }}>
                      Data: _______
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Print footer */}
        <div style={{
          marginTop: '40px',
          paddingTop: '20px',
          borderTop: '1px solid #e5e7eb',
          textAlign: 'center',
          fontSize: '10px',
          color: '#9ca3af',
          display: 'none'
        }} className="print-footer">
          <p>Document generat automàticament - BAU Assist - {currentDate}</p>
        </div>
      </div>

    </div>
  )
}