'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { loadCSVAssignments, type CSVAssignment } from '@/lib/load-csv-assignments'
import { 
  Plus,
  Search,
  Users,
  BookOpen,
  GraduationCap,
  Edit,
  Trash2,
  Calendar,
  Clock,
  ChevronDown,
  X
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"

interface CourseOffering {
  id: number
  academic_year: string
  subject_id: string
  subject?: {
    code: string
    name: string
    credits: number
  }
  semester: string
  total_ects: number
  active: boolean
}

interface TeachingAssignment {
  id: number
  course_offering_id: number
  teacher_id: number
  teacher?: {
    teacher_id: string
    first_name: string
    last_name: string
  }
  student_group_id: number | null
  student_group?: {
    code: string
    name: string
  } | null
  ects_assigned: number
  is_coordinator: boolean
}

interface Teacher {
  id: number
  teacher_id: string
  first_name: string
  last_name: string
}

interface StudentGroup {
  id: number
  code: string
  name: string
  year: number
  shift: string
}

interface Subject {
  id: string
  code: string
  name: string
  credits: number
  year: number
  semester?: string
  itinerari?: string | null
}

interface Filters {
  curs: string
  itinerari: string
  semestre: string
  torn: string
  nom: string
}

export default function CourseAssignmentsPage() {
  const [courseOfferings, setCourseOfferings] = useState<CourseOffering[]>([])
  const [teachingAssignments, setTeachingAssignments] = useState<TeachingAssignment[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [expandedOffering, setExpandedOffering] = useState<number | null>(null)
  const [filters, setFilters] = useState<Filters>({
    curs: 'all',
    itinerari: 'all',
    semestre: 'all',
    torn: 'all',
    nom: ''
  })
  
  // Form state
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedTeacher, setSelectedTeacher] = useState('')
  const [selectedGroup, setSelectedGroup] = useState('')
  const [ectsAmount, setEctsAmount] = useState('')
  const [isCoordinator, setIsCoordinator] = useState(false)
  
  // Dialog filters state
  const [dialogFilters, setDialogFilters] = useState<Filters>({
    curs: 'all',
    itinerari: 'all',
    semestre: 'all',
    torn: 'all',
    nom: ''
  })
  
  // Get assignments for a specific offering
  const getAssignmentsForOffering = (offeringId: number) => {
    return teachingAssignments.filter(a => a.course_offering_id === offeringId)
  }

  // Get filtered subjects based on dialog filters
  const getFilteredSubjects = () => {
    return subjects.filter(subject => {
      // Nom filter
      const search = dialogFilters.nom.toLowerCase()
      const matchesSearch = !search || 
        subject.name.toLowerCase().includes(search) || 
        subject.code.toLowerCase().includes(search)
      
      // Curs filter
      const matchesCurs = !dialogFilters.curs || dialogFilters.curs === 'all' || subject.year.toString() === dialogFilters.curs
      
      // Itinerari filter
      const matchesItinerari = !dialogFilters.itinerari || dialogFilters.itinerari === 'all' || subject.itinerari === dialogFilters.itinerari
      
      // Semestre filter
      const matchesSemestre = !dialogFilters.semestre || dialogFilters.semestre === 'all' || subject.semester === dialogFilters.semestre
      
      return matchesSearch && matchesCurs && matchesItinerari && matchesSemestre
    })
  }

  // Get filtered groups based on selected subject
  const getFilteredGroups = () => {
    if (!selectedSubject) {
      console.log('No subject selected')
      return []
    }
    
    const subject = subjects.find(s => s.id === selectedSubject)
    console.log('Selected subject:', subject)
    console.log('All groups:', studentGroups)
    
    if (!subject) {
      console.log('Subject not found for id:', selectedSubject)
      return []
    }
    
    // Filter groups by the subject's year
    const filtered = studentGroups
      .filter(group => {
        console.log(`Comparing group year ${group.year} with subject year ${subject.year}`)
        return group.year === subject.year
      })
      .sort((a, b) => {
        // Sort by shift (morning first) then by code
        if (a.shift !== b.shift) {
          return a.shift === 'Matí' ? -1 : 1
        }
        return a.code.localeCompare(b.code)
      })
    
    console.log('Filtered groups:', filtered)
    return filtered
  }
  
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [])

  const handleDeleteAssignment = async (assignmentId: number) => {
    if (!confirm('Estàs segur que vols eliminar aquesta assignació?')) return
    
    // For now, just remove from state
    setTeachingAssignments(prev => prev.filter(a => a.id !== assignmentId))
  }

  const handleCreateAssignment = async () => {
    if (!selectedSubject || !selectedTeacher || !ectsAmount) {
      alert('Si us plau, omple tots els camps obligatoris')
      return
    }

    // Create new assignment in state
    const subject = subjects.find(s => s.id === selectedSubject)
    const teacher = teachers.find(t => t.id.toString() === selectedTeacher)
    const group = studentGroups.find(g => g.id.toString() === selectedGroup)
    
    if (!subject || !teacher) return

    const offeringId = subjects.indexOf(subject) + 1
    const newAssignment = {
      id: teachingAssignments.length + 1,
      course_offering_id: offeringId,
      teacher_id: teacher.id,
      teacher: {
        teacher_id: teacher.teacher_id,
        first_name: teacher.first_name,
        last_name: teacher.last_name
      },
      student_group_id: group?.id || null,
      student_group: group || null,
      ects_assigned: parseFloat(ectsAmount),
      is_coordinator: isCoordinator
    }

    setTeachingAssignments(prev => [...prev, newAssignment])
    setIsDialogOpen(false)
    
    // Reset form
    setSelectedSubject('')
    setSelectedTeacher('')
    setSelectedGroup('')
    setEctsAmount('')
    setIsCoordinator(false)
    setDialogFilters({
      curs: 'all',
      itinerari: 'all',
      semestre: 'all',
      torn: 'all',
      nom: ''
    })
  }

  const loadData = async () => {
    try {
      setLoading(true)
      
      // First, check if tables exist and load base data
      const [teachersRes, groupsRes, subjectsRes] = await Promise.all([
        supabase
          .from('teachers')
          .select('*')
          .order('last_name'),
        
        supabase
          .from('student_groups')
          .select('*')
          .order('year', { ascending: true }),
        
        supabase
          .from('subjects')
          .select(`
            *,
            itinerari:"ID Itinerari"
          `)
          .order('code')
      ])

      if (teachersRes.error) {
        console.error('Error loading teachers:', teachersRes.error)
        setTeachers([])
      } else {
        console.log('Teachers loaded:', teachersRes.data?.length || 0)
        // Map teachers to the expected format
        const teachers = teachersRes.data?.map(t => ({
          id: t.id,
          teacher_id: t.code,
          first_name: t.first_name,
          last_name: t.last_name,
          email: t.email,
          department: t.department
        })) || []
        setTeachers(teachers)
      }

      if (groupsRes.error) {
        console.error('Error loading groups:', groupsRes.error)
        setStudentGroups([])
      } else {
        console.log('Groups loaded:', groupsRes.data?.length || 0)
        setStudentGroups(groupsRes.data || [])
      }

      if (subjectsRes.error) {
        console.error('Error loading subjects:', subjectsRes.error)
        setSubjects([])
      } else {
        console.log('Subjects loaded:', subjectsRes.data?.length || 0)
        console.log('Sample subject:', subjectsRes.data?.[0])
        setSubjects(subjectsRes.data || [])
      }

      // Load course offerings from subjects data
      let offerings = []
      if (subjectsRes.data && subjectsRes.data.length > 0) {
        offerings = subjectsRes.data.map((subject, index) => ({
          id: index + 1,
          academic_year: '2024-2025',
          subject_id: subject.id,
          subject: {
            code: subject.code,
            name: subject.name,
            credits: subject.credits || 6
          },
          semester: subject.semester || '1',
          total_ects: subject.credits || 6,
          active: true
        }))
        setCourseOfferings(offerings)
      } else {
        setCourseOfferings([])
      }

      // Load real assignments from CSV
      const csvAssignments = await loadCSVAssignments()
      console.log(`Loaded ${csvAssignments.length} assignments from CSV`)
      console.log('CSV Sample:', csvAssignments.slice(0, 2))
      
      // Match CSV assignments with database entities
      const realAssignments = []
      const assignmentsByOffering = new Map()
      
      // Create maps for quick lookup - using the loaded data, not state
      const subjectMap = new Map((subjectsRes.data || []).map(s => [s.code, s]))
      const teacherMap = new Map()
      
      // Create teacher map with both full code and numeric ID
      for (const teacher of (teachersRes.data || [])) {
        teacherMap.set(teacher.code, teacher)
        // Also map by numeric part of the code (e.g., "634" from "PROF634")
        const numericId = teacher.code.replace(/[^\d]/g, '')
        if (numericId) {
          teacherMap.set(numericId, teacher)
        }
      }
      
      // Create group maps by both name and by extracting the code from the name
      const groupNameMap = new Map()
      const groupCodeMap = new Map()
      
      for (const group of (groupsRes.data || [])) {
        groupNameMap.set(group.name, group)
        // Extract group code from name (e.g., "M1" from "1r Matí M1")
        const codeMatch = group.name.match(/([MT]\d+|Am|At|Gm\d+|Gt\d+|Em|Et|Im|It)$/i)
        if (codeMatch) {
          groupCodeMap.set(codeMatch[1], group)
        }
      }
      
      console.log('Subject codes available:', Array.from(subjectMap.keys()).slice(0, 5))
      console.log('Teacher codes available:', Array.from(teacherMap.keys()).slice(0, 10))
      console.log('Group codes available:', Array.from(groupCodeMap.keys()))
      console.log('Groups in DB:', groupsRes.data?.map(g => g.name))
      
      for (const csvAssignment of csvAssignments) {
        const subject = subjectMap.get(csvAssignment.subject_code)
        const teacher = teacherMap.get(csvAssignment.teacher_id)
        // Try to find group by code first, then by name
        const group = groupCodeMap.get(csvAssignment.group_code) || 
                     groupNameMap.get(csvAssignment.group_name)
        
        // Debug logging
        if (!teacher && csvAssignment.teacher_id) {
          console.log(`Teacher not found for ID: ${csvAssignment.teacher_id}`)
        }
        if (!group && csvAssignment.group_code) {
          console.log(`Group not found for code: ${csvAssignment.group_code}`)
        }
        
        if (subject && teacher) {
          const offeringId = (subjectsRes.data || []).indexOf(subject) + 1
          
          const assignment = {
            id: csvAssignment.id,
            course_offering_id: offeringId,
            teacher_id: teacher.id,
            teacher: {
              teacher_id: teacher.teacher_id,
              first_name: teacher.first_name,
              last_name: teacher.last_name
            },
            student_group_id: group?.id || null,
            student_group: group || null,
            ects_assigned: csvAssignment.ects_assigned,
            is_coordinator: false,
            subject_code: csvAssignment.subject_code,
            subject_name: csvAssignment.subject_name,
            group_code: csvAssignment.group_code
          }
          
          realAssignments.push(assignment)
          
          // Track assignments by offering
          if (!assignmentsByOffering.has(offeringId)) {
            assignmentsByOffering.set(offeringId, [])
          }
          assignmentsByOffering.get(offeringId).push(assignment)
        }
      }
      
      console.log(`Matched ${realAssignments.length} assignments with database entities`)
      console.log('Sample assignments:', realAssignments.slice(0, 5))
      console.log('Course offerings:', courseOfferings.slice(0, 5))
      setTeachingAssignments(realAssignments)

    } catch (error) {
      console.error('Error loading data:', error)
      // Set empty arrays as fallback
      setTeachers([])
      setStudentGroups([])
      setSubjects([])
      setCourseOfferings([])
      setTeachingAssignments([])
    } finally {
      setLoading(false)
    }
  }

  const filteredOfferings = courseOfferings.filter(offering => {
    // Nom filter (search term)
    const search = (filters.nom || searchTerm).toLowerCase()
    const matchesSearch = !search || 
      (offering.subject?.name || '').toLowerCase().includes(search) ||
      (offering.subject?.code || '').toLowerCase().includes(search)
    
    // Get subject details for filtering
    const subject = subjects.find(s => s.id === offering.subject_id)
    
    // Curs filter
    const matchesCurs = !filters.curs || filters.curs === 'all' || subject?.year?.toString() === filters.curs
    
    // Itinerari filter
    const matchesItinerari = !filters.itinerari || filters.itinerari === 'all' || subject?.itinerari === filters.itinerari
    
    // Semestre filter
    const matchesSemestre = !filters.semestre || filters.semestre === 'all' || offering.semester === filters.semestre
    
    // Note: Torn (shift) filter would need to be applied differently as it's related to groups
    // For now, we'll skip it or could filter based on assignments with groups of that shift
    
    return matchesSearch && matchesCurs && matchesItinerari && matchesSemestre
  })

  // Get unique values for filters
  const uniqueYears = [...new Set(subjects.map(s => s.year).filter(Boolean))].sort()
  const uniqueItineraris = [...new Set(subjects.map(s => s.itinerari).filter(Boolean))] as string[]
  const uniqueSemesters = [...new Set(courseOfferings.map(o => o.semester).filter(Boolean))].sort()

  // Clear individual filter
  const clearFilter = (filterName: keyof Filters) => {
    setFilters(prev => ({ ...prev, [filterName]: 'all' }))
  }

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      curs: 'all',
      itinerari: 'all',
      semestre: 'all',
      torn: 'all',
      nom: ''
    })
    setSearchTerm('')
  }

  // Check if any filter is active
  const hasActiveFilters = Object.values(filters).some(v => v !== '' && v !== 'all') || searchTerm !== ''

  const totalAssignments = teachingAssignments.length
  const uniqueTeachers = new Set(teachingAssignments.map(ta => ta.teacher_id)).size
  const totalECTS = teachingAssignments.reduce((sum, ta) => sum + ta.ects_assigned, 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignacions de Docència</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona l'assignació de professors a assignatures i grups
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova Assignació
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>Nova Assignació de Docència</DialogTitle>
              <DialogDescription>
                Assigna un professor a una assignatura amb un grup específic
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {/* Filters section */}
              <div className="space-y-4">
                <Label>Filtres per cercar assignatura</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Curs filter */}
                  <Select 
                    value={dialogFilters.curs} 
                    onValueChange={(value) => setDialogFilters(prev => ({ ...prev, curs: value }))}
                  >
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
                  <Select 
                    value={dialogFilters.itinerari} 
                    onValueChange={(value) => setDialogFilters(prev => ({ ...prev, itinerari: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Itinerari" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tots els itineraris</SelectItem>
                      {uniqueItineraris.map(itinerari => (
                        <SelectItem key={itinerari} value={itinerari}>
                          {itinerari}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Semestre filter */}
                  <Select 
                    value={dialogFilters.semestre} 
                    onValueChange={(value) => setDialogFilters(prev => ({ ...prev, semestre: value }))}
                  >
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

                  {/* Torn filter */}
                  <Select 
                    value={dialogFilters.torn} 
                    onValueChange={(value) => setDialogFilters(prev => ({ ...prev, torn: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Torn" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Tots els torns</SelectItem>
                      <SelectItem value="Matí">Matí</SelectItem>
                      <SelectItem value="Tarda">Tarda</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Name search */}
                  <div className="relative col-span-2">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Cercar per nom o codi..."
                      value={dialogFilters.nom}
                      onChange={(e) => setDialogFilters(prev => ({ ...prev, nom: e.target.value }))}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="subject">Assignatura</Label>
                <Select 
                  value={selectedSubject} 
                  onValueChange={(value) => {
                    setSelectedSubject(value)
                    setSelectedGroup('') // Reset group when subject changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una assignatura" />
                  </SelectTrigger>
                  <SelectContent>
                    {getFilteredSubjects().length === 0 ? (
                      <div className="p-2 text-sm text-muted-foreground text-center">
                        No s'han trobat assignatures amb aquests filtres
                      </div>
                    ) : (
                      getFilteredSubjects().map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.code} - {subject.name} ({subject.year}r curs)
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="teacher">Professor</Label>
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un professor" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.map(teacher => (
                      <SelectItem key={teacher.id} value={teacher.id.toString()}>
                        {teacher.first_name} {teacher.last_name} ({teacher.teacher_id})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="group">Grup (opcional)</Label>
                <Select 
                  value={selectedGroup} 
                  onValueChange={setSelectedGroup}
                  disabled={!selectedSubject}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={selectedSubject ? "Tots els grups" : "Selecciona primer una assignatura"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tots els grups</SelectItem>
                    {getFilteredGroups().map(group => (
                      <SelectItem key={group.id} value={group.id.toString()}>
                        {group.name} - {group.shift}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="ects">ECTS assignats</Label>
                <Input
                  id="ects"
                  type="number"
                  step="0.5"
                  value={ectsAmount}
                  onChange={(e) => setEctsAmount(e.target.value)}
                  placeholder="6.0"
                />
              </div>
              
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="coordinator"
                  checked={isCoordinator}
                  onChange={(e) => setIsCoordinator(e.target.checked)}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="coordinator" className="font-normal">
                  Coordinador de l'assignatura
                </Label>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel·lar
              </Button>
              <Button onClick={handleCreateAssignment}>
                Crear Assignació
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="bg-sky-50 border-sky-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Assignacions
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssignments}</div>
            <p className="text-xs text-muted-foreground">
              Assignacions actives
            </p>
          </CardContent>
        </Card>
        <Card className="bg-sky-50 border-sky-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Professors Assignats
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{uniqueTeachers}</div>
            <p className="text-xs text-muted-foreground">
              Professors amb docència
            </p>
          </CardContent>
        </Card>
        <Card className="bg-sky-50 border-sky-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total ECTS
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalECTS.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              ECTS assignats
            </p>
          </CardContent>
        </Card>
        <Card className="bg-sky-50 border-sky-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Assignatures
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courseOfferings.length}</div>
            <p className="text-xs text-muted-foreground">
              Amb professors assignats
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and list */}
      <Card className="bg-sky-50 border-sky-200">
        <CardHeader>
          <CardTitle>Assignacions per Assignatura</CardTitle>
          <CardDescription>
            Visualitza i gestiona les assignacions de professors per cada assignatura
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            {/* Filter dropdowns */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
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
                      {itinerari}
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

              {/* Torn filter */}
              <Select value={filters.torn} onValueChange={(value) => setFilters(prev => ({ ...prev, torn: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Torn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tots els torns</SelectItem>
                  <SelectItem value="Matí">Matí</SelectItem>
                  <SelectItem value="Tarda">Tarda</SelectItem>
                </SelectContent>
              </Select>

              {/* Name search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cercar per nom..."
                  value={filters.nom || searchTerm}
                  onChange={(e) => {
                    setFilters(prev => ({ ...prev, nom: e.target.value }))
                    setSearchTerm(e.target.value)
                  }}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Active filters display */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Filtres actius:</span>
                {filters.curs && filters.curs !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Curs: {filters.curs}r
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => clearFilter('curs')}
                    />
                  </Badge>
                )}
                {filters.itinerari && filters.itinerari !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Itinerari: {filters.itinerari}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => clearFilter('itinerari')}
                    />
                  </Badge>
                )}
                {filters.semestre && filters.semestre !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Semestre: {filters.semestre}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => clearFilter('semestre')}
                    />
                  </Badge>
                )}
                {filters.torn && filters.torn !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Torn: {filters.torn}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => clearFilter('torn')}
                    />
                  </Badge>
                )}
                {(filters.nom || searchTerm) && (
                  <Badge variant="secondary" className="gap-1">
                    Nom: {filters.nom || searchTerm}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => {
                        clearFilter('nom')
                        setSearchTerm('')
                      }}
                    />
                  </Badge>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={clearAllFilters}
                  className="text-xs"
                >
                  Esborrar tot
                </Button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-pulse space-y-4">
                <div className="h-4 bg-muted rounded w-48"></div>
                <div className="h-32 bg-muted rounded w-96"></div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOfferings.map((offering) => {
                const assignments = getAssignmentsForOffering(offering.id)
                const totalAssignedECTS = assignments.reduce((sum, a) => sum + a.ects_assigned, 0)
                const isExpanded = expandedOffering === offering.id
                
                return (
                  <div key={offering.id} className="border rounded-lg">
                    <button
                      onClick={() => setExpandedOffering(isExpanded ? null : offering.id)}
                      className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-left">
                          <div className="font-medium">
                            {offering.subject?.code || 'N/A'} - {offering.subject?.name || 'Sense nom'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {offering.subject?.credits || 0} ECTS · {assignments.length} professors assignats
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={totalAssignedECTS === offering.total_ects ? "default" : "secondary"}>
                          {totalAssignedECTS} / {offering.total_ects} ECTS
                        </Badge>
                        <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                      </div>
                    </button>
                    
                    {isExpanded && (
                      <div className="border-t p-4">
                        {assignments.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">
                            No hi ha professors assignats a aquesta assignatura
                          </p>
                        ) : (
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Professor</TableHead>
                                <TableHead>Grup</TableHead>
                                <TableHead>ECTS</TableHead>
                                <TableHead>Rol</TableHead>
                                <TableHead className="text-right">Accions</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {assignments.map((assignment) => (
                                <TableRow key={assignment.id}>
                                  <TableCell>
                                    <div>
                                      <div className="font-medium">
                                        {assignment.teacher?.first_name || ''} {assignment.teacher?.last_name || 'Professor desconegut'}
                                      </div>
                                      <div className="text-sm text-muted-foreground">
                                        {assignment.teacher?.teacher_id || 'N/A'}
                                      </div>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    {assignment.student_group ? (
                                      <Badge variant="outline">
                                        {assignment.student_group.name || 'Grup'}
                                      </Badge>
                                    ) : (
                                      <span className="text-muted-foreground">Tots els grups</span>
                                    )}
                                  </TableCell>
                                  <TableCell>{assignment.ects_assigned}</TableCell>
                                  <TableCell>
                                    {assignment.is_coordinator && (
                                      <Badge variant="default">Coordinador</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="text-right">
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      onClick={() => handleDeleteAssignment(assignment.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}