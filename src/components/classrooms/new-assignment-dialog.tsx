'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { GraduationCap, Building, Clock, Users } from 'lucide-react'

interface NewAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignmentData: {
    day: number
    startTime: string
    endTime: string
    classroomId: string
  } | null
  semesterId: string
  onSuccess?: () => void
}

const daysOfWeek = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']

export function NewAssignmentDialog({
  open,
  onOpenChange,
  assignmentData,
  semesterId,
  onSuccess
}: NewAssignmentDialogProps) {
  const supabase = createClient()

  // Form state
  const [educationType, setEducationType] = useState<'degree' | 'master'>('degree')
  const [selectedDegree, setSelectedDegree] = useState('')
  const [selectedYear, setSelectedYear] = useState('')
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedStudentGroup, setSelectedStudentGroup] = useState('')
  const [selectedMaster, setSelectedMaster] = useState('')
  const [selectedProgram, setSelectedProgram] = useState('')
  const [customStartTime, setCustomStartTime] = useState('')
  const [customEndTime, setCustomEndTime] = useState('')

  // Data state
  const [subjects, setSubjects] = useState<any[]>([])
  const [studentGroups, setStudentGroups] = useState<any[]>([])
  const [masters, setMasters] = useState<any[]>([])
  const [programs, setPrograms] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Reset form when dialog opens
  useEffect(() => {
    if (open && assignmentData) {
      setEducationType('degree')
      setSelectedDegree('')
      setSelectedYear('')
      setSelectedSubject('')
      setSelectedStudentGroup('')
      setSelectedMaster('')
      setSelectedProgram('')
      setCustomStartTime(assignmentData.startTime.slice(0, 5))
      setCustomEndTime(assignmentData.endTime.slice(0, 5))
      loadMasters()
    }
  }, [open, assignmentData])

  // Load subjects when degree/year changes
  useEffect(() => {
    if (selectedDegree && selectedYear) {
      loadSubjects()
      loadStudentGroups()
    }
  }, [selectedDegree, selectedYear])

  // Load programs when master changes
  useEffect(() => {
    if (selectedMaster) {
      loadPrograms()
    }
  }, [selectedMaster])

  const loadMasters = async () => {
    try {
      const { data, error } = await supabase
        .from('masters')
        .select('*')
        .order('name')

      if (error) throw error
      setMasters(data || [])
    } catch (error) {
      console.error('Error loading masters:', error)
    }
  }

  const loadPrograms = async () => {
    if (!selectedMaster) return

    try {
      const { data, error } = await supabase
        .from('master_programs')
        .select('*')
        .eq('master_id', selectedMaster)
        .order('name')

      if (error) throw error
      setPrograms(data || [])
    } catch (error) {
      console.error('Error loading programs:', error)
    }
  }

  const loadSubjects = async () => {
    if (!selectedDegree || !selectedYear) return

    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .eq('course_type', selectedDegree)
        .eq('year', parseInt(selectedYear))
        .order('name')

      if (error) throw error
      setSubjects(data || [])
    } catch (error) {
      console.error('Error loading subjects:', error)
    }
  }

  const loadStudentGroups = async () => {
    if (!selectedYear) return

    try {
      const { data, error } = await supabase
        .from('student_groups')
        .select('*')
        .eq('year', parseInt(selectedYear))
        .order('name')

      if (error) throw error
      setStudentGroups(data || [])
    } catch (error) {
      console.error('Error loading student groups:', error)
    }
  }

  const handleSubmit = async () => {
    if (!assignmentData) return

    // Validation
    if (educationType === 'degree') {
      if (!selectedDegree || !selectedYear || !selectedSubject || !selectedStudentGroup) {
        toast.error('Si us plau, emplena tots els camps requerits')
        return
      }
    } else {
      if (!selectedMaster || !selectedProgram) {
        toast.error('Si us plau, emplena tots els camps requerits')
        return
      }
    }

    if (!customStartTime || !customEndTime) {
      toast.error('Si us plau, especifica les hores d\'inici i final')
      return
    }

    setLoading(true)

    try {
      // Create time slot first
      const { data: timeSlot, error: timeSlotError } = await supabase
        .from('time_slots')
        .insert({
          day_of_week: assignmentData.day,
          start_time: `${customStartTime}:00`,
          end_time: `${customEndTime}:00`
        })
        .select()
        .single()

      if (timeSlotError) throw timeSlotError

      // Create assignment
      const assignmentPayload: any = {
        classroom_id: assignmentData.classroomId,
        time_slot_id: timeSlot.id,
        semester_id: semesterId,
        hours_per_week: calculateHours(customStartTime, customEndTime)
      }

      if (educationType === 'degree') {
        assignmentPayload.subject_id = selectedSubject
        assignmentPayload.student_group_id = selectedStudentGroup
      } else {
        assignmentPayload.master_program_id = selectedProgram
      }

      const { error: assignmentError } = await supabase
        .from('assignments')
        .insert(assignmentPayload)

      if (assignmentError) throw assignmentError

      toast.success('Assignatura afegida correctament')
      onOpenChange(false)
      onSuccess?.()

    } catch (error: any) {
      console.error('Error creating assignment:', error)
      toast.error(error.message || 'Error al crear l\'assignatura')
    } finally {
      setLoading(false)
    }
  }

  const calculateHours = (start: string, end: string) => {
    const [startHour, startMin] = start.split(':').map(Number)
    const [endHour, endMin] = end.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = endHour * 60 + endMin
    return (endMinutes - startMinutes) / 60
  }

  if (!assignmentData) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Nova Assignatura
          </DialogTitle>
          <DialogDescription>
            Afegeix una nova assignatura el {daysOfWeek[assignmentData.day - 1]} de {customStartTime} a {customEndTime}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Time Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-time">Hora d'inici</Label>
              <Input
                id="start-time"
                type="time"
                value={customStartTime}
                onChange={(e) => setCustomStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end-time">Hora de final</Label>
              <Input
                id="end-time"
                type="time"
                value={customEndTime}
                onChange={(e) => setCustomEndTime(e.target.value)}
              />
            </div>
          </div>

          {/* Education Type Selection */}
          <div className="space-y-2">
            <Label>Tipus d'educació</Label>
            <Select value={educationType} onValueChange={(value: 'degree' | 'master') => setEducationType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="degree">Grau</SelectItem>
                <SelectItem value="master">Màster</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Degree Section */}
          {educationType === 'degree' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Grau</Label>
                  <Select value={selectedDegree} onValueChange={setSelectedDegree}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un grau" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="disseny">Grau en Disseny</SelectItem>
                      <SelectItem value="belles-arts">Grau en Belles Arts</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Curs</Label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un curs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1r Curs</SelectItem>
                      <SelectItem value="2">2n Curs</SelectItem>
                      <SelectItem value="3">3r Curs</SelectItem>
                      <SelectItem value="4">4t Curs</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Assignatura</Label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una assignatura" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name} ({subject.code})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Grup d'estudiants</Label>
                <Select value={selectedStudentGroup} onValueChange={setSelectedStudentGroup}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un grup" />
                  </SelectTrigger>
                  <SelectContent>
                    {studentGroups.map((group) => (
                      <SelectItem key={group.id} value={group.id}>
                        {group.name} ({group.shift === 'mati' ? 'Matí' : 'Tarda'})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Master Section */}
          {educationType === 'master' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Màster</Label>
                <Select value={selectedMaster} onValueChange={setSelectedMaster}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un màster" />
                  </SelectTrigger>
                  <SelectContent>
                    {masters.map((master) => (
                      <SelectItem key={master.id} value={master.id}>
                        {master.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedMaster && (
                <div className="space-y-2">
                  <Label>Programa</Label>
                  <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona un programa" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel·lar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creant...' : 'Crear Assignatura'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}