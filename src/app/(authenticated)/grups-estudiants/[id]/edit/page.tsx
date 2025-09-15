'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft, Save, Loader2, Plus, X, User } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
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
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"

interface SubjectGroup {
  id: string
  subject_id: string
  semester_id: string
  group_code: string
  max_students: number
  subject?: {
    id: string
    code: string
    name: string
  }
  semester?: {
    id: string
    name: string
  }
}

interface Teacher {
  id: string
  first_name: string
  last_name: string
  email: string
  department: string | null
}

interface TeacherAssignment {
  teacher_id: string
  teacher?: Teacher
  ects_assigned: number
}

export default function EditGroupPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [loadingAssignments, setLoadingAssignments] = useState(true)
  const [saving, setSaving] = useState(false)
  const [group, setGroup] = useState<SubjectGroup | null>(null)
  const [formData, setFormData] = useState({
    group_code: '',
    max_students: 0,
    semester_id: ''
  })
  const [semesters, setSemesters] = useState<any[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [teacherAssignments, setTeacherAssignments] = useState<TeacherAssignment[]>([])
  const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
  const [ectsToAssign, setEctsToAssign] = useState<string>('')
  const [teacherSearchTerm, setTeacherSearchTerm] = useState<string>('')
  const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadGroup()
    loadSemesters()
    loadTeachers()
  }, [params.id])

  const loadGroup = async () => {
    try {
      const { data, error } = await supabase
        .from('subject_groups')
        .select(`
          *,
          subjects(id, code, name),
          semesters(id, name)
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      
      setGroup(data)
      setFormData({
        group_code: data.group_code,
        max_students: data.max_students,
        semester_id: data.semester_id
      })
      
      // Load teacher assignments for this group
      console.log('Loading teacher assignments for group:', params.id)
      await loadTeacherAssignments(params.id as string)
    } catch (error) {
      console.error('Error loading group:', error)
      toast.error('Error carregant el grup')
    } finally {
      setLoading(false)
    }
  }

  const loadSemesters = async () => {
    try {
      const { data, error } = await supabase
        .from('semesters')
        .select('id, name')
        .order('name')

      if (error) throw error
      setSemesters(data || [])
    } catch (error) {
      console.error('Error loading semesters:', error)
    }
  }

  const loadTeachers = async () => {
    try {
      const { data, error } = await supabase
        .from('teachers')
        .select('id, first_name, last_name, email, department')
        .order('last_name')

      if (error) throw error
      setTeachers(data || [])
    } catch (error) {
      console.error('Error loading teachers:', error)
    }
  }

  const loadTeacherAssignments = async (groupId: string) => {
    try {
      setLoadingAssignments(true)
      const { data, error } = await supabase
        .rpc('get_group_teacher_assignments', { p_group_id: groupId })

      if (error) {
        console.error('Error loading teacher assignments:', error)
        throw error
      }
      
      console.log('Loaded teacher assignments from RPC:', data)
      
      const assignments = (data || []).map((item: any) => ({
        teacher_id: item.teacher_id,
        teacher: {
          id: item.teacher_id,
          first_name: item.first_name,
          last_name: item.last_name,
          email: item.email,
          department: item.department
        },
        ects_assigned: parseFloat(item.ects_assigned) || 0
      }))
      
      console.log('Formatted assignments:', assignments)
      setTeacherAssignments(assignments)
    } catch (error) {
      console.error('Error loading teacher assignments:', error)
      setTeacherAssignments([])
    } finally {
      setLoadingAssignments(false)
    }
  }

  const addTeacherAssignment = () => {
    if (!selectedTeacherId || !ectsToAssign) {
      toast.error('Selecciona un professor i assigna els ECTS')
      return
    }

    const ectsValue = parseFloat(ectsToAssign)
    if (isNaN(ectsValue) || ectsValue <= 0) {
      toast.error('Els ECTS han de ser un número vàlid major que 0')
      return
    }

    const teacher = teachers.find(t => t.id === selectedTeacherId)
    if (!teacher) {
      toast.error('Professor no trobat')
      return
    }

    // Check if teacher is already assigned
    if (teacherAssignments.some(ta => ta.teacher_id === selectedTeacherId)) {
      toast.error('Aquest professor ja està assignat a aquest grup')
      return
    }

    console.log('Adding teacher assignment:', {
      teacher_id: selectedTeacherId,
      teacher_name: `${teacher.first_name} ${teacher.last_name}`,
      ects_assigned: ectsValue
    })

    setTeacherAssignments([...teacherAssignments, {
      teacher_id: selectedTeacherId,
      teacher: teacher,
      ects_assigned: ectsValue
    }])

    setSelectedTeacherId('')
    setEctsToAssign('')
    setTeacherSearchTerm('')
  }

  const removeTeacherAssignment = (teacherId: string) => {
    setTeacherAssignments(teacherAssignments.filter(ta => ta.teacher_id !== teacherId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      // Update group basic info
      const { error: groupError } = await supabase
        .from('subject_groups')
        .update({
          group_code: formData.group_code,
          max_students: formData.max_students,
          semester_id: formData.semester_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', params.id)

      if (groupError) throw groupError

      // Delete existing teacher assignments
      console.log('Deleting existing teacher assignments for group:', params.id)
      const { error: deleteError } = await supabase
        .from('teacher_group_assignments')
        .delete()
        .eq('subject_group_id', params.id)
        .eq('academic_year', '2025-2026')

      if (deleteError) {
        console.error('Error deleting teacher assignments:', deleteError)
        throw deleteError
      }

      // Insert new teacher assignments
      if (teacherAssignments.length > 0) {
        const insertData = teacherAssignments.map(ta => ({
          teacher_id: ta.teacher_id,
          subject_group_id: params.id,
          academic_year: '2025-2026',
          ects_assigned: ta.ects_assigned || 0,
          is_coordinator: false
        }))

        console.log('Inserting teacher assignments:', insertData)

        const { data: insertedData, error: insertError } = await supabase
          .from('teacher_group_assignments')
          .insert(insertData)
          .select()

        if (insertError) {
          console.error('Error inserting teacher assignments:', insertError)

          // Check if it's a permissions error
          if (insertError.code === 'PGRST301' || insertError.message?.includes('row-level security')) {
            toast.error('No tens permisos per assignar professors. Contacta amb un administrador.')
            return
          }

          throw insertError
        }

        console.log('Successfully inserted teacher assignments:', insertedData)
      }

      toast.success('Grup actualitzat correctament')
      router.push('/grups-estudiants')
    } catch (error) {
      console.error('Error updating group:', error)
      toast.error('Error actualitzant el grup')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (!group) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Grup no trobat</CardTitle>
            <CardDescription>
              No s'ha pogut trobar el grup sol·licitat
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push('/grups-estudiants')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Tornar a grups
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/grups-estudiants')}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Editar Grup</h1>
          <p className="text-muted-foreground mt-2">
            {group.subject?.name} - {group.group_code}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Informació del Grup</CardTitle>
          <CardDescription>
            Actualitza la informació del grup
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="group_code">Codi del Grup</Label>
                <Input
                  id="group_code"
                  value={formData.group_code}
                  onChange={(e) => setFormData({ ...formData, group_code: e.target.value })}
                  placeholder="Ex: G1, G2, G3..."
                  required
                />
              </div>


              <div className="space-y-2">
                <Label htmlFor="max_students">Capacitat Màxima</Label>
                <Input
                  id="max_students"
                  type="number"
                  value={formData.max_students}
                  onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || 0 })}
                  min="1"
                  required
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
                    {semesters.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id}>
                        {semester.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Teacher Assignments Section */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-4">Professors Assignats</h3>
                
                {/* Current assignments */}
                {loadingAssignments ? (
                  <div className="mb-4 p-4 border rounded-lg text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Carregant professors assignats...</p>
                  </div>
                ) : teacherAssignments.length > 0 ? (
                  <div className="space-y-2 mb-4">
                    {teacherAssignments.map((assignment) => (
                      <div key={assignment.teacher_id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">
                              {assignment.teacher?.first_name} {assignment.teacher?.last_name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {assignment.ects_assigned} ECTS assignats
                            </p>
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeTeacherAssignment(assignment.teacher_id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mb-4 p-4 border-2 border-dashed rounded-lg text-center text-muted-foreground">
                    <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No hi ha professors assignats a aquest grup</p>
                  </div>
                )}

                {/* Add new assignment */}
                <div className="grid gap-4 md:grid-cols-3 items-end">
                  <div className="space-y-2">
                    <Label htmlFor="teacher">Afegir Professor</Label>
                    <Popover open={isTeacherDropdownOpen} onOpenChange={setIsTeacherDropdownOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={isTeacherDropdownOpen}
                          className="w-full justify-between"
                        >
                          {selectedTeacherId
                            ? teachers.find((teacher) => teacher.id === selectedTeacherId)?.last_name + ", " + 
                              teachers.find((teacher) => teacher.id === selectedTeacherId)?.first_name
                            : "Selecciona un professor..."}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command>
                          <CommandInput 
                            placeholder="Buscar professor..." 
                            value={teacherSearchTerm}
                            onValueChange={setTeacherSearchTerm}
                          />
                          <CommandEmpty>No s'ha trobat cap professor.</CommandEmpty>
                          <CommandGroup className="max-h-64 overflow-auto">
                            {teachers
                              .filter(t => !teacherAssignments.some(ta => ta.teacher_id === t.id))
                              .filter(teacher => {
                                const searchLower = teacherSearchTerm.toLowerCase()
                                const fullName = `${teacher.first_name} ${teacher.last_name}`.toLowerCase()
                                const reverseFullName = `${teacher.last_name} ${teacher.first_name}`.toLowerCase()
                                return fullName.includes(searchLower) || 
                                       reverseFullName.includes(searchLower) ||
                                       teacher.email.toLowerCase().includes(searchLower) ||
                                       (teacher.department && teacher.department.toLowerCase().includes(searchLower))
                              })
                              .map((teacher) => (
                                <CommandItem
                                  key={teacher.id}
                                  value={teacher.id}
                                  onSelect={(currentValue) => {
                                    setSelectedTeacherId(currentValue === selectedTeacherId ? "" : currentValue)
                                    setIsTeacherDropdownOpen(false)
                                    setTeacherSearchTerm("")
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      selectedTeacherId === teacher.id ? "opacity-100" : "opacity-0"
                                    )}
                                  />
                                  <div className="flex flex-col">
                                    <span>{teacher.last_name}, {teacher.first_name}</span>
                                    <span className="text-xs text-muted-foreground">{teacher.email}</span>
                                  </div>
                                </CommandItem>
                              ))}
                          </CommandGroup>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="ects">ECTS a assignar</Label>
                    <Input
                      id="ects"
                      type="number"
                      step="0.5"
                      min="0"
                      max="12"
                      value={ectsToAssign}
                      onChange={(e) => setEctsToAssign(e.target.value)}
                      placeholder="6"
                    />
                  </div>
                  
                  <Button
                    type="button"
                    onClick={addTeacherAssignment}
                    disabled={!selectedTeacherId || !ectsToAssign}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Afegir
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Button type="submit" disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardant...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Canvis
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/grups-estudiants')}
              >
                Cancel·lar
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}