'use client'

import { useState, useEffect, useMemo } from 'react'
import { Plus, Calendar, Clock, Building2, User, Trash2, Edit, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { MasterScheduleDialog } from '@/components/masters/master-schedule-dialog'
import { MastersCalendarView } from '@/components/masters/masters-calendar-view'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type MasterSchedule = Database['public']['Tables']['master_schedules']['Row']
type Program = Database['public']['Tables']['programs']['Row']
type Classroom = Database['public']['Tables']['classrooms']['Row']
type Teacher = Database['public']['Tables']['teachers']['Row']
type Semester = Database['public']['Tables']['semesters']['Row']

interface MasterScheduleWithRelations extends Omit<MasterSchedule, 'program_id' | 'classroom_id' | 'teacher_id' | 'semester_id'> {
  programs: Program
  classrooms: Classroom
  teachers: Teacher | null
  semesters: Semester | null
  program_id: string
  classroom_id: string
  teacher_id: string | null
  semester_id: string | null
}

const DAYS = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']

export default function MastersPage() {
  const [schedules, setSchedules] = useState<MasterScheduleWithRelations[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [semesters, setSemesters] = useState<Semester[]>([])
  const [selectedProgram, setSelectedProgram] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedSchedule, setSelectedSchedule] = useState<MasterScheduleWithRelations | null>(null)
  const [expandedSections, setExpandedSections] = useState<{ master: boolean; postgrau: boolean }>({
    master: true,
    postgrau: true
  })
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      // Load all required data
      const [
        { data: schedulesData, error: schedulesError },
        { data: programsData, error: programsError },
        { data: classroomsData, error: classroomsError },
        { data: teachersData, error: teachersError },
        { data: semestersData, error: semestersError }
      ] = await Promise.all([
        supabase
          .from('master_schedules')
          .select(`
            *,
            programs!inner (*),
            classrooms!inner (*),
            teachers (*),
            semesters (*)
          `)
          .order('day_of_week')
          .order('start_time'),
        supabase
          .from('programs')
          .select('*')
          .in('type', ['master', 'postgrau'])
          .eq('active', true)
          .order('name'),
        supabase
          .from('classrooms')
          .select('*')
          .order('name'),
        supabase
          .from('teachers')
          .select('*')
          .order('first_name'),
        supabase
          .from('semesters')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10)
      ])

      if (schedulesError) {
        console.error('Error loading schedules:', schedulesError)
        throw new Error(`Error loading schedules: ${schedulesError.message}`)
      }
      if (programsError) {
        console.error('Error loading programs:', programsError)
        throw new Error(`Error loading programs: ${programsError.message}`)
      }
      if (classroomsError) {
        console.error('Error loading classrooms:', classroomsError)
        throw new Error(`Error loading classrooms: ${classroomsError.message}`)
      }
      if (teachersError) {
        console.error('Error loading teachers:', teachersError)
        throw new Error(`Error loading teachers: ${teachersError.message}`)
      }
      if (semestersError) {
        console.error('Error loading semesters:', semestersError)
        throw new Error(`Error loading semesters: ${semestersError.message}`)
      }

      console.log('Data loaded:', {
        schedules: schedulesData?.length || 0,
        programs: programsData?.length || 0,
        classrooms: classroomsData?.length || 0,
        teachers: teachersData?.length || 0,
        semesters: semestersData?.length || 0
      })

      setSchedules(schedulesData || [])
      setPrograms(programsData || [])
      setClassrooms(classroomsData || [])
      setTeachers(teachersData || [])
      setSemesters(semestersData || [])
    } catch (error: any) {
      console.error('Error loading data:', error)
      toast({
        title: 'Error',
        description: error.message || 'No s\'han pogut carregar les dades',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setSelectedSchedule(null)
    setDialogOpen(true)
  }

  const handleEdit = (schedule: MasterScheduleWithRelations) => {
    setSelectedSchedule(schedule)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Estàs segur que vols eliminar aquest horari?')) return

    try {
      const { error } = await supabase
        .from('master_schedules')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Horari eliminat',
        description: 'L\'horari s\'ha eliminat correctament'
      })
      
      loadData()
    } catch (error) {
      console.error('Error deleting schedule:', error)
      toast({
        title: 'Error',
        description: 'No s\'ha pogut eliminar l\'horari',
        variant: 'destructive'
      })
    }
  }

  const filteredSchedules = selectedProgram === 'all' 
    ? schedules 
    : schedules.filter(s => s.program_id === selectedProgram)

  // Group schedules by semester, then program type, then program
  const groupedSchedules = useMemo(() => {
    const groups = {
      semester1: {
        master: {} as Record<string, MasterScheduleWithRelations[]>,
        postgrau: {} as Record<string, MasterScheduleWithRelations[]>
      },
      semester2: {
        master: {} as Record<string, MasterScheduleWithRelations[]>,
        postgrau: {} as Record<string, MasterScheduleWithRelations[]>
      }
    }
    
    filteredSchedules.forEach(schedule => {
      const type = schedule.programs.type as 'master' | 'postgrau'
      const programId = schedule.program_id
      const semesterNum = schedule.semesters?.number
      
      if ((type === 'master' || type === 'postgrau') && semesterNum) {
        const semesterKey = semesterNum === 1 ? 'semester1' : 'semester2'
        
        if (!groups[semesterKey][type][programId]) {
          groups[semesterKey][type][programId] = []
        }
        groups[semesterKey][type][programId].push(schedule)
      }
    })
    
    // Sort schedules within each program by day, then time
    Object.keys(groups).forEach(semester => {
      Object.keys(groups[semester as keyof typeof groups]).forEach(type => {
        Object.keys(groups[semester as keyof typeof groups][type as keyof typeof groups[typeof semester]]).forEach(programId => {
          groups[semester as keyof typeof groups][type as keyof typeof groups[typeof semester]][programId].sort((a, b) => {
            // First by day
            const dayCompare = a.day_of_week - b.day_of_week
            if (dayCompare !== 0) return dayCompare
            
            // Then by start time
            return a.start_time.localeCompare(b.start_time)
          })
        })
      })
    })
    
    return groups
  }, [filteredSchedules])

  const toggleSection = (section: 'master' | 'postgrau') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  const toggleProgram = (programId: string) => {
    setExpandedPrograms(prev => {
      const newSet = new Set(prev)
      if (newSet.has(programId)) {
        newSet.delete(programId)
      } else {
        newSet.add(programId)
      }
      return newSet
    })
  }

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregant...</div>
  }

  // Component to render schedule list for a semester
  const renderScheduleList = (semesterSchedules: typeof groupedSchedules.semester1) => {
    const hasSchedules = Object.keys(semesterSchedules.master).length > 0 || Object.keys(semesterSchedules.postgrau).length > 0
    
    if (!hasSchedules) {
      return (
        <p className="text-center text-muted-foreground py-8">
          No hi ha horaris assignats per aquest semestre
        </p>
      )
    }

    return (
      <div className="space-y-4">
        {/* Masters Section */}
        {Object.keys(semesterSchedules.master).length > 0 && (
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('master')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedSections.master ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                <span className="font-semibold text-lg">Màsters</span>
                <Badge variant="default" className="ml-2">
                  {Object.values(semesterSchedules.master).flat().length}
                </Badge>
              </div>
            </button>
            {expandedSections.master && (
              <div className="border-t">
                {Object.entries(semesterSchedules.master).map(([programId, schedules]) => {
                  const program = programs.find(p => p.id === programId)
                  const isExpanded = expandedPrograms.has(programId)
                  
                  return (
                    <div key={programId} className="border-b last:border-b-0">
                      <button
                        onClick={() => toggleProgram(programId)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <div 
                            className="w-4 h-4 rounded-sm"
                            style={{ backgroundColor: program?.color || '#6B7280' }}
                          />
                          <span className="font-medium">{program?.name || 'Sense nom'}</span>
                          <Badge variant="outline" className="text-xs">
                            {schedules.length} {schedules.length === 1 ? 'horari' : 'horaris'}
                          </Badge>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="bg-gray-50">
                          {schedules.map(schedule => (
                            <div
                              key={schedule.id}
                              className="flex items-center justify-between px-6 py-3 border-t hover:bg-gray-100"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {DAYS[schedule.day_of_week - 1]}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Building2 className="h-4 w-4" />
                                    {schedule.classrooms.name}
                                  </div>
                                  {schedule.teachers && (
                                    <div className="flex items-center gap-1">
                                      <User className="h-4 w-4" />
                                      {schedule.teachers.first_name} {schedule.teachers.last_name}
                                    </div>
                                  )}
                                </div>
                                {schedule.subject_name && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {schedule.subject_name}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(schedule)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(schedule.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Postgraus Section */}
        {Object.keys(semesterSchedules.postgrau).length > 0 && (
          <div className="border rounded-lg">
            <button
              onClick={() => toggleSection('postgrau')}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {expandedSections.postgrau ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
                <span className="font-semibold text-lg">Postgraus</span>
                <Badge variant="secondary" className="ml-2">
                  {Object.values(semesterSchedules.postgrau).flat().length}
                </Badge>
              </div>
            </button>
            {expandedSections.postgrau && (
              <div className="border-t">
                {Object.entries(semesterSchedules.postgrau).map(([programId, schedules]) => {
                  const program = programs.find(p => p.id === programId)
                  const isExpanded = expandedPrograms.has(programId)
                  
                  return (
                    <div key={programId} className="border-b last:border-b-0">
                      <button
                        onClick={() => toggleProgram(programId)}
                        className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          <div 
                            className="w-4 h-4 rounded-sm"
                            style={{ backgroundColor: program?.color || '#6B7280' }}
                          />
                          <span className="font-medium">{program?.name || 'Sense nom'}</span>
                          <Badge variant="outline" className="text-xs">
                            {schedules.length} {schedules.length === 1 ? 'horari' : 'horaris'}
                          </Badge>
                        </div>
                      </button>
                      
                      {isExpanded && (
                        <div className="bg-gray-50">
                          {schedules.map(schedule => (
                            <div
                              key={schedule.id}
                              className="flex items-center justify-between px-6 py-3 border-t hover:bg-gray-100"
                            >
                              <div className="flex-1">
                                <div className="flex items-center gap-4 text-sm">
                                  <div className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {DAYS[schedule.day_of_week - 1]}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {schedule.start_time.slice(0, 5)} - {schedule.end_time.slice(0, 5)}
                                  </div>
                                  <div className="flex items-center gap-1">
                                    <Building2 className="h-4 w-4" />
                                    {schedule.classrooms.name}
                                  </div>
                                  {schedule.teachers && (
                                    <div className="flex items-center gap-1">
                                      <User className="h-4 w-4" />
                                      {schedule.teachers.first_name} {schedule.teachers.last_name}
                                    </div>
                                  )}
                                </div>
                                {schedule.subject_name && (
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {schedule.subject_name}
                                  </div>
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleEdit(schedule)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDelete(schedule.id)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Horaris de Màsters i Postgraus</h1>
          <p className="text-muted-foreground">Gestiona els horaris i assignacions d\'aules</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.location.href = '/programes'}>
            Gestionar Programes
          </Button>
          <Button onClick={handleAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Afegir Horari
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtre per programa</CardTitle>
            <Select value={selectedProgram} onValueChange={setSelectedProgram}>
              <SelectTrigger className="w-[300px]">
                <SelectValue placeholder="Selecciona un programa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tots els programes</SelectItem>
                {programs.map(program => (
                  <SelectItem key={program.id} value={program.id}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-sm"
                        style={{ backgroundColor: program.color || '#6B7280' }}
                      />
                      {program.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      {/* Calendar View */}
      <Card>
        <CardHeader>
          <CardTitle>Vista setmanal</CardTitle>
          <CardDescription>Horaris assignats per dia i hora</CardDescription>
        </CardHeader>
        <CardContent>
          <MastersCalendarView
            schedules={filteredSchedules}
            onScheduleClick={handleEdit}
          />
        </CardContent>
      </Card>


      {/* List View with Semester Tabs */}
      <Card>
        <CardHeader>
          <CardTitle>Llista d\'horaris</CardTitle>
          <CardDescription>Horaris agrupats per semestre, tipus i programa</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="semester1" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="semester1">
                1r Semestre
                <Badge variant="outline" className="ml-2 text-xs">
                  {Object.values(groupedSchedules.semester1.master).flat().length + 
                   Object.values(groupedSchedules.semester1.postgrau).flat().length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="semester2">
                2n Semestre
                <Badge variant="outline" className="ml-2 text-xs">
                  {Object.values(groupedSchedules.semester2.master).flat().length + 
                   Object.values(groupedSchedules.semester2.postgrau).flat().length}
                </Badge>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="semester1" className="mt-4">
              {renderScheduleList(groupedSchedules.semester1)}
            </TabsContent>
            
            <TabsContent value="semester2" className="mt-4">
              {renderScheduleList(groupedSchedules.semester2)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <MasterScheduleDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        schedule={selectedSchedule}
        programs={programs}
        classrooms={classrooms}
        teachers={teachers}
        semesters={semesters}
        onSuccess={() => {
          setDialogOpen(false)
          loadData()
        }}
      />

    </div>
  )
}