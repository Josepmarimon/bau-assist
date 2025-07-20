'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { AlertCircle, BookOpen, Calendar, Users, Plus, Check, ChevronsUpDown, Search } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface SubjectWithoutSpace {
  id: string
  code: string
  name: string
  year: number
  semester: string
  itinerari: string | null
  type: string
  credits: number
}

interface Classroom {
  id: string
  name: string
  type: string
  capacity: number | null
}

interface StudentGroup {
  id: string
  name: string
  code: string
  year: number
  shift: string
  max_students: number
}

interface SubjectGroup {
  id: string
  subject_id: string
  student_group_id: string
  student_group: StudentGroup
}

export default function SubjectsWithoutSpacesPage() {
  const [subjects, setSubjects] = useState<SubjectWithoutSpace[]>([])
  const [subjectGroups, setSubjectGroups] = useState<Record<string, SubjectGroup[]>>({})
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [selectedClassrooms, setSelectedClassrooms] = useState<Record<string, string>>({})
  const [openComboboxes, setOpenComboboxes] = useState<Record<string, boolean>>({})
  const [assigningGroups, setAssigningGroups] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const supabase = createClient()
  const { toast } = useToast()

  useEffect(() => {
    loadSubjectsWithoutSpaces()
    loadClassrooms()
  }, [])

  useEffect(() => {
    if (subjects.length > 0) {
      loadGroupsForSubjects()
    }
  }, [subjects])

  const loadSubjectsWithoutSpaces = async () => {
    try {
      setLoading(true)
      
      // First get all active subjects
      const { data: allSubjects, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, code, name, year, semester, "ID Itinerari" as itinerari, type, credits')
        .eq('active', true)
        .order('year')
        .order('"ID Itinerari"')
        .order('semester')
        .order('name')

      if (subjectsError) throw subjectsError

      // Then get subjects that have schedule slots
      const { data: scheduledSubjects, error: scheduleError } = await supabase
        .from('schedule_slots')
        .select('subject_id')
        .not('subject_id', 'is', null)

      if (scheduleError) throw scheduleError

      // Get unique subject IDs that have schedule slots
      const scheduledSubjectIds = [...new Set(scheduledSubjects?.map(s => s.subject_id) || [])]

      // Filter out subjects that have schedule slots
      const subjectsWithoutSpaces = allSubjects?.filter(
        subject => !scheduledSubjectIds.includes(subject.id)
      ) || []

      setSubjects(subjectsWithoutSpaces)
    } catch (error) {
      console.error('Error loading subjects:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadClassrooms = async () => {
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select('id, name, type, capacity')
        .order('name')

      if (error) throw error
      setClassrooms(data || [])
    } catch (error) {
      console.error('Error loading classrooms:', error)
    }
  }

  const loadGroupsForSubjects = async () => {
    try {
      const subjectIds = subjects.map(s => s.id)
      
      // Get subject groups for these subjects
      const { data: subjectGroupsData, error: subjectGroupsError } = await supabase
        .from('subject_groups')
        .select(`
          id,
          subject_id,
          group_code,
          max_students
        `)
        .in('subject_id', subjectIds)

      if (subjectGroupsError) throw subjectGroupsError

      // For each subject group, find matching student groups based on the group code
      const groupsBySubject: Record<string, SubjectGroup[]> = {}
      
      if (subjectGroupsData && subjectGroupsData.length > 0) {
        // Fetch all student groups
        const { data: studentGroups, error: studentGroupsError } = await supabase
          .from('student_groups')
          .select('id, name, code, year, shift, max_students')

        if (studentGroupsError) throw studentGroupsError

        // Build the groups by subject
        subjectGroupsData.forEach((subjectGroup: any) => {
          // Try to match subject group codes with student group names
          // subject_groups has codes like "1r Matí M1"
          // student_groups has names like "1r Matí (6 M1)" or "1r Matí (1 M1)"
          
          // Extract key parts from subject group code
          const parts = subjectGroup.group_code.match(/(\d+r)\s+(Matí|Tarda)\s+(M\d+|T\d+)/)
          
          if (parts) {
            const [_, yearPart, shiftPart, groupPart] = parts
            
            // Find matching student group
            const matchingStudentGroup = studentGroups?.find(sg => {
              // Check if the student group name contains the same year, shift, and ends with the group code
              return sg.name.includes(yearPart) && 
                     sg.name.includes(shiftPart) && 
                     (sg.name.includes(groupPart) || sg.code === groupPart)
            })
            
            if (matchingStudentGroup) {
              if (!groupsBySubject[subjectGroup.subject_id]) {
                groupsBySubject[subjectGroup.subject_id] = []
              }
              groupsBySubject[subjectGroup.subject_id].push({
                id: subjectGroup.id,
                subject_id: subjectGroup.subject_id,
                student_group_id: matchingStudentGroup.id,
                student_group: matchingStudentGroup
              })
            }
          }
        })
      }

      setSubjectGroups(groupsBySubject)
    } catch (error) {
      console.error('Error loading groups:', error)
    }
  }

  const handleClassroomSelect = (groupKey: string, classroomId: string) => {
    setSelectedClassrooms(prev => ({
      ...prev,
      [groupKey]: classroomId
    }))
  }

  const setOpenCombobox = (groupKey: string, open: boolean) => {
    setOpenComboboxes(prev => ({
      ...prev,
      [groupKey]: open
    }))
  }

  const assignClassroom = async (subject: SubjectWithoutSpace, group: SubjectGroup) => {
    const groupKey = `${subject.id}-${group.student_group_id}`
    const classroomId = selectedClassrooms[groupKey]
    if (!classroomId) return

    setAssigningGroups(prev => new Set(prev).add(groupKey))

    try {
      // Create a schedule slot for this subject-group-classroom assignment
      console.log('Inserting schedule slot with:', {
        subject_id: subject.id,
        student_group_id: group.student_group_id,
        classroom_id: classroomId,
        semester: subject.semester
      })
      
      // Convert semester from "1r", "2n" to 1, 2
      let semesterNumber = 1
      if (subject.semester === '2n') {
        semesterNumber = 2
      } else if (subject.semester === '1r i 2n') {
        // For subjects that span both semesters, default to 1st
        semesterNumber = 1
      }
      
      const { data, error } = await supabase
        .from('schedule_slots')
        .insert({
          subject_id: subject.id,
          student_group_id: group.student_group_id,
          classroom_id: classroomId,
          day_of_week: 1, // Default to Monday
          start_time: '09:00',
          end_time: '11:00',
          semester: semesterNumber,
          academic_year: '2025-26' // Use the default value expected by the DB
        })
        .select()

      if (error) {
        console.error('Supabase error:', error)
        throw error
      }
      
      console.log('Successfully created schedule slot:', data)

      toast({
        title: "Aula assignada",
        description: `S'ha assignat l'aula a ${subject.name} - ${group.student_group.name}`,
      })

      // Check if this was the last group for this subject
      const currentGroups = subjectGroups[subject.id] || []
      const remainingGroups = currentGroups.filter(g => g.id !== group.id)
      
      // Update the groups for this subject
      setSubjectGroups(prev => {
        const updatedGroups = { ...prev }
        updatedGroups[subject.id] = remainingGroups
        return updatedGroups
      })
      
      // If no more groups remain, remove the subject from the list
      if (remainingGroups.length === 0) {
        setSubjects(prevSubjects => prevSubjects.filter(s => s.id !== subject.id))
      }
      
      setSelectedClassrooms(prev => {
        const newState = { ...prev }
        delete newState[groupKey]
        return newState
      })
    } catch (error: any) {
      console.error('Error assigning classroom:', error)
      toast({
        title: "Error",
        description: error.message || "No s'ha pogut assignar l'aula",
        variant: "destructive"
      })
    } finally {
      setAssigningGroups(prev => {
        const newSet = new Set(prev)
        newSet.delete(groupKey)
        return newSet
      })
    }
  }

  // Group subjects by year, then itinerari, then semester
  const groupedSubjects = subjects.reduce((acc, subject) => {
    const year = subject.year
    const itinerari = subject.itinerari || 'Sense itinerari'
    const semester = subject.semester
    
    if (!acc[year]) acc[year] = {}
    if (!acc[year][itinerari]) acc[year][itinerari] = {}
    if (!acc[year][itinerari][semester]) acc[year][itinerari][semester] = []
    
    acc[year][itinerari][semester].push(subject)
    
    return acc
  }, {} as Record<number, Record<string, Record<string, SubjectWithoutSpace[]>>>)

  const totalSubjects = subjects.length
  const totalCredits = subjects.reduce((sum, s) => sum + s.credits, 0)

  // Count by type
  const typeCount = subjects.reduce((acc, subject) => {
    acc[subject.type] = (acc[subject.type] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  // Count by itinerari
  const itinerariCount = subjects.reduce((acc, subject) => {
    const it = subject.itinerari || 'Sense itinerari'
    acc[it] = (acc[it] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assignatures Sense Espais Assignats</h1>
        <p className="text-muted-foreground mt-2">
          Assignatures actives que no tenen cap espai assignat a l'horari
        </p>
      </div>

      {/* Alert */}
      <Alert className="border-orange-500/50 bg-orange-50 dark:bg-orange-950/20">
        <AlertCircle className="h-4 w-4 text-orange-600" />
        <AlertTitle>Atenció</AlertTitle>
        <AlertDescription>
          Hi ha {totalSubjects} assignatures sense espais assignats. Això pot indicar que aquestes assignatures no estan programades en l'horari actual.
        </AlertDescription>
      </Alert>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-sky-50 border-sky-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Assignatures
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubjects}</div>
            <p className="text-xs text-muted-foreground">
              Sense espais assignats
            </p>
          </CardContent>
        </Card>
        <Card className="bg-sky-50 border-sky-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Crèdits ECTS
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCredits}</div>
            <p className="text-xs text-muted-foreground">
              Crèdits totals afectats
            </p>
          </CardContent>
        </Card>
        <Card className="bg-sky-50 border-sky-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Obligatòries
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{typeCount['obligatoria'] || 0}</div>
            <p className="text-xs text-muted-foreground">
              Assignatures obligatòries
            </p>
          </CardContent>
        </Card>
        <Card className="bg-sky-50 border-sky-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Optatives
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{typeCount['optativa'] || 0}</div>
            <p className="text-xs text-muted-foreground">
              Assignatures optatives
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Summary by Itinerari */}
      <Card className="bg-sky-50 border-sky-200">
        <CardHeader>
          <CardTitle>Resum per Itinerari</CardTitle>
          <CardDescription>
            Distribució d'assignatures sense espais per itinerari
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {Object.entries(itinerariCount).map(([itinerari, count]) => (
              <div key={itinerari} className="flex items-center justify-between p-3 rounded-lg border">
                <span className="font-medium">{itinerari}</span>
                <Badge variant="secondary">{count} assignatures</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Subjects List */}
      <Card className="bg-sky-50 border-sky-200">
        <CardHeader>
          <CardTitle>Assignatures per Curs, Itinerari i Semestre</CardTitle>
          <CardDescription>
            Llistat complet organitzat per curs, itinerari i semestre
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-48"></div>
                <div className="h-32 bg-muted rounded w-96"></div>
              </div>
            </div>
          ) : (
            <Accordion type="single" collapsible className="w-full">
              {Object.entries(groupedSubjects)
                .sort(([a], [b]) => Number(a) - Number(b))
                .map(([year, yearData]) => (
                  <AccordionItem key={year} value={`year-${year}`}>
                    <AccordionTrigger className="text-lg font-semibold">
                      {year}r Curs
                      <Badge variant="outline" className="ml-2">
                        {Object.values(yearData).flatMap(it => 
                          Object.values(it).flat()
                        ).length} assignatures
                      </Badge>
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="space-y-4">
                        {Object.entries(yearData)
                          .sort(([a], [b]) => {
                            // Sort: specialized itineraris first, then "Sense itinerari"
                            if (a === 'Sense itinerari') return 1
                            if (b === 'Sense itinerari') return -1
                            return a.localeCompare(b)
                          })
                          .map(([itinerari, itinerariData]) => (
                            <div key={itinerari} className="border rounded-lg p-4">
                              <h3 className="font-semibold mb-3 flex items-center gap-2">
                                {itinerari}
                                <Badge variant={itinerari === 'Sense itinerari' ? 'secondary' : 'default'}>
                                  {Object.values(itinerariData).flat().length} assignatures
                                </Badge>
                              </h3>
                              <div className="space-y-3">
                                {Object.entries(itinerariData)
                                  .sort(([a], [b]) => {
                                    // Sort semesters: "1r" < "2n" < "1r i 2n"
                                    const order = { '1r': 1, '2n': 2, '1r i 2n': 3 }
                                    return (order[a as keyof typeof order] || 99) - 
                                           (order[b as keyof typeof order] || 99)
                                  })
                                  .map(([semester, semesterSubjects]) => (
                                    <div key={semester} className="ml-4">
                                      <h4 className="text-sm font-medium text-muted-foreground mb-2">
                                        Semestre: {semester}
                                      </h4>
                                      <div className="space-y-2">
                                        {semesterSubjects.map((subject) => {
                                          const groups = subjectGroups[subject.id] || []
                                          
                                          return (
                                            <div 
                                              key={subject.id} 
                                              className="p-3 rounded border bg-sky-50 border-sky-200"
                                            >
                                              <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-3">
                                                  <code className="text-sm font-mono">
                                                    {subject.code}
                                                  </code>
                                                  <span className="text-sm font-medium">
                                                    {subject.name}
                                                  </span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                  <Badge variant="outline" className="text-xs">
                                                    {subject.credits} ECTS
                                                  </Badge>
                                                  <Badge 
                                                    variant={subject.type === 'obligatoria' ? 'default' : 'secondary'}
                                                    className="text-xs"
                                                  >
                                                    {subject.type}
                                                  </Badge>
                                                </div>
                                              </div>
                                              
                                              {groups.length > 0 ? (
                                                <div className="space-y-2 mt-3">
                                                  <div className="text-xs text-muted-foreground mb-2">
                                                    Grups assignats a aquesta assignatura:
                                                  </div>
                                                  {groups.map((group) => {
                                                    const groupKey = `${subject.id}-${group.student_group_id}`
                                                    return (
                                                      <div key={group.id} className="flex items-center gap-2 p-2 bg-background rounded">
                                                        <div className="flex-1">
                                                          <Badge variant="outline" className="mr-2">
                                                            {group.student_group.code}
                                                          </Badge>
                                                          <span className="text-sm">
                                                            {group.student_group.name}
                                                          </span>
                                                          <span className="text-xs text-muted-foreground ml-2">
                                                            ({group.student_group.shift}, {group.student_group.max_students} alumnes)
                                                          </span>
                                                        </div>
                                                        <Popover 
                                                          open={openComboboxes[groupKey] || false} 
                                                          onOpenChange={(open) => setOpenCombobox(groupKey, open)}
                                                        >
                                                          <PopoverTrigger asChild>
                                                            <Button
                                                              variant="outline"
                                                              role="combobox"
                                                              aria-expanded={openComboboxes[groupKey] || false}
                                                              className="w-[300px] justify-between"
                                                            >
                                                              {selectedClassrooms[groupKey]
                                                                ? classrooms.find((classroom) => classroom.id === selectedClassrooms[groupKey])?.name
                                                                : "Selecciona aula..."}
                                                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                            </Button>
                                                          </PopoverTrigger>
                                                          <PopoverContent className="w-[300px] p-0">
                                                            <Command>
                                                              <CommandInput placeholder="Cerca aula..." />
                                                              <CommandEmpty>No s'han trobat aules.</CommandEmpty>
                                                              <CommandGroup className="max-h-[300px] overflow-y-auto">
                                                                {classrooms.map((classroom) => (
                                                                  <CommandItem
                                                                    key={classroom.id}
                                                                    value={`${classroom.name} ${classroom.type} ${classroom.capacity || ''}`}
                                                                    onSelect={() => {
                                                                      handleClassroomSelect(groupKey, classroom.id)
                                                                      setOpenCombobox(groupKey, false)
                                                                    }}
                                                                  >
                                                                    <Check
                                                                      className={`mr-2 h-4 w-4 ${
                                                                        selectedClassrooms[groupKey] === classroom.id ? "opacity-100" : "opacity-0"
                                                                      }`}
                                                                    />
                                                                    <div className="flex-1">
                                                                      <div className="font-medium">{classroom.name}</div>
                                                                      <div className="text-sm text-muted-foreground">
                                                                        {classroom.type}
                                                                        {classroom.capacity && ` • ${classroom.capacity} places`}
                                                                      </div>
                                                                    </div>
                                                                  </CommandItem>
                                                                ))}
                                                              </CommandGroup>
                                                            </Command>
                                                          </PopoverContent>
                                                        </Popover>
                                                        <Button
                                                          size="sm"
                                                          onClick={() => assignClassroom(subject, group)}
                                                          disabled={!selectedClassrooms[groupKey] || assigningGroups.has(groupKey)}
                                                        >
                                                          {assigningGroups.has(groupKey) ? (
                                                            <div className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                                                          ) : (
                                                            <>
                                                              <Plus className="h-4 w-4 mr-1" />
                                                              Assignar
                                                            </>
                                                          )}
                                                        </Button>
                                                      </div>
                                                    )
                                                  })}
                                                </div>
                                              ) : (
                                                <div className="text-sm text-muted-foreground mt-3 p-2 bg-background rounded">
                                                  No hi ha grups assignats a aquesta assignatura
                                                </div>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
            </Accordion>
          )}
        </CardContent>
      </Card>
    </div>
  )
}