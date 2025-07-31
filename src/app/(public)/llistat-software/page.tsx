'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Monitor, Building2, Info } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

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

export default function SoftwareListPage() {
  const [classroomsWithSoftware, setClassroomsWithSoftware] = useState<ClassroomWithSoftware[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    loadClassroomRequirements()
  }, [])

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
      </div>

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
                  const licenseColors = {
                    'paid': 'bg-red-100 text-red-700',
                    'educational': 'bg-blue-100 text-blue-700',
                    'free': 'bg-green-100 text-green-700',
                    'open_source': 'bg-purple-100 text-purple-700'
                  }
                  const colorClass = licenseColors[software.license_type as keyof typeof licenseColors] || 'bg-gray-100 text-gray-700'
                  
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
                        {software.license_type === 'paid' && 'Pagament'}
                        {software.license_type === 'educational' && 'Educatiu'}
                        {software.license_type === 'free' && 'Gratuït'}
                        {software.license_type === 'open_source' && 'Codi Obert'}
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