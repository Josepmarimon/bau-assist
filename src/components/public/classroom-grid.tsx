'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CLASSROOM_TYPE_LABELS } from '@/lib/constants/classroom-types'
import { MapPin, Users, Search, Filter, Building2 } from 'lucide-react'
import Image from 'next/image'

interface ClassroomGridProps {
  classrooms: any[]
}

export function ClassroomGrid({ classrooms }: ClassroomGridProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterBuilding, setFilterBuilding] = useState<string>('all')

  // Get unique buildings
  const buildings = Array.from(new Set(classrooms.map(c => c.building).filter(Boolean)))

  // Filter classrooms
  const filteredClassrooms = classrooms.filter(classroom => {
    const matchesSearch = searchTerm === '' || 
      classroom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      classroom.code.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesType = filterType === 'all' || classroom.type === filterType
    const matchesBuilding = filterBuilding === 'all' || classroom.building === filterBuilding

    return matchesSearch && matchesType && matchesBuilding
  })

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Taller': return 'bg-orange-100 text-orange-800'
      case 'Informàtica': return 'bg-blue-100 text-blue-800'
      case 'Polivalent': return 'bg-green-100 text-green-800'
      case 'Projectes': return 'bg-purple-100 text-purple-800'
      case 'Seminari': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getFirstPhoto = (photos: any) => {
    if (!photos || !Array.isArray(photos) || photos.length === 0) return null
    return photos[0]
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white border-gray-200 border rounded-lg shadow-sm p-6">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar per nom o codi..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger>
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tots els tipus" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els tipus</SelectItem>
              {Object.entries(CLASSROOM_TYPE_LABELS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterBuilding} onValueChange={setFilterBuilding}>
            <SelectTrigger>
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Tots els edificis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els edificis</SelectItem>
              {buildings.map(building => (
                <SelectItem key={building} value={building}>
                  {building}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Classroom Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filteredClassrooms.map((classroom) => {
          const firstPhoto = getFirstPhoto(classroom.photos)
          
          return (
            <Link 
              key={classroom.id} 
              href={`/directori-aules/${encodeURIComponent(classroom.code)}`}
              className="group"
            >
              <Card className="h-full transition-all hover:shadow-lg hover:-translate-y-1 overflow-hidden bg-white border-gray-200">
                {/* Image or placeholder */}
                <div className="aspect-video relative bg-secondary/10">
                  {firstPhoto ? (
                    <Image
                      src={firstPhoto.url}
                      alt={classroom.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Building2 className="h-16 w-16 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <Badge className={getTypeColor(classroom.type)}>
                      {CLASSROOM_TYPE_LABELS[classroom.type as keyof typeof CLASSROOM_TYPE_LABELS] || classroom.type}
                    </Badge>
                  </div>
                </div>

                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                      {classroom.name}
                    </h3>
                    <Badge variant="outline">{classroom.code}</Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      <span>{classroom.capacity} persones</span>
                    </div>
                    {classroom.building && (
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{classroom.building}</span>
                        {classroom.floor !== null && (
                          <span>, Planta {classroom.floor}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Equipment preview */}
                  {classroom.equipment_inventory && classroom.equipment_inventory.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {classroom.equipment_inventory.slice(0, 3).map((item: any, index: number) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {item.equipment_types?.name}
                        </Badge>
                      ))}
                      {classroom.equipment_inventory.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{classroom.equipment_inventory.length - 3} més
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {/* No results message */}
      {filteredClassrooms.length === 0 && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            No s'han trobat aules amb els filtres seleccionats
          </p>
        </div>
      )}
    </div>
  )
}