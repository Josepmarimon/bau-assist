'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Search, Monitor, MapPin, Building2, List } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { WeeklyScheduleMini } from '@/components/classrooms/weekly-schedule-mini'

interface Software {
  id: string
  name: string
  version?: string
  license_type: string
  category: string
}

interface ClassroomWithSoftware {
  classroom_id: string
  classroom_code: string
  classroom_name: string
  building: string
  software_id: string
  software_name: string
  software_version?: string
  license_type: string
  is_installed: boolean
}

const getLicenseTypeName = (type: string): string => {
  const types: Record<string, string> = {
    'paid': 'De pagament',
    'educational': 'Educatiu',
    'free': 'Gratuït',
    'open_source': 'Codi obert'
  }
  return types[type] || type
}

const getLicenseTypeColor = (type: string): string => {
  const colors: Record<string, string> = {
    'paid': 'bg-red-100 text-red-800',
    'educational': 'bg-blue-100 text-blue-800',
    'free': 'bg-green-100 text-green-800',
    'open_source': 'bg-purple-100 text-purple-800'
  }
  return colors[type] || 'bg-gray-100 text-gray-800'
}

export default function SoftwareSearchPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [allSoftware, setAllSoftware] = useState<Software[]>([])
  const [filteredSoftware, setFilteredSoftware] = useState<Software[]>([])
  const [selectedSoftware, setSelectedSoftware] = useState<Software | null>(null)
  const [classrooms, setClassrooms] = useState<ClassroomWithSoftware[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingClassrooms, setLoadingClassrooms] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadSoftware()
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

  const loadSoftware = async () => {
    try {
      const { data, error } = await supabase
        .from('software')
        .select('*')
        .order('name')

      if (error) throw error
      setAllSoftware(data || [])
    } catch (error) {
      console.error('Error loading software:', error)
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
      setClassrooms(data || [])
    } catch (error) {
      console.error('Error loading classrooms:', error)
    } finally {
      setLoadingClassrooms(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Cerca de software</h1>
          <Link href="/llistat-software">
            <Button variant="outline">
              <List className="h-4 w-4 mr-2" />
              Veure tot el software per aula
            </Button>
          </Link>
        </div>
        <p className="text-gray-600 mb-6">
          Busca un software per veure en quines aules està instal·lat
        </p>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <Input
            type="text"
            placeholder="Buscar software (ex: Photoshop, Blender, AutoCAD...)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 text-lg"
          />
        </div>
      </div>

      {/* Software search results */}
      {searchTerm && filteredSoftware.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">
            Resultats ({filteredSoftware.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredSoftware.map((software) => (
              <Card 
                key={software.id} 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedSoftware?.id === software.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => loadClassroomsForSoftware(software)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Monitor className="h-4 w-4" />
                        {software.name}
                      </CardTitle>
                      {software.version && (
                        <CardDescription>Versió {software.version}</CardDescription>
                      )}
                    </div>
                    <Badge className={getLicenseTypeColor(software.license_type)}>
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
      {searchTerm && filteredSoftware.length === 0 && !loading && (
        <div className="text-center py-12">
          <Monitor className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            No s'ha trobat cap software amb "{searchTerm}"
          </p>
        </div>
      )}

      {/* Classrooms where software is installed */}
      {selectedSoftware && (
        <div className="mt-8">
          <h2 className="text-2xl font-semibold mb-4">
            Aules amb {selectedSoftware.name}
          </h2>
          
          {loadingClassrooms ? (
            <div className="text-center py-8">
              <p>Carregant aules...</p>
            </div>
          ) : classrooms.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {classrooms.map((classroom) => (
                <Link
                  key={classroom.classroom_id}
                  href={`/directori-aules/${classroom.classroom_code}`}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Aula {classroom.classroom_code}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Building2 className="h-3 w-3" />
                        {classroom.building}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-600">
                        {classroom.classroom_name}
                      </p>
                      <div className="pt-2">
                        <WeeklyScheduleMini classroomId={classroom.classroom_id} />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">
                Aquest software no està instal·lat en cap aula
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}