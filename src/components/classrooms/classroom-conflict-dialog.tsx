'use client'

import React, { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Separator } from '@/components/ui/separator'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { 
  AlertTriangle, 
  Building2, 
  Users, 
  Monitor,
  Projector,
  Wifi,
  Search,
  CheckCircle2,
  XCircle,
  Laptop,
  Tv,
  Filter,
  Package,
  MapPin
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConflictingAssignment {
  assignment_id: string
  subject_name: string
  group_code: string
  conflicting_weeks: number[]
}

interface Classroom {
  id: string
  code: string
  name: string
  capacity: number
  type: string | null
  building: string | null
}

interface EquipmentType {
  id: string
  name: string
  category: string
}

interface Software {
  id: string
  name: string
  version?: string
  category: string
}

interface ClassroomWithAvailability extends Classroom {
  isAvailable: boolean
  equipment?: EquipmentType[]
  software?: Software[]
}

interface ClassroomConflictDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  conflicts: ConflictingAssignment[]
  selectedClassroom: Classroom
  onAcceptOverlap: () => void
  onSelectAlternative: (classroomId: string) => void
  timeSlotId: string
  semesterId: string
}

export function ClassroomConflictDialog({
  open,
  onOpenChange,
  conflicts,
  selectedClassroom,
  onAcceptOverlap,
  onSelectAlternative,
  timeSlotId,
  semesterId
}: ClassroomConflictDialogProps) {
  const supabase = createClient()
  const [alternatives, setAlternatives] = useState<ClassroomWithAvailability[]>([])
  const [loading, setLoading] = useState(false)
  
  // Available options
  const [classroomTypes, setClassroomTypes] = useState<string[]>([])
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentType[]>([])
  const [availableSoftware, setAvailableSoftware] = useState<Software[]>([])
  
  const [filters, setFilters] = useState({
    type: 'all',
    minCapacity: 0,
    selectedEquipment: [] as string[],
    selectedSoftware: [] as string[]
  })
  
  const [softwareSearchTerm, setSoftwareSearchTerm] = useState('')

  useEffect(() => {
    if (open) {
      loadFilterOptions()
      searchAlternatives()
    }
  }, [open])

  useEffect(() => {
    if (open) {
      searchAlternatives()
    }
  }, [filters])

  const loadFilterOptions = async () => {
    try {
      // Load classroom types
      const { data: typesData } = await supabase
        .from('classrooms')
        .select('type')
        .not('type', 'is', null)
        .order('type')
      
      if (typesData) {
        const uniqueTypes = [...new Set(typesData.map(t => t.type).filter(Boolean))] as string[]
        setClassroomTypes(uniqueTypes)
      }

      // Load equipment types
      const { data: equipmentData, error: equipError } = await supabase
        .from('equipment_types')
        .select('id, name, category')
        .order('name')
      
      if (equipError) {
        console.error('Error loading equipment types:', equipError)
      }
      
      if (equipmentData) {
        setAvailableEquipment(equipmentData)
      }

      // Load software
      const { data: softwareData } = await supabase
        .from('software')
        .select('id, name, version, category')
        .order('name')
      
      if (softwareData) {
        setAvailableSoftware(softwareData)
      }
    } catch (error) {
      console.error('Error loading filter options:', error)
    }
  }

  const searchAlternatives = async () => {
    setLoading(true)
    try {
      // Get all classrooms
      let query = supabase
        .from('classrooms')
        .select('*')
        .order('code')

      // Apply type filter
      if (filters.type && filters.type !== 'all') {
        query = query.eq('type', filters.type)
      }

      // Apply capacity filter
      if (filters.minCapacity > 0) {
        query = query.gte('capacity', filters.minCapacity)
      }

      const { data: classrooms, error } = await query

      if (error) {
        console.error('Error loading classrooms:', error)
        return
      }

      if (!classrooms) return

      // Check availability and equipment/software for each classroom
      const classroomsWithAvailability = await Promise.all(
        classrooms.map(async (classroom) => {
          let equipment: EquipmentType[] = []
          let software: Software[] = []
          
          // Load equipment for this classroom
          if (filters.selectedEquipment.length > 0) {
            const { data: classroomEquipment, error: equipError } = await supabase
              .from('classroom_equipment')
              .select('equipment_type_id')
              .eq('classroom_id', classroom.id)
            
            if (equipError) {
              console.error('Error loading classroom equipment:', equipError)
            }
            
            if (classroomEquipment && classroomEquipment.length > 0) {
              const equipmentIds = classroomEquipment.map(ce => ce.equipment_type_id)
              const { data: equipmentTypes } = await supabase
                .from('equipment_types')
                .select('id, name, category')
                .in('id', equipmentIds)
              
              if (equipmentTypes) {
                equipment = equipmentTypes
              }
            }
          }
          
          // Load software for this classroom
          if (filters.selectedSoftware.length > 0) {
            const { data: classroomSoftware, error: softError } = await supabase
              .from('classroom_software')
              .select('software_id')
              .eq('classroom_id', classroom.id)
            
            if (softError) {
              console.error('Error loading classroom software:', softError)
            }
            
            if (classroomSoftware && classroomSoftware.length > 0) {
              const softwareIds = classroomSoftware.map(cs => cs.software_id)
              const { data: softwareData } = await supabase
                .from('software')
                .select('id, name, version, category')
                .in('id', softwareIds)
              
              if (softwareData) {
                software = softwareData
              }
            }
          }
          
          // Check if classroom has all required equipment
          const hasAllEquipment = filters.selectedEquipment.length === 0 || 
            filters.selectedEquipment.every(reqId => 
              equipment.some(e => e.id === reqId)
            )
          
          // Check if classroom has all required software
          const hasAllSoftware = filters.selectedSoftware.length === 0 || 
            filters.selectedSoftware.every(reqId => 
              software.some(s => s.id === reqId)
            )

          // Skip if doesn't meet requirements
          if (!hasAllEquipment || !hasAllSoftware) {
            return null
          }

          // Check conflicts for this classroom
          const allWeeks = Array.from({ length: 15 }, (_, i) => i + 1)
          const { data: conflicts } = await supabase
            .rpc('check_classroom_week_conflicts', {
              p_classroom_id: classroom.id,
              p_time_slot_id: timeSlotId,
              p_week_numbers: allWeeks,
              p_exclude_assignment_id: null,
              p_semester_id: semesterId
            })

          return {
            ...classroom,
            equipment,
            software,
            isAvailable: !conflicts || conflicts.length === 0
          } as ClassroomWithAvailability
        })
      )

      // Filter out nulls and sort by availability
      const validClassrooms = classroomsWithAvailability
        .filter(c => c !== null) as ClassroomWithAvailability[]
      
      // Sort: available first, then by code
      validClassrooms.sort((a, b) => {
        if (a.isAvailable !== b.isAvailable) {
          return a.isAvailable ? -1 : 1
        }
        return a.code.localeCompare(b.code)
      })

      setAlternatives(validClassrooms)
    } catch (error) {
      console.error('Error searching alternatives:', error)
    } finally {
      setLoading(false)
    }
  }

  const getEquipmentIcon = (equipment: string) => {
    const name = equipment.toLowerCase()
    if (name.includes('projector') || name.includes('projector')) return <Projector className="h-3 w-3" />
    if (name.includes('ordinador') || name.includes('computer')) return <Monitor className="h-3 w-3" />
    if (name.includes('wifi')) return <Wifi className="h-3 w-3" />
    if (name.includes('tv') || name.includes('pantalla')) return <Tv className="h-3 w-3" />
    if (name.includes('portàtil') || name.includes('laptop')) return <Laptop className="h-3 w-3" />
    return <Building2 className="h-3 w-3" />
  }

  const getBuildingBadge = (building: string | null, code?: string) => {
    if (building) {
      if (building.includes('Pujades')) return 'P'
      if (building.includes('Llacuna')) return 'L'
      if (building.includes('Granada')) return 'G'
      return building.charAt(0).toUpperCase()
    }
    if (code) {
      const prefix = code.split('.')[0]
      if (prefix) return prefix.toUpperCase()
    }
    return '?'
  }

  const toggleEquipment = (equipmentId: string) => {
    setFilters(prev => ({
      ...prev,
      selectedEquipment: prev.selectedEquipment.includes(equipmentId)
        ? prev.selectedEquipment.filter(id => id !== equipmentId)
        : [...prev.selectedEquipment, equipmentId]
    }))
  }

  const toggleSoftware = (softwareId: string) => {
    setFilters(prev => ({
      ...prev,
      selectedSoftware: prev.selectedSoftware.includes(softwareId)
        ? prev.selectedSoftware.filter(id => id !== softwareId)
        : [...prev.selectedSoftware, softwareId]
    }))
  }

  const availableCount = alternatives.filter(a => a.isAvailable).length
  const totalCount = alternatives.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl h-[85vh] p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Conflicte d'Aula Detectat
          </DialogTitle>
          <DialogDescription>
            L'aula <span className="font-semibold">{selectedClassroom.name}</span> ja està ocupada en aquest horari
          </DialogDescription>
        </DialogHeader>

        <div className="flex h-[calc(85vh-8rem)]">
          {/* Left Column - Filters and Conflict Info */}
          <div className="w-1/3 border-r bg-gray-50/50 p-4 overflow-y-auto">
            {/* Conflict Details */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
              <h4 className="font-medium text-sm mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Ocupada per:
              </h4>
              <div className="space-y-1">
                {conflicts.map((conflict, idx) => (
                  <div key={idx} className="text-sm text-muted-foreground">
                    • {conflict.subject_name}
                    <span className="text-xs ml-1">({conflict.group_code})</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="my-4" />

            {/* Filters */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtres de Cerca
              </h4>
              
              {/* Type Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipus d'Aula</label>
                <Select
                  value={filters.type}
                  onValueChange={(value) => setFilters(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Tots els tipus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tots els tipus</SelectItem>
                    {classroomTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Software Filter */}
              {availableSoftware.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Software</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Buscar software..."
                      value={softwareSearchTerm}
                      onChange={(e) => setSoftwareSearchTerm(e.target.value)}
                      className="pl-9 mb-2"
                    />
                  </div>
                  <ScrollArea className="h-40 rounded border bg-white p-3">
                    <div className="space-y-2">
                      {availableSoftware
                        .filter(software => 
                          software.name.toLowerCase().includes(softwareSearchTerm.toLowerCase()) ||
                          (software.category && software.category.toLowerCase().includes(softwareSearchTerm.toLowerCase()))
                        )
                        .map(software => (
                          <div key={software.id} className="flex items-center space-x-2">
                            <Checkbox
                              id={`software-${software.id}`}
                              checked={filters.selectedSoftware.includes(software.id)}
                              onCheckedChange={() => toggleSoftware(software.id)}
                            />
                            <label
                              htmlFor={`software-${software.id}`}
                              className="text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1 cursor-pointer flex-1"
                            >
                              <Package className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{software.name}</span>
                              {software.version && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  v{software.version}
                                </span>
                              )}
                            </label>
                          </div>
                        ))}
                      {availableSoftware.filter(software => 
                        software.name.toLowerCase().includes(softwareSearchTerm.toLowerCase()) ||
                        (software.category && software.category.toLowerCase().includes(softwareSearchTerm.toLowerCase()))
                      ).length === 0 && (
                        <div className="text-center py-4 text-sm text-muted-foreground">
                          No s'ha trobat cap software
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Equipment Filter */}
              {availableEquipment.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Equipament</label>
                  <ScrollArea className="h-40 rounded border bg-white p-3">
                    <div className="space-y-2">
                      {availableEquipment.map(equipment => (
                        <div key={equipment.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`equipment-${equipment.id}`}
                            checked={filters.selectedEquipment.includes(equipment.id)}
                            onCheckedChange={() => toggleEquipment(equipment.id)}
                          />
                          <label
                            htmlFor={`equipment-${equipment.id}`}
                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex items-center gap-1 cursor-pointer"
                          >
                            {getEquipmentIcon(equipment.name)}
                            {equipment.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Search Results */}
          <div className="flex-1 flex flex-col">
            {/* Results Header */}
            <div className="px-6 py-4 border-b bg-white">
              <div className="flex items-center justify-between">
                <h4 className="font-medium flex items-center gap-2">
                  <Search className="h-4 w-4" />
                  Aules Alternatives
                </h4>
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    {availableCount} disponibles
                  </Badge>
                  <Badge variant="outline" className="gap-1">
                    <XCircle className="h-3 w-3 text-gray-400" />
                    {totalCount - availableCount} ocupades
                  </Badge>
                </div>
              </div>
            </div>

            {/* Results List */}
            <ScrollArea className="flex-1 p-4">
              <div className="grid gap-3">
                {loading ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <div className="inline-flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                      Buscant aules...
                    </div>
                  </div>
                ) : alternatives.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <Building2 className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No s'han trobat aules amb els filtres seleccionats</p>
                  </div>
                ) : (
                  alternatives.map((classroom) => (
                    <button
                      key={classroom.id}
                      onClick={() => onSelectAlternative(classroom.id)}
                      disabled={!classroom.isAvailable}
                      className={cn(
                        "w-full text-left p-4 rounded-lg border transition-all",
                        classroom.isAvailable
                          ? "hover:bg-accent hover:border-primary cursor-pointer bg-white"
                          : "opacity-60 cursor-not-allowed bg-gray-50"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                          {/* Header */}
                          <div className="flex items-center gap-3">
                            <span className="font-medium text-base">{classroom.name}</span>
                            {classroom.isAvailable ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          
                          {/* Details */}
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              <Badge variant="outline" className="text-xs">
                                {getBuildingBadge(classroom.building, classroom.code)}
                              </Badge>
                            </div>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {classroom.capacity} places
                            </span>
                            {classroom.type && (
                              <span className="flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {classroom.type}
                              </span>
                            )}
                          </div>

                          {/* Equipment/Software badges */}
                          {((classroom.equipment?.length ?? 0) > 0 || (classroom.software?.length ?? 0) > 0) && (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {classroom.equipment?.slice(0, 3).map((eq, idx) => (
                                <Badge key={idx} variant="secondary" className="text-xs">
                                  {getEquipmentIcon(eq.name)}
                                  <span className="ml-1">{eq.name}</span>
                                </Badge>
                              ))}
                              {classroom.software?.slice(0, 2).map((sw, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs">
                                  <Package className="h-3 w-3 mr-1" />
                                  {sw.name}
                                </Badge>
                              ))}
                              {((classroom.equipment?.length || 0) > 3 || (classroom.software?.length || 0) > 2) && (
                                <Badge variant="outline" className="text-xs">
                                  +{(classroom.equipment?.length || 0) + (classroom.software?.length || 0) - 5} més
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-sm font-medium">
                          {classroom.isAvailable ? (
                            <span className="text-green-600">Disponible</span>
                          ) : (
                            <span className="text-red-600">Ocupada</span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel·lar
          </Button>
          <Button
            variant="secondary"
            onClick={onAcceptOverlap}
            className="gap-2"
          >
            <AlertTriangle className="h-4 w-4" />
            Acceptar Solapament
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}