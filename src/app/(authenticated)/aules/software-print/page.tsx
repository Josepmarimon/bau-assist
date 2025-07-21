'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Printer, ArrowLeft, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import { CLASSROOM_TYPES } from '@/lib/constants/classroom-types'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface SoftwareItem {
  id: string
  name: string
  version?: string
  licenses: number
}

interface ClassroomWithSoftware {
  id: string
  code: string
  name: string
  building: string
  floor: number
  capacity: number
  software: SoftwareItem[]
}

export default function SoftwarePrintPage() {
  const [classrooms, setClassrooms] = useState<ClassroomWithSoftware[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadClassroomsWithSoftware()
  }, [])

  const loadClassroomsWithSoftware = async () => {
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
      console.log('Authenticated user:', user.email)
      
      // First, get all computer classrooms
      const { data: classroomData, error: classroomError } = await supabase
        .from('classrooms')
        .select('id, code, name, building, floor, capacity')
        .eq('type', CLASSROOM_TYPES.INFORMATICA)
        .order('building')
        .order('floor')
        .order('code')

      if (classroomError) {
        console.error('Error loading classrooms:', classroomError)
        setError('Error carregant les aules')
        return
      }
      
      console.log('Found classrooms:', classroomData?.length || 0)

      // Get software data for each classroom using the same pattern as software-selector
      const classroomsWithSoftware = await Promise.all(
        (classroomData || []).map(async (classroom) => {
          try {
            // Load software assigned to this classroom
            const { data: assignedData, error: assignedError } = await supabase
              .from('classroom_software')
              .select('software_id, licenses')
              .eq('classroom_id', classroom.id)

            if (assignedError) {
              console.error(`Error loading software for classroom ${classroom.code}:`, assignedError)
              return { ...classroom, software: [] }
            }

            // Get full software details
            if (assignedData && assignedData.length > 0) {
              const softwareIds = assignedData.map(a => a.software_id)
              const { data: softwareData, error: softwareError } = await supabase
                .from('software')
                .select('id, name, version')
                .in('id', softwareIds)
                .order('name')

              if (softwareError) {
                console.error(`Error loading software details for classroom ${classroom.code}:`, softwareError)
                return { ...classroom, software: [] }
              }

              // Combine software data with license info
              const softwareWithLicenses = (softwareData || []).map(software => {
                const assignment = assignedData.find(a => a.software_id === software.id)
                return {
                  id: software.id,
                  name: software.name,
                  version: software.version,
                  licenses: assignment?.licenses || 1
                }
              })

              return { ...classroom, software: softwareWithLicenses }
            }

            return { ...classroom, software: [] }
          } catch (error) {
            console.error(`Unexpected error for classroom ${classroom.code}:`, error)
            return { ...classroom, software: [] }
          }
        })
      )

      setClassrooms(classroomsWithSoftware)
    } catch (error) {
      console.error('Error loading classrooms:', error)
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
        <Link href="/aules" className="mt-4 inline-block">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tornar a aules
          </Button>
        </Link>
      </div>
    )
  }

  return (
    <>
      {/* Screen view header - hidden on print */}
      <div className="print:hidden mb-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/aules">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Tornar a aules
              </Button>
            </Link>
            <h1 className="text-2xl font-bold">Llistat de Software per Aules d'Informàtica</h1>
          </div>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
        </div>
        <p className="text-muted-foreground">
          Aquest document mostra el software instal·lat a cada aula d'informàtica amb el número de llicències disponibles.
        </p>
      </div>

      {/* Print content */}
      <div className="print:block">
        {/* Print header - only visible on print */}
        <div className="hidden print:block mb-8">
          <div className="text-center mb-4">
            <h1 className="text-2xl font-bold">BAU, Centre Universitari d'Arts i Disseny</h1>
            <h2 className="text-xl mt-2">Llistat de Software - Aules d'Informàtica</h2>
            <p className="text-sm text-gray-600 mt-2">{currentDate}</p>
          </div>
        </div>

        {/* Classrooms list */}
        <div className="space-y-6">
          {classrooms.map((classroom, index) => (
            <div 
              key={classroom.id} 
              className={`${index > 0 ? 'break-before-auto' : ''} ${
                // Force page break if content is too long
                classroom.software.length > 15 ? 'break-after-page' : ''
              }`}
            >
              <div className="border rounded-lg p-4 print:border-gray-400">
                {/* Classroom header */}
                <div className="mb-3 pb-2 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg">
                        Aula {classroom.code} - {classroom.name}
                      </h3>
                      <p className="text-sm text-gray-600">
                        Edifici {classroom.building} - Planta {classroom.floor} - Capacitat: {classroom.capacity} alumnes
                      </p>
                    </div>
                    <div className="text-sm text-gray-600">
                      {classroom.software.length} programes
                    </div>
                  </div>
                </div>

                {/* Software list */}
                {classroom.software.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1 print:grid-cols-2">
                    {classroom.software.map((software) => (
                      <div key={software.id} className="flex justify-between py-1 text-sm">
                        <span className="font-medium">
                          {software.name}
                          {software.version && (
                            <span className="text-gray-500 ml-1">v{software.version}</span>
                          )}
                        </span>
                        <span className="text-gray-600">
                          {software.licenses} {software.licenses === 1 ? 'llicència' : 'llicències'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">No hi ha software assignat a aquesta aula</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Print footer - only visible on print */}
        <div className="hidden print:block mt-12 pt-4 border-t text-center text-xs text-gray-500">
          <p>Document generat automàticament - BAU Assist</p>
        </div>
      </div>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 2cm;
          }
          
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          
          .break-after-page {
            break-after: page;
            page-break-after: always;
          }
          
          .break-before-auto {
            break-before: auto;
            page-break-before: auto;
          }
          
          /* Ensure borders and backgrounds print */
          * {
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
        }
      `}</style>
    </>
  )
}