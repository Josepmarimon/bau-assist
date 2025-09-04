'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PhotoGallery } from '@/components/classrooms/photo-gallery'
import { Building2, Users, MapPin, Monitor, Wifi, Clock, Calendar, GraduationCap } from 'lucide-react'
import { CLASSROOM_TYPE_LABELS } from '@/lib/constants/classroom-types'
import { createClient } from '@/lib/supabase/client'
import { EquipmentWithType } from '@/types/equipment.types'
import { EQUIPMENT_CATEGORIES } from '@/lib/constants/equipment-types'
import * as Icons from 'lucide-react'

interface ClassroomDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classroom?: any
}

interface SoftwareWithSubjects {
  id: string
  name: string
  version: string | null
  category: string
  license_type: string
  isInstalled: boolean
  subjects: Array<{
    id: string
    name: string
    code: string
    is_required: boolean
  }>
}

interface Assignment {
  id: string
  hours_per_week: number
  subject: {
    id: string
    name: string
    code: string
  }
  subject_group: {
    id: string
    name: string
  }
  teacher: {
    id: string
    first_name: string
    last_name: string
  } | null
  teachers: {
    id: string
    first_name: string
    last_name: string
  }[]
  student_group: {
    id: string
    name: string
  } | null
  time_slot: {
    id: string
    day_of_week: number
    start_time: string
    end_time: string
    slot_type: string
  } | null
  semester: {
    id: string
    name: string
    academic_year: string
  }
}

export function ClassroomDetailsDialog({ 
  open, 
  onOpenChange, 
  classroom
}: ClassroomDetailsDialogProps) {
  const [equipment, setEquipment] = useState<EquipmentWithType[]>([])
  const [loadingEquipment, setLoadingEquipment] = useState(false)
  const [softwareList, setSoftwareList] = useState<SoftwareWithSubjects[]>([])
  const [loadingSoftware, setLoadingSoftware] = useState(false)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (classroom && open) {
      fetchEquipment()
      fetchSoftware()
      fetchAssignments()
    }
  }, [classroom, open])

  const fetchEquipment = async () => {
    if (!classroom) return
    
    setLoadingEquipment(true)
    try {
      const { data, error } = await supabase
        .from('equipment_inventory')
        .select('*, equipment_type:equipment_types(*)')
        .eq('classroom_id', classroom.id)
        .order('equipment_type(category)', { ascending: true })

      if (error) throw error
      setEquipment(data || [])
    } catch (error) {
      console.error('Error fetching equipment:', error)
    } finally {
      setLoadingEquipment(false)
    }
  }

  const fetchSoftware = async () => {
    if (!classroom) return
    
    setLoadingSoftware(true)
    try {
      // 1. Obtenir el software instal·lat a l'aula
      const { data: installedData, error: installedError } = await supabase
        .from('software_classrooms')
        .select(`
          software:software_id (*)
        `)
        .eq('classroom_id', classroom.id)

      if (installedError) {
        console.error('Error fetching installed software:', installedError)
      }

      const installedSoftware = (installedData || []).map(item => item.software).filter(Boolean)
      const installedIds = new Set(installedSoftware.map((s: any) => s.id))

      // 2. Obtenir les assignacions d'aquesta aula
      const { data: acData } = await supabase
        .from('assignment_classrooms')
        .select('assignment_id')
        .eq('classroom_id', classroom.id)

      if (!acData || acData.length === 0) {
        // Si no hi ha assignacions, només mostrem el software instal·lat
        setSoftwareList(installedSoftware.map((s: any) => ({
          ...s,
          isInstalled: true,
          subjects: []
        })))
        return
      }

      // 3. Obtenir els subjects de les assignacions
      const { data: assignmentsData } = await supabase
        .from('assignments')
        .select('subject_id')
        .in('id', acData.map(ac => ac.assignment_id))

      const subjectIds = [...new Set(assignmentsData?.map(a => a.subject_id) || [])]

      // 4. Obtenir el software requerit per aquests subjects
      const { data: subjectSoftwareData } = await supabase
        .from('subject_software')
        .select(`
          software:software_id (*),
          subject:subject_id (id, name, code),
          is_required
        `)
        .in('subject_id', subjectIds)

      // 5. Combinar la informació
      const softwareMap = new Map()

      // Afegir software requerit
      if (subjectSoftwareData) {
        subjectSoftwareData.forEach(item => {
          if (!item.software) return
          
          const id = (item.software as any).id
          if (!softwareMap.has(id)) {
            softwareMap.set(id, {
              ...item.software,
              isInstalled: installedIds.has(id),
              subjects: []
            })
          }
          
          if (item.subject) {
            softwareMap.get(id)!.subjects.push({
              ...item.subject,
              is_required: item.is_required
            })
          }
        })
      }

      // Afegir software instal·lat que no és requerit
      installedSoftware.forEach((software: any) => {
        if (!softwareMap.has(software.id)) {
          softwareMap.set(software.id, {
            ...software,
            isInstalled: true,
            subjects: []
          })
        }
      })

      setSoftwareList(Array.from(softwareMap.values()))
    } catch (error) {
      console.error('Error fetching software:', error)
      setSoftwareList([])
    } finally {
      setLoadingSoftware(false)
    }
  }

  const handleInstallSoftware = async (softwareId: string) => {
    try {
      const { error } = await supabase
        .from('software_classrooms')
        .insert({
          software_id: softwareId,
          classroom_id: classroom.id
        })

      if (error) throw error

      // Actualitzar la llista local
      setSoftwareList(prev => 
        prev.map(s => s.id === softwareId ? { ...s, isInstalled: true } : s)
      )
    } catch (error) {
      console.error('Error installing software:', error)
    }
  }

  const handleUninstallSoftware = async (softwareId: string) => {
    try {
      const { error } = await supabase
        .from('software_classrooms')
        .delete()
        .eq('software_id', softwareId)
        .eq('classroom_id', classroom.id)

      if (error) throw error

      // Actualitzar la llista local
      setSoftwareList(prev => 
        prev.map(s => s.id === softwareId ? { ...s, isInstalled: false } : s)
      )
    } catch (error) {
      console.error('Error uninstalling software:', error)
    }
  }

  const fetchAssignments = async () => {
    if (!classroom) return
    
    console.log('Fetching assignments for classroom:', classroom)
    setLoadingAssignments(true)
    try {
      // Primer obtenim les assignacions que estan a assignment_classrooms per aquesta aula
      const { data: assignmentClassrooms, error: acError } = await supabase
        .from('assignment_classrooms')
        .select('assignment_id')
        .eq('classroom_id', classroom.id)

      if (acError) {
        console.error('Error fetching assignment_classrooms:', acError)
        throw acError
      }

      if (!assignmentClassrooms || assignmentClassrooms.length === 0) {
        console.log('No assignments found for classroom:', classroom.id)
        setAssignments([])
        return
      }

      const assignmentIds = assignmentClassrooms.map(ac => ac.assignment_id)
      console.log('Found assignment IDs:', assignmentIds)

      // Ara obtenim les assignacions bàsiques
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('assignments')
        .select('*')
        .in('id', assignmentIds)

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError)
        throw assignmentsError
      }

      console.log('Fetched basic assignments:', assignmentsData)

      // Per cada assignació, obtenim les dades relacionades
      const enrichedAssignments = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          try {
            const result: any = {
              id: assignment.id,
              hours_per_week: assignment.hours_per_week,
              subject: null,
              subject_group: null,
              teacher: null,
              teachers: [],
              student_group: null,
              time_slot: null,
              semester: null
            }

            // Obtenim cada dada de manera individual amb gestió d'errors
            
            // Subject
            if (assignment.subject_id) {
              const { data, error } = await supabase
                .from('subjects')
                .select('id, name, code')
                .eq('id', assignment.subject_id)
                .maybeSingle()
              
              if (!error && data) {
                result.subject = data
              } else if (error) {
                console.error('Error fetching subject:', error)
              }
            }

            // Subject Group
            if (assignment.subject_group_id) {
              const { data, error } = await supabase
                .from('subject_groups')
                .select('*')
                .eq('id', assignment.subject_group_id)
                .maybeSingle()
              
              if (!error && data) {
                result.subject_group = { id: data.id, name: data.group_code || 'Grup ' + (data.id || '').substring(0, 8) }
              } else if (error) {
                console.error('Error fetching subject_group:', error)
              }
            }

            // Teacher (single - for backward compatibility)
            if (assignment.teacher_id) {
              const { data, error } = await supabase
                .from('teachers')
                .select('id, first_name, last_name')
                .eq('id', assignment.teacher_id)
                .maybeSingle()
              
              if (!error && data) {
                result.teacher = data
              }
            }
            
            // Teachers (multiple from teacher_group_assignments)
            if (assignment.subject_group_id) {
              const { data: teacherAssignments, error } = await supabase
                .from('teacher_group_assignments')
                .select(`
                  teachers!teacher_id (id, first_name, last_name)
                `)
                .eq('subject_group_id', assignment.subject_group_id)
              
              if (!error && teacherAssignments) {
                result.teachers = teacherAssignments
                  .map(ta => ta.teachers)
                  .filter(Boolean)
              }
            }
            
            // If no teachers from group assignment, use single teacher
            if (result.teachers.length === 0 && result.teacher) {
              result.teachers = [result.teacher]
            }

            // Student Group
            if (assignment.student_group_id) {
              const { data, error } = await supabase
                .from('student_groups')
                .select('id, name')
                .eq('id', assignment.student_group_id)
                .maybeSingle()
              
              if (!error && data) {
                result.student_group = data
              }
            }

            // Time Slot
            if (assignment.time_slot_id) {
              const { data, error } = await supabase
                .from('time_slots')
                .select('id, day_of_week, start_time, end_time, slot_type')
                .eq('id', assignment.time_slot_id)
                .maybeSingle()
              
              if (!error && data) {
                result.time_slot = data
              }
            }

            // Semester amb Academic Year
            if (assignment.semester_id) {
              const { data, error } = await supabase
                .from('semesters')
                .select(`
                  id,
                  name,
                  academic_years!inner(name)
                `)
                .eq('id', assignment.semester_id)
                .maybeSingle()
              
              if (!error && data) {
                result.semester = { 
                  id: data.id, 
                  name: data.name || 'Sense nom',
                  academic_year: (data.academic_years as any)?.name || '2025-2026'
                }
              } else if (error) {
                console.error('Error fetching semester:', error)
                // Si falla, intentem obtenir només el semestre
                const { data: semesterData } = await supabase
                  .from('semesters')
                  .select('*')
                  .eq('id', assignment.semester_id)
                  .maybeSingle()
                
                if (semesterData) {
                  result.semester = {
                    id: semesterData.id,
                    name: semesterData.name || 'Semestre',
                    academic_year: '2025-2026'
                  }
                }
              }
            }

            return result
          } catch (err) {
            console.error('Error enriching assignment:', assignment.id, err)
            return null
          }
        })
      )

      // Filtrem els nulls
      const transformedData = enrichedAssignments.filter(a => a !== null && a.subject && a.semester)

      // Ordenem per any acadèmic i dia
      const sortedData = transformedData.sort((a, b) => {
        // Ordenar per any acadèmic (descendent)
        if (a.semester.academic_year !== b.semester.academic_year) {
          return b.semester.academic_year.localeCompare(a.semester.academic_year)
        }
        // Després per dia de la setmana
        if (a.time_slot && b.time_slot) {
          return a.time_slot.day_of_week - b.time_slot.day_of_week
        }
        return 0
      })

      console.log('Transformed and sorted assignments:', sortedData)
      setAssignments(sortedData)
    } catch (error) {
      console.error('Error in fetchAssignments:', error)
    } finally {
      setLoadingAssignments(false)
    }
  }

  if (!classroom) return null

  const formatBuildingName = (building: string | null): string => {
    if (!building) return '-'
    if (building === 'G') return 'Edifici Granada'
    return building
  }

  // Calculate free time slots
  const calculateFreeSlots = () => {
    const days = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']
    const timeSlots = [
      { start: '08:00', end: '11:00', label: 'Matí (8-11h)' },
      { start: '11:00', end: '14:00', label: 'Migdia (11-14h)' },
      { start: '15:00', end: '18:00', label: 'Tarda (15-18h)' },
      { start: '18:00', end: '21:00', label: 'Vespre (18-21h)' }
    ]
    
    const freeSlots: { day: string; slots: string[] }[] = []
    
    days.forEach((day, dayIndex) => {
      const daySlots: string[] = []
      
      timeSlots.forEach(slot => {
        const hasAssignment = assignments.some(assignment => {
          if (!assignment.time_slot) return false
          return assignment.time_slot.day_of_week === dayIndex + 1 &&
            assignment.time_slot.start_time >= slot.start &&
            assignment.time_slot.start_time < slot.end
        })
        
        if (!hasAssignment) {
          daySlots.push(slot.label)
        }
      })
      
      if (daySlots.length > 0) {
        freeSlots.push({ day, slots: daySlots })
      }
    })
    
    return freeSlots
  }

  const getIconComponent = (iconName?: string) => {
    if (!iconName) return null
    const Icon = Icons[iconName as keyof typeof Icons] as any
    return Icon && typeof Icon === 'function' ? <Icon className="h-4 w-4" /> : <Wifi className="h-4 w-4" />
  }

  const groupedEquipment = equipment.reduce((acc, item) => {
    const category = item.equipment_type?.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, EquipmentWithType[]>)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[95vw] w-full h-[95vh] max-h-[95vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-2xl">
            {classroom.name}
          </DialogTitle>
          <DialogDescription>
            Codi: {classroom.code}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="info" className="w-full flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-6 flex-shrink-0">
            <TabsTrigger value="info">Informació</TabsTrigger>
            <TabsTrigger value="schedule">Horari</TabsTrigger>
            <TabsTrigger value="assignments">Assignatures</TabsTrigger>
            <TabsTrigger value="photos">Fotos</TabsTrigger>
            <TabsTrigger value="equipment">Equipament</TabsTrigger>
            <TabsTrigger value="software">Software</TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="mt-6 flex-1 overflow-y-auto">
            <div className="grid gap-6 p-4">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Edifici</p>
                      <p className="text-sm text-muted-foreground">
                        {formatBuildingName(classroom.building)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Planta</p>
                      <p className="text-sm text-muted-foreground">
                        {classroom.floor !== null ? `Planta ${classroom.floor}` : '-'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Capacitat</p>
                      <p className="text-sm text-muted-foreground">
                        {classroom.capacity} persones
                      </p>
                    </div>
                  </div>
                  
                  {(classroom.width || classroom.depth) && (
                    <div className="flex items-start gap-3">
                      <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Dimensions</p>
                        <p className="text-sm text-muted-foreground">
                          {classroom.width && classroom.depth ? (
                            `${classroom.width}m × ${classroom.depth}m (${(classroom.width * classroom.depth).toFixed(2)}m²)`
                          ) : classroom.width ? (
                            `Amplada: ${classroom.width}m`
                          ) : (
                            `Profunditat: ${classroom.depth}m`
                          )}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Tipus d'aula</p>
                    <Badge variant={classroom.type === 'informatica' ? 'default' : 'secondary'}>
                      {CLASSROOM_TYPE_LABELS[classroom.type as keyof typeof CLASSROOM_TYPE_LABELS] || classroom.type}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Estat</p>
                    <Badge variant={classroom.is_available ? 'default' : 'destructive'}>
                      {classroom.is_available ? 'Disponible' : 'No disponible'}
                    </Badge>
                  </div>
                  
                  {(classroom.type === 'informatica' || classroom.type === 'Informàtica') && classroom.operating_system && (
                    <div className="flex items-start gap-3">
                      <Monitor className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Sistema Operatiu</p>
                        <p className="text-sm text-muted-foreground">
                          {classroom.operating_system}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Free Time Slots */}
              <div className="border rounded-lg p-4 bg-muted/30">
                <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Franges horàries lliures
                </h3>
                <div className="space-y-2">
                  {calculateFreeSlots().length > 0 ? (
                    calculateFreeSlots().map(({ day, slots }) => (
                      <div key={day} className="flex items-start gap-2">
                        <span className="text-xs font-medium text-muted-foreground min-w-[70px]">
                          {day}:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {slots.map((slot) => (
                            <Badge 
                              key={`${day}-${slot}`} 
                              variant="secondary" 
                              className="text-xs px-2 py-0.5"
                            >
                              {slot}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      No hi ha franges lliures disponibles
                    </p>
                  )}
                </div>
              </div>

              {/* Timestamps */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Creat: {new Date(classroom.created_at).toLocaleDateString('ca-ES')}
                  </span>
                  {classroom.updated_at && (
                    <span>
                      • Actualitzat: {new Date(classroom.updated_at).toLocaleDateString('ca-ES')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="schedule" className="mt-6 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-4">
              {loadingAssignments ? (
                <div className="flex items-center justify-center h-[400px]">
                  <div className="text-muted-foreground flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                    Carregant horari...
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  <h3 className="text-lg font-medium">Ocupació setmanal</h3>
                  
                  {/* Schedule Grid */}
                  <div className="overflow-x-auto">
                    <div className="min-w-[900px]">
                      {/* Header */}
                      <div className="grid grid-cols-5 gap-1 mb-2">
                        {['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres'].map(day => (
                          <div key={day} className="text-center font-semibold text-sm border-r border-gray-200 last:border-r-0 py-2">
                            {day}
                          </div>
                        ))}
                      </div>
                      
                      {/* Time Grid */}
                      <div className="grid grid-cols-5 gap-1">
                        {[1, 2, 3, 4, 5].map(day => {
                          const dayAssignments = assignments.filter(assignment => 
                            assignment.time_slot && assignment.time_slot.day_of_week === day
                          )
                          
                          return (
                            <div key={day} className="bg-gray-50 rounded-lg p-1 h-[400px] relative border-r border-gray-200 last:border-r-0">
                              {/* Time labels */}
                              <div className="absolute inset-0 pointer-events-none">
                                <div className="absolute left-1 top-0 text-[10px] text-gray-400">
                                  8:00
                                </div>
                                <div className="absolute left-1 top-[50%] text-[10px] text-gray-400">
                                  14:00
                                </div>
                                <div className="absolute left-1 bottom-0 text-[10px] text-gray-400">
                                  20:00
                                </div>
                              </div>
                              
                              {/* Assignments */}
                              {dayAssignments.map(assignment => {
                                if (!assignment.time_slot || !assignment.time_slot.start_time || !assignment.time_slot.end_time) {
                                  return null
                                }
                                
                                const startHour = parseInt(assignment.time_slot.start_time.split(':')[0])
                                const endHour = parseInt(assignment.time_slot.end_time.split(':')[0])
                                const startMinutes = parseInt(assignment.time_slot.start_time.split(':')[1])
                                const endMinutes = parseInt(assignment.time_slot.end_time.split(':')[1])
                                
                                // Calculate position and height (8:00 to 20:00 = 12 hours)
                                const dayStart = 8 * 60 // 8:00 in minutes
                                const dayEnd = 20 * 60 // 20:00 in minutes
                                const totalMinutes = dayEnd - dayStart
                                
                                const assignmentStart = (startHour * 60 + startMinutes) - dayStart
                                const assignmentEnd = (endHour * 60 + endMinutes) - dayStart
                                
                                const top = (assignmentStart / totalMinutes) * 100
                                const height = ((assignmentEnd - assignmentStart) / totalMinutes) * 100
                                
                                // Generate a color based on subject code
                                const subjectCode = assignment.subject.code
                                let bgColor = '#00CED1' // Default color
                                
                                // Use different colors for different course prefixes
                                if (subjectCode.startsWith('GD')) {
                                  bgColor = '#3B82F6' // Blue for Design
                                } else if (subjectCode.startsWith('GBA')) {
                                  bgColor = '#8B5CF6' // Purple for Belles Arts
                                } else if (subjectCode.startsWith('TR')) {
                                  bgColor = '#10B981' // Green for transversal
                                }
                                
                                return (
                                  <div
                                    key={assignment.id}
                                    style={{
                                      position: 'absolute',
                                      top: `${top}%`,
                                      height: `${height}%`,
                                      left: '4px',
                                      right: '4px',
                                      backgroundColor: bgColor
                                    }}
                                    className="rounded-md p-2 text-white flex flex-col gap-1 shadow-sm overflow-hidden"
                                  >
                                    <div className="font-semibold text-xs line-clamp-2 leading-tight">
                                      {assignment.subject.name}
                                    </div>
                                    
                                    <div className="text-[10px] opacity-90">
                                      {assignment.subject.code}
                                    </div>
                                    
                                    {assignment.student_group && (
                                      <div className="text-[10px] opacity-90 flex items-center gap-1">
                                        <Users className="h-3 w-3 flex-shrink-0" />
                                        <span className="truncate">
                                          {assignment.student_group.name}
                                        </span>
                                      </div>
                                    )}
                                    
                                    {assignment.teachers && assignment.teachers.length > 0 && (
                                      <div className="space-y-0.5">
                                        {assignment.teachers.map((t, idx) => (
                                          <div key={idx} className="text-[10px] opacity-90 flex items-center gap-1">
                                            <GraduationCap className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">
                                              {t.first_name} {t.last_name}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    
                                    <div className="text-[10px] opacity-90">
                                      {assignment.time_slot.start_time} - {assignment.time_slot.end_time}
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  
                  {/* Legend */}
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium mb-2">Llegenda:</p>
                    <div className="flex flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#3B82F6' }}></div>
                        <span className="text-xs">Grau en Disseny</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#8B5CF6' }}></div>
                        <span className="text-xs">Grau en Belles Arts</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: '#10B981' }}></div>
                        <span className="text-xs">Transversal</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="assignments" className="mt-6 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-4">
              {loadingAssignments ? (
                <p className="text-muted-foreground text-center py-8">
                  Carregant assignatures...
                </p>
              ) : assignments.length > 0 ? (
                <div className="space-y-4">
                  {/* Group assignments by semester */}
                  {Object.entries(
                    assignments.reduce((acc, assignment) => {
                      const semesterKey = `${assignment.semester.academic_year} - ${assignment.semester.name}`
                      if (!acc[semesterKey]) {
                        acc[semesterKey] = []
                      }
                      acc[semesterKey].push(assignment)
                      return acc
                    }, {} as Record<string, Assignment[]>)
                  ).map(([semesterKey, semesterAssignments]) => (
                    <div key={semesterKey} className="space-y-2">
                      <h3 className="font-medium text-sm text-muted-foreground sticky top-0 bg-background py-2">
                        {semesterKey}
                      </h3>
                      <div className="grid gap-2">
                        {semesterAssignments.map((assignment) => (
                          <div key={assignment.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium">
                                {assignment.subject.code} - {assignment.subject.name}
                              </h4>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="text-xs">
                                {assignment.subject_group.name}
                              </Badge>
                              {assignment.student_group && (
                                <Badge variant="secondary" className="text-xs">
                                  {assignment.student_group.name}
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No hi ha assignatures assignades a aquesta aula
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="photos" className="mt-6 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-4">
              <PhotoGallery 
                photos={classroom.photos || []} 
                classroomName={classroom.name}
              />
            </div>
          </TabsContent>
          
          <TabsContent value="equipment" className="mt-6 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-4 space-y-4">
              {loadingEquipment ? (
                <p className="text-muted-foreground text-center py-8">
                  Carregant equipament...
                </p>
              ) : equipment.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupedEquipment).map(([category, items]) => (
                    <div key={category} className="space-y-3">
                      <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                        {getIconComponent(EQUIPMENT_CATEGORIES[category as keyof typeof EQUIPMENT_CATEGORIES]?.icon)}
                        {EQUIPMENT_CATEGORIES[category as keyof typeof EQUIPMENT_CATEGORIES]?.label || category}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-3">
                              {getIconComponent(item.equipment_type?.icon)}
                              <div>
                                <p className="font-medium text-sm">{item.equipment_type?.name}</p>
                                {item.quantity > 1 && (
                                  <p className="text-xs text-muted-foreground">
                                    Quantitat: {item.quantity}
                                  </p>
                                )}
                              </div>
                            </div>
                            {item.status !== 'operational' && (
                              <Badge variant={item.status === 'maintenance' ? 'secondary' : 'destructive'} className="text-xs">
                                {item.status === 'maintenance' ? 'Manteniment' : 'Avariat'}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hi ha equipament registrat
                </p>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="software" className="mt-6 flex-1 overflow-hidden">
            <div className="h-full overflow-y-auto p-4 space-y-4">
              {loadingSoftware ? (
                <p className="text-muted-foreground text-center py-8">
                  Carregant software...
                </p>
              ) : (
                <div className="space-y-6">
                  {/* Software necessari (no instal·lat) */}
                  {(() => {
                    const requiredNotInstalled = softwareList.filter(s => !s.isInstalled && s.subjects.length > 0)
                    return requiredNotInstalled.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-red-600 flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          Software necessari no instal·lat ({requiredNotInstalled.length})
                        </h4>
                        <div className="grid gap-2">
                          {requiredNotInstalled.map((software) => (
                            <div key={software.id} className="flex items-center justify-between p-3 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {software.name}
                                  </span>
                                  {software.version && (
                                    <span className="text-xs text-muted-foreground">
                                      v{software.version}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Requerit per: {software.subjects.map(s => s.code).join(', ')}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                variant="default"
                                onClick={() => handleInstallSoftware(software.id)}
                                className="ml-2"
                              >
                                Instal·lar
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Software instal·lat */}
                  {(() => {
                    const installed = softwareList.filter(s => s.isInstalled)
                    return installed.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="text-sm font-medium text-green-600 flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          Software instal·lat ({installed.length})
                        </h4>
                        <div className="grid gap-2">
                          {installed.map((software) => (
                            <div key={software.id} className="flex items-center justify-between p-3 rounded-lg border border-green-200 bg-green-50 dark:bg-green-950/20">
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm">
                                    {software.name}
                                  </span>
                                  {software.version && (
                                    <span className="text-xs text-muted-foreground">
                                      v{software.version}
                                    </span>
                                  )}
                                  <Badge variant="outline" className="text-xs">
                                    {software.category}
                                  </Badge>
                                </div>
                                {software.subjects.length > 0 ? (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    Utilitzat per: {software.subjects.map(s => s.code).join(', ')}
                                  </p>
                                ) : (
                                  <p className="text-xs text-muted-foreground mt-1">
                                    No utilitzat per cap assignatura actual
                                  </p>
                                )}
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleUninstallSoftware(software.id)}
                                className="ml-2 text-red-600 hover:text-red-700"
                              >
                                Desinstal·lar
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )
                  })()}

                  {/* Missatge si no hi ha res */}
                  {softwareList.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                      No hi ha software necessari ni instal·lat per aquesta aula
                    </p>
                  )}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}