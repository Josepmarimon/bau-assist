'use client'

import { useState, useEffect } from 'react'
import { SubjectFormDialog } from '@/components/dialogs/subject-form-dialog'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { 
  BookOpen,
  Search,
  Plus,
  Clock,
  Users,
  Calendar,
  Edit,
  Trash2,
  Eye,
  X,
  GraduationCap,
  ChevronDown,
  ChevronRight,
  School,
  Package,
  Hash,
  MapPin,
  User,
  Loader2,
  Check,
  ChevronsUpDown,
  Mail,
  FileSpreadsheet
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
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
import { cn } from "@/lib/utils"
import { SubjectGroupProfilesList } from '@/components/subject-group-profiles/subject-group-profiles-list'
import { ClassroomAssignmentDialog } from '@/components/subjects/classroom-assignment-dialog'
import { SubjectDetailModal } from '@/components/subjects/subject-detail-modal'
import * as XLSX from 'xlsx'

interface Subject {
  id: string
  code: string
  name: string
  credits: number
  year: number
  semester: string
  type: string
  department: string | null
  active: boolean
  itinerari?: string | null
  degree?: string | null
  groupCount?: number
  password?: string | null
  username?: string | null
}

interface SubjectGroup {
  id: string
  subject_id: string
  semester_id: string
  group_code: string
  max_students: number
  created_at: string
  updated_at: string
  student_group_id?: string | null
  semester?: {
    name: string
    academic_year?: {
      name: string
    }
  }
  current_students?: number
  num_teachers?: number
  teacher_names?: string
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

interface SoftwareRequirement {
  id: string
  software: {
    id: string
    name: string
    category: string
    license_type: string
  }
  academic_year: string
  is_required: boolean
  notes?: string
}

interface Filters {
  grau: string
  curs: string
  itinerari: string
  semestre: string
  nom: string
}

export default function AssignaturesGrupsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [filters, setFilters] = useState<Filters>({
    grau: 'GD',
    curs: '',
    itinerari: '',
    semestre: '',
    nom: ''
  })
  const [subjectGroups, setSubjectGroups] = useState<Record<string, SubjectGroup[]>>({})
  const [loadingGroups, setLoadingGroups] = useState<Record<string, boolean>>({})
  const [softwareRequirements, setSoftwareRequirements] = useState<Record<string, SoftwareRequirement[]>>({})
  const [loadingSoftware, setLoadingSoftware] = useState<Record<string, boolean>>({})
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [semesters, setSemesters] = useState<any[]>([])
  
  // Edit mode states
  const [editingGroup, setEditingGroup] = useState<string | null>(null)
  const [editFormData, setEditFormData] = useState<any>({})
  const [teacherAssignments, setTeacherAssignments] = useState<Record<string, TeacherAssignment[]>>({})
  const [groupAssignments, setGroupAssignments] = useState<Record<string, number>>({})
  const [groupAssignmentDetails, setGroupAssignmentDetails] = useState<Record<string, any[]>>({})
  
  // Subject edit states
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null)
  const [showSubjectForm, setShowSubjectForm] = useState(false)
  const [graus, setGraus] = useState<any[]>([])
  
  // Classroom assignment states
  const [showClassroomDialog, setShowClassroomDialog] = useState(false)
  const [selectedGroupForClassroom, setSelectedGroupForClassroom] = useState<SubjectGroup | null>(null)
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>('')
  
  // Subject detail modal states
  const [showSubjectDetailModal, setShowSubjectDetailModal] = useState(false)
  const [selectedSubjectForDetail, setSelectedSubjectForDetail] = useState<Subject | null>(null)
  
  const supabase = createClient()

  useEffect(() => {
    loadSubjects()
    loadTeachers()
    loadSemesters()
    loadGraus()
  }, [])

  useEffect(() => {
    // Check for subject parameter in URL when subjects are loaded
    const urlParams = new URLSearchParams(window.location.search)
    const subjectId = urlParams.get('subject')
    if (subjectId && subjects.length > 0) {
      const subject = subjects.find(s => s.id === subjectId)
      if (subject) {
        setSelectedSubjectForDetail(subject)
        setShowSubjectDetailModal(true)
      }
    }
  }, [subjects])

  useEffect(() => {
    if (filters.grau) {
      loadSubjects()
    }
  }, [filters.grau])

  const loadSubjects = async () => {
    try {
      setLoading(true)
      let query = supabase
        .from('subjects')
        .select(`
          *,
          itinerari:"ID Itinerari",
          subject_groups(count)
        `)
        .order('code', { ascending: true })

      // Apply degree filter
      if (filters.grau && filters.grau !== 'all') {
        query = query.like('code', `${filters.grau}%`)
      }

      const { data, error } = await query

      if (error) throw error
      
      // Process the data to include group counts
      const processedData = (data || []).map(subject => {
        const groupCount = subject.subject_groups?.[0]?.count || 0
        return {
          ...subject,
          groupCount
        }
      })
      
      setSubjects(processedData)
    } catch (error) {
      console.error('Error loading subjects:', error)
    } finally {
      setLoading(false)
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

  const loadGraus = async () => {
    try {
      const { data, error } = await supabase
        .from('graus')
        .select('id, nom')
        .order('nom')

      if (error) throw error
      setGraus(data || [])
    } catch (error) {
      console.error('Error loading graus:', error)
    }
  }

  const loadSubjectGroups = async (subjectId: string) => {
    try {
      setLoadingGroups(prev => ({ ...prev, [subjectId]: true }))
      
      const { data, error } = await supabase
        .from('subject_groups')
        .select(`
          *,
          semesters(
            name,
            academic_years(
              name
            )
          )
        `)
        .eq('subject_id', subjectId)
        .order('group_code', { ascending: true })

      if (error) throw error
      
      // Get teacher names for groups
      let teacherNames: Record<string, string> = {}
      
      const { data: teacherData } = await supabase
        .rpc('get_teacher_names_for_subject', { p_subject_id: subjectId })
      
      if (teacherData) {
        teacherData.forEach((item: any) => {
          teacherNames[item.subject_group_id] = item.teacher_names
        })
      }
      
      // Get assignments with classroom and time slot info for groups
      const groupIds = (data || []).map(g => g.id)
      const { data: assignmentData } = await supabase
        .from('assignments')
        .select(`
          subject_group_id,
          time_slots (
            day_of_week,
            start_time,
            end_time
          ),
          assignment_classrooms (
            classrooms (
              name,
              building
            ),
            is_full_semester,
            week_range_type,
            assignment_classroom_weeks (
              week_number
            )
          )
        `)
        .in('subject_group_id', groupIds)
      
      const assignmentCounts: Record<string, number> = {}
      const groupAssignmentDetails: Record<string, any[]> = {}
      
      if (assignmentData) {
        assignmentData.forEach((assignment: any) => {
          assignmentCounts[assignment.subject_group_id] = 
            (assignmentCounts[assignment.subject_group_id] || 0) + 1
          
          if (!groupAssignmentDetails[assignment.subject_group_id]) {
            groupAssignmentDetails[assignment.subject_group_id] = []
          }
          
          groupAssignmentDetails[assignment.subject_group_id].push({
            day: assignment.time_slots?.day_of_week,
            startTime: assignment.time_slots?.start_time,
            endTime: assignment.time_slots?.end_time,
            classrooms: assignment.assignment_classrooms?.map((ac: any) => ({
              name: ac.classrooms?.name,
              building: ac.classrooms?.building,
              is_full_semester: ac.is_full_semester,
              weeks: ac.assignment_classroom_weeks?.map((w: any) => w.week_number) || []
            })) || []
          })
        })
      }
      
      setGroupAssignments(prev => ({ ...prev, ...assignmentCounts }))
      setGroupAssignmentDetails(prev => ({ ...prev, ...groupAssignmentDetails }))
      
      const groupsWithTeachers = (data || []).map((group) => ({
        ...group,
        semester: group.semesters,
        teacher_names: teacherNames[group.id] || ''
      }))
      
      setSubjectGroups(prev => ({ ...prev, [subjectId]: groupsWithTeachers }))
    } catch (error) {
      console.error('Error loading subject groups:', error)
    } finally {
      setLoadingGroups(prev => ({ ...prev, [subjectId]: false }))
    }
  }

  const loadSoftwareRequirements = async (subjectId: string) => {
    try {
      setLoadingSoftware(prev => ({ ...prev, [subjectId]: true }))
      
      const { data, error } = await supabase
        .from('subject_software')
        .select(`
          id,
          academic_year,
          is_required,
          notes,
          software:software_id (
            id,
            name,
            category,
            license_type
          )
        `)
        .eq('subject_id', subjectId)
        .order('academic_year', { ascending: false })

      if (error) throw error
      setSoftwareRequirements(prev => ({ ...prev, [subjectId]: (data as any) || [] }))
    } catch (error) {
      console.error('Error loading software requirements:', error)
    } finally {
      setLoadingSoftware(prev => ({ ...prev, [subjectId]: false }))
    }
  }

  const loadTeacherAssignments = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .rpc('get_group_teacher_assignments', { p_group_id: groupId })

      if (error) throw error
      
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
      
      setTeacherAssignments(prev => ({ ...prev, [groupId]: assignments }))
    } catch (error) {
      console.error('Error loading teacher assignments:', error)
    }
  }

  const toggleSubject = async (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects)
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId)
    } else {
      newExpanded.add(subjectId)
      // Load data when expanding
      if (!subjectGroups[subjectId]) {
        await loadSubjectGroups(subjectId)
      }
      if (!softwareRequirements[subjectId]) {
        await loadSoftwareRequirements(subjectId)
      }
    }
    setExpandedSubjects(newExpanded)
  }

  const startEditGroup = async (group: SubjectGroup) => {
    setEditingGroup(group.id)
    setEditFormData({
      group_code: group.group_code,
      max_students: group.max_students,
      semester_id: group.semester_id
    })
    await loadTeacherAssignments(group.id)
  }

  const startEditSubject = (subject: Subject) => {
    setEditingSubject(subject)
    setShowSubjectForm(true)
  }

  const cancelEditGroup = () => {
    setEditingGroup(null)
    setEditFormData({})
  }

  const saveGroupChanges = async (groupId: string, subjectId: string) => {
    try {
      // Update group basic info
      const { error: groupError } = await supabase
        .from('subject_groups')
        .update({
          group_code: editFormData.group_code,
          max_students: editFormData.max_students,
          semester_id: editFormData.semester_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', groupId)

      if (groupError) throw groupError

      // Update teacher assignments
      const { error: deleteError } = await supabase
        .from('teacher_group_assignments')
        .delete()
        .eq('subject_group_id', groupId)
        .eq('academic_year', '2025-2026')

      if (deleteError) throw deleteError

      const assignments = teacherAssignments[groupId] || []
      if (assignments.length > 0) {
        const { error: insertError } = await supabase
          .from('teacher_group_assignments')
          .insert(
            assignments.map(ta => ({
              teacher_id: ta.teacher_id,
              subject_group_id: groupId,
              academic_year: '2025-2026',
              ects_assigned: ta.ects_assigned,
              is_coordinator: false
            }))
          )

        if (insertError) throw insertError
      }

      toast.success('Grup actualitzat correctament')
      setEditingGroup(null)
      setEditFormData({})
      // Reload groups
      await loadSubjectGroups(subjectId)
    } catch (error) {
      console.error('Error updating group:', error)
      toast.error('Error actualitzant el grup')
    }
  }

  const deleteGroup = async (groupId: string, subjectId: string) => {
    if (!confirm('Estàs segur que vols eliminar aquest grup?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('subject_groups')
        .delete()
        .eq('id', groupId)

      if (error) throw error

      toast.success('Grup eliminat correctament')
      await loadSubjectGroups(subjectId)
    } catch (error) {
      console.error('Error deleting group:', error)
      toast.error('Error eliminant el grup')
    }
  }

  const deleteSubject = async (subjectId: string) => {
    if (!confirm('Estàs segur que vols eliminar aquesta assignatura?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId)

      if (error) throw error

      toast.success('Assignatura eliminada correctament')
      await loadSubjects()
    } catch (error) {
      console.error('Error deleting subject:', error)
      toast.error('Error eliminant l\'assignatura')
    }
  }

  const filteredSubjects = subjects.filter(subject => {
    const search = (filters.nom || searchTerm).toLowerCase()
    
    // Cerca flexible: divideix el text de cerca en paraules i comprova que totes estiguin presents
    const matchesSearch = !search || (() => {
      const searchWords = search.split(/\s+/).filter(word => word.length > 0)
      const subjectText = `${subject.name} ${subject.code}`.toLowerCase()
      
      // Totes les paraules de cerca han d'estar presents al nom o codi
      return searchWords.every(word => subjectText.includes(word))
    })()
    
    const matchesCurs = !filters.curs || filters.curs === 'all' || subject.year.toString() === filters.curs
    const matchesItinerari = !filters.itinerari || filters.itinerari === 'all' || subject.itinerari === filters.itinerari
    const matchesSemestre = !filters.semestre || filters.semestre === 'all' || subject.semester === filters.semestre
    
    return matchesSearch && matchesCurs && matchesItinerari && matchesSemestre
  })

  const totalECTS = filteredSubjects.reduce((sum, subject) => sum + subject.credits, 0)
  const totalGroups = filteredSubjects.reduce((sum, subject) => 
    sum + (subject.groupCount || 0), 0
  )

  // Get unique values for filters
  const uniqueYears = [...new Set(subjects.map(s => s.year))].sort()
  const uniqueItineraris = [...new Set(subjects.map(s => s.itinerari).filter(Boolean))] as string[]
  const uniqueSemesters = [...new Set(subjects.map(s => s.semester))].sort()

  const clearFilter = (filterName: keyof Filters) => {
    setFilters(prev => ({ ...prev, [filterName]: '' }))
  }

  const clearAllFilters = () => {
    setFilters({
      grau: filters.grau,
      curs: '',
      itinerari: '',
      semestre: '',
      nom: ''
    })
    setSearchTerm('')
  }

  const hasActiveFilters = Object.entries(filters).some(([key, value]) => 
    key !== 'grau' && value !== '' && value !== 'all'
  ) || searchTerm !== ''

  const sendCredentials = async (subjectId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('Cal estar autenticat per enviar credencials')
        return
      }

      const response = await supabase.functions.invoke('send-credentials', {
        body: { subjectId }
      })

      if (response.error) {
        throw response.error
      }

      const result = response.data
      if (result.success) {
        toast.success(`Credencials enviades correctament a ${result.sent} professor${result.sent !== 1 ? 's' : ''}`)
        if (result.failed > 0) {
          toast.warning(`No s'han pogut enviar ${result.failed} email${result.failed !== 1 ? 's' : ''}`)
        }
      } else {
        throw new Error(result.error || 'Error desconegut')
      }
    } catch (error: any) {
      console.error('Error sending credentials:', error)
      toast.error(error.message || 'Error enviant les credencials')
    }
  }

  const exportCredentialsToExcel = async () => {
    try {
      // Show loading toast
      const loadingToast = toast.loading('Carregant dades per exportar...')
      
      // Get ALL subjects with credentials, not just filtered ones
      const { data: allSubjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .or('username.not.is.null,password.not.is.null')
        .order('code', { ascending: true })

      if (subjectsError) throw subjectsError
      
      const subjectsWithCredentials = allSubjectsData || []
      
      if (subjectsWithCredentials.length === 0) {
        toast.dismiss(loadingToast)
        toast.error('No hi ha assignatures amb credencials per exportar')
        return
      }

      console.log(`Trobades ${subjectsWithCredentials.length} assignatures amb credencials`)

      const exportData: any[] = []

      // For each subject with credentials
      for (const subject of subjectsWithCredentials) {
        // Get all groups for this subject
        const { data: groupsData, error: groupsError } = await supabase
          .from('subject_groups')
          .select('id, group_code')
          .eq('subject_id', subject.id)

        if (groupsError) {
          console.error(`Error loading groups for subject ${subject.code}:`, groupsError)
          continue
        }

        const groups = groupsData || []
        
        // Get unique teachers from all groups
        const teachersMap = new Map<string, any>()
        
        for (const group of groups) {
          // Get teacher assignments directly from database
          const { data: assignmentsData, error: assignmentsError } = await supabase
            .rpc('get_group_teacher_assignments', { p_group_id: group.id })

          if (assignmentsError) {
            console.error(`Error loading teachers for group ${group.group_code}:`, assignmentsError)
            continue
          }
          
          const assignments = assignmentsData || []
          
          for (const assignment of assignments) {
            if (assignment.email) {
              teachersMap.set(assignment.teacher_id, {
                id: assignment.teacher_id,
                first_name: assignment.first_name,
                last_name: assignment.last_name,
                email: assignment.email,
                department: assignment.department
              })
            }
          }
        }

        // Add a row for each unique teacher
        teachersMap.forEach(teacher => {
          exportData.push({
            'Nom': teacher.first_name,
            'Cognoms': teacher.last_name,
            'Email': teacher.email,
            'Assignatura': subject.name,
            'Codi Assignatura': subject.code,
            'Usuari': subject.username || '',
            'Contrasenya': subject.password || '',
            'Departament': teacher.department || ''
          })
        })
      }

      toast.dismiss(loadingToast)

      if (exportData.length === 0) {
        toast.error('No hi ha professors assignats a les assignatures amb credencials')
        return
      }

      // Create workbook
      const ws = XLSX.utils.json_to_sheet(exportData)
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Credencials')

      // Auto-size columns
      const colWidths = [
        { wch: 15 }, // Nom
        { wch: 20 }, // Cognoms
        { wch: 30 }, // Email
        { wch: 40 }, // Assignatura
        { wch: 15 }, // Codi
        { wch: 20 }, // Usuari
        { wch: 20 }, // Contrasenya
        { wch: 20 }  // Departament
      ]
      ws['!cols'] = colWidths

      // Generate filename with date
      const date = new Date().toISOString().split('T')[0]
      const filename = `credencials_assignatures_${date}.xlsx`

      // Download file
      XLSX.writeFile(wb, filename)
      
      toast.success(`Excel exportat amb ${exportData.length} registres`)
    } catch (error) {
      console.error('Error exporting credentials:', error)
      toast.error('Error exportant les credencials a Excel')
    }
  }

  // Helper function for teacher assignment UI
  const TeacherAssignmentUI = ({ groupId }: { groupId: string }) => {
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>('')
    const [ectsToAssign, setEctsToAssign] = useState<string>('')
    const [teacherSearchTerm, setTeacherSearchTerm] = useState<string>('')
    const [isTeacherDropdownOpen, setIsTeacherDropdownOpen] = useState(false)
    
    const assignments = teacherAssignments[groupId] || []

    const addTeacherAssignment = () => {
      if (!selectedTeacherId || !ectsToAssign) {
        toast.error('Selecciona un professor i assigna els ECTS')
        return
      }

      const teacher = teachers.find(t => t.id === selectedTeacherId)
      if (!teacher) return

      if (assignments.some(ta => ta.teacher_id === selectedTeacherId)) {
        toast.error('Aquest professor ja està assignat a aquest grup')
        return
      }

      setTeacherAssignments(prev => ({
        ...prev,
        [groupId]: [...(prev[groupId] || []), {
          teacher_id: selectedTeacherId,
          teacher: teacher,
          ects_assigned: parseFloat(ectsToAssign)
        }]
      }))

      setSelectedTeacherId('')
      setEctsToAssign('')
      setTeacherSearchTerm('')
    }

    const removeTeacherAssignment = (teacherId: string) => {
      setTeacherAssignments(prev => ({
        ...prev,
        [groupId]: (prev[groupId] || []).filter(ta => ta.teacher_id !== teacherId)
      }))
    }

    return (
      <div className="space-y-4 mt-4">
        <h4 className="text-sm font-medium">Professors Assignats</h4>
        
        {assignments.length > 0 ? (
          <div className="space-y-2">
            {assignments.map((assignment) => (
              <div key={assignment.teacher_id} className="flex items-center justify-between p-2 border rounded-lg">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    {assignment.teacher?.first_name} {assignment.teacher?.last_name}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {assignment.ects_assigned} ECTS
                  </Badge>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeTeacherAssignment(assignment.teacher_id)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No hi ha professors assignats</p>
        )}

        <div className="grid gap-2 grid-cols-3 items-end">
          <div className="col-span-2">
            <Popover open={isTeacherDropdownOpen} onOpenChange={setIsTeacherDropdownOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  size="sm"
                  className="w-full justify-between"
                >
                  {selectedTeacherId
                    ? teachers.find((t) => t.id === selectedTeacherId)?.last_name + ", " + 
                      teachers.find((t) => t.id === selectedTeacherId)?.first_name
                    : "Selecciona professor..."}
                  <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
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
                  <CommandGroup className="max-h-48 overflow-auto">
                    {teachers
                      .filter(t => !assignments.some(ta => ta.teacher_id === t.id))
                      .filter(teacher => {
                        const searchLower = teacherSearchTerm.toLowerCase()
                        const fullName = `${teacher.first_name} ${teacher.last_name}`.toLowerCase()
                        return fullName.includes(searchLower) || teacher.email.toLowerCase().includes(searchLower)
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
                              "mr-2 h-3 w-3",
                              selectedTeacherId === teacher.id ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <span className="text-sm">{teacher.last_name}, {teacher.first_name}</span>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="flex gap-1">
            <Input
              type="number"
              step="0.5"
              min="0"
              max="12"
              value={ectsToAssign}
              onChange={(e) => setEctsToAssign(e.target.value)}
              placeholder="ECTS"
              className="w-20"
            />
            <Button
              size="sm"
              onClick={addTeacherAssignment}
              disabled={!selectedTeacherId || !ectsToAssign}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignatures i Grups</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona les assignatures i els seus grups
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={exportCredentialsToExcel}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar Credencials
          </Button>
          <Button onClick={() => setShowSubjectForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Assignatura
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <Card className="p-3 bg-sky-50 border-sky-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assignatures</p>
              <p className="text-xl font-bold">{filteredSubjects.length}</p>
            </div>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3 bg-sky-50 border-sky-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Grups</p>
              <p className="text-xl font-bold">{totalGroups}</p>
            </div>
            <Users className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3 bg-sky-50 border-sky-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">ECTS Totals</p>
              <p className="text-xl font-bold">{totalECTS}</p>
            </div>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3 bg-sky-50 border-sky-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Professors</p>
              <p className="text-xl font-bold">{teachers.length}</p>
            </div>
            <School className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-sky-50 border-sky-200">
        <CardHeader>
          <CardTitle>Filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Name search - moved to first position */}
            <div className="relative col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cercar per nom o codi..."
                value={filters.nom || searchTerm}
                onChange={(e) => {
                  setFilters(prev => ({ ...prev, nom: e.target.value }))
                  setSearchTerm(e.target.value)
                }}
                className="pl-10"
              />
            </div>

            {/* Grau filter */}
            <Select value={filters.grau} onValueChange={(value) => setFilters(prev => ({ ...prev, grau: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GD">Grau en Disseny</SelectItem>
                <SelectItem value="GB">Grau en Belles Arts</SelectItem>
              </SelectContent>
            </Select>

            {/* Curs filter */}
            <Select value={filters.curs} onValueChange={(value) => setFilters(prev => ({ ...prev, curs: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Curs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tots els cursos</SelectItem>
                {uniqueYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}r curs
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Itinerari filter */}
            <Select value={filters.itinerari} onValueChange={(value) => setFilters(prev => ({ ...prev, itinerari: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Itinerari" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tots els itineraris</SelectItem>
                {uniqueItineraris.map(itinerari => (
                  <SelectItem key={itinerari} value={itinerari}>
                    {itinerari === 'A' ? 'Audiovisual' :
                     itinerari === 'G' ? 'Gràfic' :
                     itinerari === 'I' ? 'Espais' :
                     itinerari === 'M' ? 'Moda' :
                     itinerari}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Semestre filter */}
            <Select value={filters.semestre} onValueChange={(value) => setFilters(prev => ({ ...prev, semestre: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Semestre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tots els semestres</SelectItem>
                {uniqueSemesters.map(semester => (
                  <SelectItem key={semester} value={semester}>
                    {semester}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active filters */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 flex-wrap mt-4">
              <span className="text-sm text-muted-foreground">Filtres actius:</span>
              {filters.curs && filters.curs !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Curs: {filters.curs}r
                  <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter('curs')} />
                </Badge>
              )}
              {filters.itinerari && filters.itinerari !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Itinerari: {filters.itinerari}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter('itinerari')} />
                </Badge>
              )}
              {filters.semestre && filters.semestre !== 'all' && (
                <Badge variant="secondary" className="gap-1">
                  Semestre: {filters.semestre}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => clearFilter('semestre')} />
                </Badge>
              )}
              {(filters.nom || searchTerm) && (
                <Badge variant="secondary" className="gap-1">
                  Nom: {filters.nom || searchTerm}
                  <X className="h-3 w-3 cursor-pointer" onClick={() => {
                    clearFilter('nom')
                    setSearchTerm('')
                  }} />
                </Badge>
              )}
              <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs">
                Esborrar tot
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subject List */}
      <div className="space-y-4">
        {loading ? (
          <Card className="bg-sky-50 border-sky-200">
            <CardContent className="flex items-center justify-center h-64">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-48"></div>
                <div className="h-32 bg-muted rounded w-96"></div>
              </div>
            </CardContent>
          </Card>
        ) : filteredSubjects.length === 0 ? (
          <Card className="bg-sky-50 border-sky-200">
            <CardContent className="flex items-center justify-center h-32">
              <p className="text-muted-foreground">No s'han trobat assignatures</p>
            </CardContent>
          </Card>
        ) : (
          filteredSubjects.map((subject) => {
            const isExpanded = expandedSubjects.has(subject.id)
            const groups = subjectGroups[subject.id] || []
            const requirements = softwareRequirements[subject.id] || []
            
            return (
              <Card key={subject.id} className="overflow-hidden bg-sky-50 border-sky-200">
                <div 
                  className="cursor-pointer hover:bg-sky-100 transition-colors"
                  onClick={() => toggleSubject(subject.id)}
                >
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <CardTitle 
                            className="text-xl cursor-pointer hover:text-primary hover:underline transition-colors"
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedSubjectForDetail(subject)
                              setShowSubjectDetailModal(true)
                            }}
                          >
                            {subject.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                            <Badge variant="outline">{subject.code}</Badge>
                            <span>•</span>
                            <span>{subject.credits} ECTS</span>
                            <span>•</span>
                            <span>{subject.year}r curs</span>
                            <span>•</span>
                            <span>{subject.semester}</span>
                            {subject.itinerari && (
                              <>
                                <span>•</span>
                                <Badge variant="secondary">
                                  {subject.itinerari === 'A' ? 'Audiovisual' :
                                   subject.itinerari === 'G' ? 'Gràfic' :
                                   subject.itinerari === 'I' ? 'Espais' :
                                   subject.itinerari === 'M' ? 'Moda' :
                                   subject.itinerari}
                                </Badge>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          {subject.groupCount || 0} grups
                        </Badge>
                        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => startEditSubject(subject)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => deleteSubject(subject.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                </div>

                {isExpanded && (
                  <CardContent>
                    <Tabs defaultValue="groups" className="w-full">
                      <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="groups">Grups</TabsTrigger>
                        <TabsTrigger value="profiles">Perfils</TabsTrigger>
                        <TabsTrigger value="details">Detalls</TabsTrigger>
                        <TabsTrigger value="software">Software</TabsTrigger>
                      </TabsList>

                      {/* Groups Tab */}
                      <TabsContent value="groups" className="mt-4">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold">Grups de l'assignatura</h3>
                            <Button size="sm">
                              <Plus className="h-4 w-4 mr-2" />
                              Nou Grup
                            </Button>
                          </div>

                          {loadingGroups[subject.id] ? (
                            <div className="flex items-center justify-center h-32">
                              <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                          ) : groups.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p>No hi ha grups per aquesta assignatura</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {groups.map((group) => {
                                const isEditing = editingGroup === group.id
                                
                                return (
                                  <div key={group.id} className="border rounded-lg p-4">
                                    {isEditing ? (
                                      <div className="space-y-4">
                                        <div className="grid gap-4 grid-cols-3">
                                          <div>
                                            <Label>Codi del Grup</Label>
                                            <Input
                                              value={editFormData.group_code}
                                              onChange={(e) => setEditFormData({ ...editFormData, group_code: e.target.value })}
                                            />
                                          </div>
                                          <div>
                                            <Label>Capacitat</Label>
                                            <Input
                                              type="number"
                                              value={editFormData.max_students}
                                              onChange={(e) => setEditFormData({ ...editFormData, max_students: parseInt(e.target.value) || 0 })}
                                            />
                                          </div>
                                          <div>
                                            <Label>Semestre</Label>
                                            <Select
                                              value={editFormData.semester_id}
                                              onValueChange={(value) => setEditFormData({ ...editFormData, semester_id: value })}
                                            >
                                              <SelectTrigger>
                                                <SelectValue />
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

                                        <TeacherAssignmentUI groupId={group.id} />

                                        <div className="flex items-center gap-2">
                                          <Button 
                                            size="sm"
                                            onClick={() => saveGroupChanges(group.id, subject.id)}
                                          >
                                            Guardar
                                          </Button>
                                          <Button 
                                            size="sm" 
                                            variant="outline"
                                            onClick={cancelEditGroup}
                                          >
                                            Cancel·lar
                                          </Button>
                                        </div>
                                      </div>
                                    ) : (
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <div className="flex items-center gap-3 mb-2">
                                            <Badge variant="outline" className="font-mono">
                                              {group.group_code}
                                            </Badge>
                                            <span className="text-sm text-muted-foreground">
                                              Capacitat: {group.max_students} estudiants
                                            </span>
                                            {group.semester && (
                                              <Badge variant="secondary">
                                                {group.semester.name}
                                              </Badge>
                                            )}
                                          </div>
                                          {group.teacher_names && (
                                            <p className="text-sm text-muted-foreground">
                                              Professors: {group.teacher_names}
                                            </p>
                                          )}
                                          {groupAssignmentDetails[group.id] && groupAssignmentDetails[group.id].length > 0 && (
                                            <div className="text-sm text-muted-foreground mt-1">
                                              {groupAssignmentDetails[group.id].map((assignment, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                  <span className="font-medium">
                                                    {assignment.day === 1 && 'Dilluns'}
                                                    {assignment.day === 2 && 'Dimarts'}
                                                    {assignment.day === 3 && 'Dimecres'}
                                                    {assignment.day === 4 && 'Dijous'}
                                                    {assignment.day === 5 && 'Divendres'}
                                                  </span>
                                                  <span>
                                                    {assignment.startTime?.substring(0, 5)} - {assignment.endTime?.substring(0, 5)}
                                                  </span>
                                                  {assignment.classrooms.map((classroom: any, cIdx: number) => (
                                                    <div key={cIdx} className="flex items-center gap-1">
                                                      <Badge variant="outline" className="text-xs">
                                                        {classroom.name} ({classroom.building})
                                                      </Badge>
                                                      {!classroom.is_full_semester && classroom.weeks.length > 0 && (
                                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                          <Calendar className="h-3 w-3" />
                                                          Setm. {classroom.weeks.join(', ')}
                                                        </span>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <Button 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => {
                                              setSelectedGroupForClassroom({
                                                ...group,
                                                subject: subject
                                              } as any)
                                              setSelectedSemesterId(group.semester_id)
                                              setShowClassroomDialog(true)
                                            }}
                                            title="Assignar aules"
                                            className="relative"
                                          >
                                            <MapPin className="h-4 w-4" />
                                            {!groupAssignments[group.id] && (
                                              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                              </span>
                                            )}
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => startEditGroup(group)}
                                          >
                                            <Edit className="h-4 w-4" />
                                          </Button>
                                          <Button 
                                            variant="ghost" 
                                            size="icon"
                                            onClick={() => deleteGroup(group.id, subject.id)}
                                          >
                                            <Trash2 className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* Details Tab */}
                      <TabsContent value="details" className="mt-4">
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold mb-4">Informació de l'assignatura</h3>
                          <dl className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <dt className="font-medium text-muted-foreground">Departament</dt>
                              <dd className="mt-1">{subject.department || 'No especificat'}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-muted-foreground">Tipus</dt>
                              <dd className="mt-1">{subject.type}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-muted-foreground">Crèdits ECTS</dt>
                              <dd className="mt-1">{subject.credits}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-muted-foreground">Curs</dt>
                              <dd className="mt-1">{subject.year}r</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-muted-foreground">Semestre</dt>
                              <dd className="mt-1">{subject.semester}</dd>
                            </div>
                            <div>
                              <dt className="font-medium text-muted-foreground">Itinerari</dt>
                              <dd className="mt-1">
                                {subject.itinerari ? (
                                  subject.itinerari === 'A' ? 'Audiovisual' :
                                  subject.itinerari === 'G' ? 'Gràfic' :
                                  subject.itinerari === 'I' ? 'Espais' :
                                  subject.itinerari === 'M' ? 'Moda' :
                                  subject.itinerari
                                ) : 'No especificat'}
                              </dd>
                            </div>
                            {(subject.username || subject.password) && (
                              <div className="col-span-2 space-y-2">
                                <dt className="font-medium text-muted-foreground">Credencials Guia Docent</dt>
                                <dd className="mt-1 space-y-2">
                                  {subject.username && (
                                    <div>
                                      <span className="text-xs text-muted-foreground">Usuari:</span>
                                      <span className="ml-2 font-mono text-xs bg-white px-2 py-1 rounded border">{subject.username}</span>
                                    </div>
                                  )}
                                  {subject.password && (
                                    <div>
                                      <span className="text-xs text-muted-foreground">Password:</span>
                                      <span className="ml-2 font-mono text-xs bg-white px-2 py-1 rounded border">{subject.password}</span>
                                    </div>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="mt-3"
                                    onClick={() => sendCredentials(subject.id)}
                                  >
                                    <Mail className="h-4 w-4 mr-2" />
                                    Enviar credencials
                                  </Button>
                                </dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      </TabsContent>

                      {/* Software Tab */}
                      <TabsContent value="software" className="mt-4">
                        <div className="space-y-4">
                          <h3 className="text-lg font-semibold mb-4">Software necessari</h3>
                          
                          {loadingSoftware[subject.id] ? (
                            <div className="flex items-center justify-center h-32">
                              <Loader2 className="h-6 w-6 animate-spin" />
                            </div>
                          ) : requirements.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground">
                              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                              <p>No hi ha software assignat</p>
                            </div>
                          ) : (
                            <div className="space-y-3">
                              {requirements.map((req) => (
                                <div key={req.id} className="flex items-center justify-between p-3 border rounded-lg">
                                  <div className="flex items-center gap-3">
                                    <Package className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium">{req.software.name}</p>
                                      <div className="flex items-center gap-2 mt-1">
                                        <Badge variant="outline" className="text-xs">
                                          {req.software.category}
                                        </Badge>
                                        <Badge 
                                          variant={req.software.license_type === 'proprietary' ? 'destructive' : 'secondary'}
                                          className="text-xs"
                                        >
                                          {req.software.license_type === 'proprietary' ? 'Privatiu' : 'Lliure'}
                                        </Badge>
                                        {req.is_required && (
                                          <Badge className="text-xs">Obligatori</Badge>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-sm text-muted-foreground">
                                    {req.academic_year}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </TabsContent>

                      {/* Group Profiles Tab */}
                      <TabsContent value="profiles" className="mt-4">
                        <SubjectGroupProfilesList subjectId={subject.id} />
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                )}
              </Card>
            )
          })
        )}
      </div>

      {/* Subject Form Dialog */}
      {showSubjectForm && (
        <SubjectFormDialog
          open={showSubjectForm}
          onOpenChange={setShowSubjectForm}
          onSuccess={() => {
            loadSubjects()
            setShowSubjectForm(false)
            setEditingSubject(null)
          }}
          subject={editingSubject ? {
            ...editingSubject,
            department: editingSubject.department || undefined,
            degree: editingSubject.degree || undefined
          } : undefined}
          graus={graus}
        />
      )}
      
      {/* Classroom Assignment Dialog */}
      {selectedGroupForClassroom && (
        <ClassroomAssignmentDialog
          open={showClassroomDialog}
          onOpenChange={setShowClassroomDialog}
          subjectGroup={{
            id: selectedGroupForClassroom.id,
            subject_id: selectedGroupForClassroom.subject_id,
            subject: (selectedGroupForClassroom as any).subject,
            group_code: selectedGroupForClassroom.group_code
          }}
          semesterId={selectedSemesterId}
          onSuccess={() => {
            // Reload the subject groups to update the assignments
            if (selectedGroupForClassroom.subject_id) {
              loadSubjectGroups(selectedGroupForClassroom.subject_id)
            }
          }}
        />
      )}
      
      {/* Subject Detail Modal */}
      {selectedSubjectForDetail && (
        <SubjectDetailModal
          subject={selectedSubjectForDetail}
          open={showSubjectDetailModal}
          onOpenChange={setShowSubjectDetailModal}
          onEdit={() => {
            setShowSubjectDetailModal(false)
            setEditingSubject(selectedSubjectForDetail)
            setShowSubjectForm(true)
          }}
        />
      )}
    </div>
  )
}