'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'
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
import { Check, ChevronsUpDown, Plus, X } from "lucide-react"
import { cn } from "@/lib/utils"

type MasterSchedule = Database['public']['Tables']['master_schedules']['Row']
type Program = Database['public']['Tables']['programs']['Row']
type Classroom = Database['public']['Tables']['classrooms']['Row']
type Teacher = Database['public']['Tables']['teachers']['Row']
type Semester = Database['public']['Tables']['semesters']['Row']

interface MasterScheduleWithRelations extends MasterSchedule {
  programs: Program
  classrooms: Classroom
  teachers: Teacher | null
  semesters: Semester | null
}

interface MasterScheduleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  schedule: MasterScheduleWithRelations | null
  programs: Program[]
  classrooms: Classroom[]
  teachers: Teacher[]
  semesters: Semester[]
  onSuccess: () => void
}

const DAYS = [
  { value: 1, label: 'Dilluns' },
  { value: 2, label: 'Dimarts' },
  { value: 3, label: 'Dimecres' },
  { value: 4, label: 'Dijous' },
  { value: 5, label: 'Divendres' }
]

interface TimeSlotAssignment {
  day_of_week: number
  start_time: string
  end_time: string
  classroom_id: string
}

export function MasterScheduleDialog({ 
  open, 
  onOpenChange, 
  schedule, 
  programs,
  classrooms,
  teachers,
  semesters,
  onSuccess 
}: MasterScheduleDialogProps) {
  const [loading, setLoading] = useState(false)
  const [programSearchOpen, setProgramSearchOpen] = useState(false)
  const [programSearchValue, setProgramSearchValue] = useState("")
  const [timeSlotAssignments, setTimeSlotAssignments] = useState<TimeSlotAssignment[]>([
    { day_of_week: 1, start_time: '15:00', end_time: '17:00', classroom_id: '' }
  ])
  const [formData, setFormData] = useState({
    program_id: '',
    semester_id: semesters[0]?.id || '',
    teacher_id: '',
    subject_name: '',
    notes: '',
    active: true
  })
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (schedule) {
      setFormData({
        program_id: schedule.program_id,
        semester_id: schedule.semester_id || semesters[0]?.id || '',
        teacher_id: schedule.teacher_id || '',
        subject_name: schedule.subject_name || '',
        notes: schedule.notes || '',
        active: schedule.active
      })
      setTimeSlotAssignments([{
        day_of_week: schedule.day_of_week,
        start_time: schedule.start_time.slice(0, 5),
        end_time: schedule.end_time.slice(0, 5),
        classroom_id: schedule.classroom_id
      }])
    } else {
      setFormData({
        program_id: '',
        semester_id: semesters[0]?.id || '',
        teacher_id: '',
        subject_name: '',
        notes: '',
        active: true
      })
      setTimeSlotAssignments([
        { day_of_week: 1, start_time: '15:00', end_time: '17:00', classroom_id: '' }
      ])
    }
  }, [schedule, semesters])

  const addTimeSlotAssignment = () => {
    const lastAssignment = timeSlotAssignments[timeSlotAssignments.length - 1]
    
    // Find the next available day
    const usedDays = timeSlotAssignments.map(a => a.day_of_week)
    let nextDay = lastAssignment.day_of_week + 1
    
    // Find next unused day (1-5 for Monday-Friday)
    while (nextDay <= 5 && usedDays.includes(nextDay)) {
      nextDay++
    }
    
    // If all weekdays are used, start from Monday again
    if (nextDay > 5) {
      nextDay = 1
    }
    
    // Duplicate the last assignment but with a different day
    const newAssignment = {
      day_of_week: nextDay,
      start_time: lastAssignment.start_time,
      end_time: lastAssignment.end_time,
      classroom_id: lastAssignment.classroom_id
    }
    
    setTimeSlotAssignments([...timeSlotAssignments, newAssignment])
  }

  const removeTimeSlotAssignment = (index: number) => {
    setTimeSlotAssignments(timeSlotAssignments.filter((_, i) => i !== index))
  }

  const updateTimeSlotAssignment = (index: number, field: keyof TimeSlotAssignment, value: any) => {
    const updated = [...timeSlotAssignments]
    updated[index] = { ...updated[index], [field]: value }
    setTimeSlotAssignments(updated)
  }

  const checkConflicts = async () => {
    try {
      // Get semesters to check based on selection
      const semestersToCheck = formData.semester_id === 'all-year' 
        ? semesters.filter(s => s.number === 1 || s.number === 2).map(s => s.id)
        : [formData.semester_id]
      
      // Check conflicts for each time slot assignment
      for (const assignment of timeSlotAssignments) {
        if (!assignment.classroom_id) continue

        // Check for classroom conflicts
        const { data: classroomConflicts } = await supabase
          .from('master_schedules')
          .select('*')
          .eq('classroom_id', assignment.classroom_id)
          .eq('day_of_week', assignment.day_of_week)
          .in('semester_id', semestersToCheck)
          .neq('id', schedule?.id || '')

        if (classroomConflicts && classroomConflicts.length > 0) {
          for (const conflict of classroomConflicts) {
            const conflictStart = conflict.start_time
            const conflictEnd = conflict.end_time
            const newStart = assignment.start_time
            const newEnd = assignment.end_time

            // Check if times overlap
            if (
              (newStart >= conflictStart && newStart < conflictEnd) ||
              (newEnd > conflictStart && newEnd <= conflictEnd) ||
              (newStart <= conflictStart && newEnd >= conflictEnd)
            ) {
              const day = DAYS.find(d => d.value === assignment.day_of_week)?.label
              const classroom = classrooms.find(c => c.id === assignment.classroom_id)?.name
              return { 
                hasConflict: true, 
                type: 'classroom', 
                message: `L'aula ${classroom} ja està ocupada el ${day} de ${newStart} a ${newEnd}` 
              }
            }
          }
        }

        // Check for teacher conflicts if teacher is selected
        if (formData.teacher_id) {
          const { data: teacherConflicts } = await supabase
            .from('master_schedules')
            .select('*')
            .eq('teacher_id', formData.teacher_id)
            .eq('day_of_week', assignment.day_of_week)
            .in('semester_id', semestersToCheck)
            .neq('id', schedule?.id || '')

          if (teacherConflicts && teacherConflicts.length > 0) {
            for (const conflict of teacherConflicts) {
              const conflictStart = conflict.start_time
              const conflictEnd = conflict.end_time
              const newStart = assignment.start_time
              const newEnd = assignment.end_time

              // Check if times overlap
              if (
                (newStart >= conflictStart && newStart < conflictEnd) ||
                (newEnd > conflictStart && newEnd <= conflictEnd) ||
                (newStart <= conflictStart && newEnd >= conflictEnd)
              ) {
                const day = DAYS.find(d => d.value === assignment.day_of_week)?.label
                return { 
                  hasConflict: true, 
                  type: 'teacher', 
                  message: `El professor ja té classe el ${day} de ${newStart} a ${newEnd}` 
                }
              }
            }
          }
        }
      }

      return { hasConflict: false }
    } catch (error) {
      console.error('Error checking conflicts:', error)
      return { hasConflict: false }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validate program selection
      if (!formData.program_id) {
        toast({
          title: 'Error',
          description: 'Selecciona un programa',
          variant: 'destructive'
        })
        setLoading(false)
        return
      }

      // Validate semester selection
      if (!formData.semester_id) {
        toast({
          title: 'Error',
          description: 'Selecciona un semestre',
          variant: 'destructive'
        })
        setLoading(false)
        return
      }

      // Validate that all assignments have classrooms
      const invalidAssignments = timeSlotAssignments.filter(a => !a.classroom_id)
      if (invalidAssignments.length > 0) {
        toast({
          title: 'Error',
          description: 'Selecciona una aula per a cada franja horària',
          variant: 'destructive'
        })
        setLoading(false)
        return
      }

      // Check for conflicts
      const conflictCheck = await checkConflicts()
      if (conflictCheck.hasConflict) {
        toast({
          title: 'Conflicte detectat',
          description: conflictCheck.message,
          variant: 'destructive'
        })
        setLoading(false)
        return
      }

      if (schedule) {
        // For editing, we only update the existing schedule (single assignment)
        const { error } = await supabase
          .from('master_schedules')
          .update({
            program_id: formData.program_id,
            classroom_id: timeSlotAssignments[0].classroom_id,
            day_of_week: timeSlotAssignments[0].day_of_week,
            start_time: timeSlotAssignments[0].start_time,
            end_time: timeSlotAssignments[0].end_time,
            semester_id: formData.semester_id,
            teacher_id: formData.teacher_id || null,
            subject_name: formData.subject_name || null,
            notes: formData.notes || null,
            active: formData.active,
            updated_at: new Date().toISOString()
          })
          .eq('id', schedule.id)

        if (error) throw error

        toast({
          title: 'Horari actualitzat',
          description: 'L\'horari s\'ha actualitzat correctament'
        })
      } else {
        // Handle creation with multiple assignments
        let schedulesToCreate = []
        
        if (formData.semester_id === 'all-year') {
          // If "all-year" is selected, create entries for both semesters
          console.log('All semesters:', semesters)
          const yearSemesters = semesters.filter(s => s.number === 1 || s.number === 2)
          console.log('Year semesters:', yearSemesters)
          
          if (yearSemesters.length < 2) {
            toast({
              title: 'Error',
              description: 'No s\'han trobat els dos semestres del curs',
              variant: 'destructive'
            })
            setLoading(false)
            return
          }
          
          // Create entries for each time slot in each semester
          for (const semester of yearSemesters) {
            for (const assignment of timeSlotAssignments) {
              const scheduleEntry = {
                program_id: formData.program_id,
                classroom_id: assignment.classroom_id,
                day_of_week: assignment.day_of_week,
                start_time: assignment.start_time,
                end_time: assignment.end_time,
                semester_id: semester.id,
                teacher_id: formData.teacher_id || null,
                subject_name: formData.subject_name || null,
                notes: formData.notes || null,
                active: formData.active
              }
              
              // Validate required fields
              if (!scheduleEntry.program_id || !scheduleEntry.classroom_id || !scheduleEntry.semester_id) {
                console.error('Invalid schedule entry:', scheduleEntry)
                toast({
                  title: 'Error',
                  description: 'Falten camps obligatoris',
                  variant: 'destructive'
                })
                setLoading(false)
                return
              }
              
              schedulesToCreate.push(scheduleEntry)
            }
          }
        } else {
          // Single semester - create one entry per time slot
          schedulesToCreate = timeSlotAssignments.map(assignment => {
            const scheduleEntry = {
              program_id: formData.program_id,
              classroom_id: assignment.classroom_id,
              day_of_week: assignment.day_of_week,
              start_time: assignment.start_time,
              end_time: assignment.end_time,
              semester_id: formData.semester_id,
              teacher_id: formData.teacher_id || null,
              subject_name: formData.subject_name || null,
              notes: formData.notes || null,
              active: formData.active
            }
            
            // Validate required fields
            if (!scheduleEntry.program_id || !scheduleEntry.classroom_id || !scheduleEntry.semester_id) {
              console.error('Invalid schedule entry:', scheduleEntry)
              throw new Error('Falten camps obligatoris per crear l\'horari')
            }
            
            return scheduleEntry
          })
        }
        
        console.log('About to insert schedules:', JSON.stringify(schedulesToCreate, null, 2))
        
        const { data, error } = await supabase
          .from('master_schedules')
          .insert(schedulesToCreate)
          .select()
        
        console.log('Insert result:', { data, error })
        
        if (error) {
          console.error('Supabase error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          throw error
        }
        
        const assignmentCount = schedulesToCreate.length
        const timeSlotCount = timeSlotAssignments.length
        const isAllYear = formData.semester_id === 'all-year'
        
        toast({
          title: 'Horaris creats',
          description: isAllYear 
            ? `S'han creat ${assignmentCount} horaris (${timeSlotCount} franja/es × 2 semestres)`
            : assignmentCount === 1 
              ? 'S\'ha creat 1 horari' 
              : `S'han creat ${assignmentCount} horaris`
        })
      }

      onSuccess()
    } catch (error: any) {
      console.error('Full error object:', error)
      console.error('Error type:', typeof error)
      console.error('Error constructor:', error?.constructor?.name)
      console.error('Error message:', error?.message)
      console.error('Error string:', error?.toString())
      console.error('Error JSON:', JSON.stringify(error))
      
      let errorMessage = 'No s\'ha pogut guardar l\'horari'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.details) {
        errorMessage = error.details
      } else if (error?.hint) {
        errorMessage = error.hint
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const generateTimeOptions = () => {
    const options = []
    for (let hour = 8; hour <= 21; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const time = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
        options.push(time)
      }
    }
    return options
  }

  const timeOptions = generateTimeOptions()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-full w-[95vw] h-[95vh] max-h-[95vh] overflow-hidden flex flex-col">
        <form onSubmit={handleSubmit} className="flex flex-col h-full">
          <DialogHeader>
            <DialogTitle>
              {schedule ? 'Editar horari' : 'Afegir nou horari'}
            </DialogTitle>
            <DialogDescription>
              {schedule ? 'Modifica els detalls de l\'horari' : 'Crea un nou horari per a un màster o postgrau'}
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-1">
            <div className="grid gap-6 py-4">
              {/* Program Selection - Full Width */}
              <div className="space-y-2">
                <Label htmlFor="program_id">Programa</Label>
                <Popover open={programSearchOpen} onOpenChange={setProgramSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      role="combobox"
                      aria-expanded={programSearchOpen}
                      className="w-full justify-between"
                    >
                      {formData.program_id
                        ? programs.find((program) => program.id === formData.program_id)?.name
                        : "Selecciona un programa..."}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Buscar programa..." 
                        value={programSearchValue}
                        onValueChange={setProgramSearchValue}
                      />
                      <CommandEmpty>No s'ha trobat cap programa.</CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-y-auto">
                        {programs
                          .filter(program => {
                            const searchLower = programSearchValue.toLowerCase()
                            return (program.name?.toLowerCase() || '').includes(searchLower) ||
                                   (program.code?.toLowerCase() || '').includes(searchLower)
                          })
                          .map((program) => (
                            <CommandItem
                              key={program.id}
                              value={`${program.name || ''} ${program.code || ''}`}
                              onSelect={() => {
                                setFormData({ ...formData, program_id: program.id })
                                setProgramSearchOpen(false)
                                setProgramSearchValue("")
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  formData.program_id === program.id ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div>
                                <div className="font-medium">{program.name || 'Sense nom'}</div>
                                {program.code && (
                                  <div className="text-sm text-gray-500">{program.code}</div>
                                )}
                              </div>
                            </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Time Slot Assignments */}
              <div className="space-y-2">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-base font-semibold">Franges horàries i aules</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addTimeSlotAssignment}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    Afegir franja horària
                  </Button>
                </div>
                <div className="space-y-4">
                  {timeSlotAssignments.map((assignment, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                      <div className="grid grid-cols-12 gap-3">
                        <div className="col-span-2">
                          <Label className="text-sm">Dia</Label>
                          <Select
                            value={assignment.day_of_week.toString()}
                            onValueChange={(value) => updateTimeSlotAssignment(index, 'day_of_week', parseInt(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {DAYS.map(day => (
                                <SelectItem key={day.value} value={day.value.toString()}>
                                  {day.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="col-span-2">
                          <Label className="text-sm">Hora inici</Label>
                          <Select
                            value={assignment.start_time}
                            onValueChange={(value) => updateTimeSlotAssignment(index, 'start_time', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map(time => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="col-span-2">
                          <Label className="text-sm">Hora fi</Label>
                          <Select
                            value={assignment.end_time}
                            onValueChange={(value) => updateTimeSlotAssignment(index, 'end_time', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {timeOptions.map(time => (
                                <SelectItem key={time} value={time}>
                                  {time}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="col-span-5">
                          <Label className="text-sm">Aula</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                role="combobox"
                                className="w-full justify-between"
                              >
                                {assignment.classroom_id
                                  ? (() => {
                                      const classroom = classrooms.find((c) => c.id === assignment.classroom_id)
                                      return classroom ? `${classroom.name || ''} - ${classroom.building || ''}` : "Selecciona una aula..."
                                    })()
                                  : "Selecciona una aula..."}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[400px] p-0">
                              <Command>
                                <CommandInput 
                                  placeholder="Buscar aula..." 
                                />
                                <CommandEmpty>No s'ha trobat cap aula.</CommandEmpty>
                                <CommandGroup className="max-h-[300px] overflow-y-auto">
                                  {classrooms.map((classroom) => (
                                    <CommandItem
                                      key={classroom.id}
                                      value={`${classroom.name || ''} ${classroom.building || ''}`}
                                      onSelect={() => {
                                        updateTimeSlotAssignment(index, 'classroom_id', classroom.id)
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          assignment.classroom_id === classroom.id ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      {classroom.name || 'Sense nom'} - {classroom.building || 'Sense edifici'}
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </Command>
                            </PopoverContent>
                          </Popover>
                        </div>
                        
                        <div className="col-span-1 flex items-end">
                          {timeSlotAssignments.length > 1 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTimeSlotAssignment(index)}
                              className="w-full"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Teacher, Subject and Semester - 3 columns */}
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="teacher_id">Professor (opcional)</Label>
                  <Select
                    value={formData.teacher_id}
                    onValueChange={(value) => setFormData({ ...formData, teacher_id: value === 'no-teacher' ? null : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un professor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="no-teacher">Sense professor</SelectItem>
                      {teachers.map(teacher => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.first_name} {teacher.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject_name">Nom de l'assignatura (opcional)</Label>
                  <Input
                    id="subject_name"
                    value={formData.subject_name}
                    onChange={(e) => setFormData({ ...formData, subject_name: e.target.value })}
                    placeholder="Ex: Disseny d'Experiència d'Usuari"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="semester_id">Semestre</Label>
                  <Select
                    value={formData.semester_id}
                    onValueChange={(value) => setFormData({ ...formData, semester_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un semestre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all-year">Tot el curs (2 semestres)</SelectItem>
                      {semesters.map(semester => (
                        <SelectItem key={semester.id} value={semester.id}>
                          {semester.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Notes and Active Status */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes (opcional)</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Notes addicionals..."
                    rows={3}
                  />
                </div>

                <div className="flex items-start pt-8">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    />
                    <Label htmlFor="active" className="cursor-pointer">
                      Horari actiu
                    </Label>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="border-t pt-4 mt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel·lar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardant...' : schedule ? 'Actualitzar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}