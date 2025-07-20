'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { 
  GraduationCap,
  Search,
  Plus,
  Mail,
  Calendar,
  BookOpen,
  X
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
} from "@/components/ui/dialog"

interface Teacher {
  id: string
  code: string
  first_name: string
  last_name: string
  email: string
  department: string | null
  contract_type: string | null
  max_hours: number
  created_at: string
  id_profe?: string | null
  titulacio?: string | null
  doctorat_estat?: string | null
  doctorat_any?: number | null
  pdi?: string | null
}


export default function TeachersPage() {
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [filterTitulacio, setFilterTitulacio] = useState<string>('all')
  const [filterDoctorat, setFilterDoctorat] = useState<string>('all')
  const [filterECTS, setFilterECTS] = useState<string>('all')
  const [isCreating, setIsCreating] = useState(false)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([])
  const [newTeacher, setNewTeacher] = useState({
    code: '',
    first_name: '',
    last_name: '',
    email: '',
    department: 'Design',
    contract_type: 'full-time',
    max_hours: 20,
    id_profe: '',
    titulacio: '',
    doctorat_estat: '',
    doctorat_any: null as number | null,
    pdi: ''
  })
  const supabase = createClient()

  useEffect(() => {
    loadTeachers()
    loadTeacherAssignments()
  }, [])

  const loadTeachers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('teachers')
        .select('*')
        .order('last_name', { ascending: true })

      if (error) throw error
      setTeachers(data || [])
    } catch (error) {
      console.error('Error loading teachers:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTeacherAssignments = async () => {
    try {
      const { data, error } = await supabase
        .rpc('get_all_teacher_assignments')

      if (error) {
        console.error('Supabase error loading teacher assignments:', error)
        throw error
      }
      
      console.log('Teacher assignments loaded:', data?.length || 0, 'records')
      setTeacherAssignments(data || [])
    } catch (error) {
      console.error('Error loading teacher assignments:', error)
      setTeacherAssignments([])
    }
  }


  const getTeacherSubjectsWithGroups = (teacherId: string): { code: string, name: string, groups: string[] }[] => {
    if (!teacherAssignments || !Array.isArray(teacherAssignments)) {
      return []
    }
    
    const assignments = teacherAssignments.filter(a => a.teacher_id === teacherId)
    
    // Group by subject
    const subjectMap = new Map<string, { code: string, name: string, groups: string[] }>()
    
    assignments.forEach(assignment => {
      const key = assignment.subject_code
      if (!subjectMap.has(key)) {
        subjectMap.set(key, {
          code: assignment.subject_code,
          name: assignment.subject_name,
          groups: []
        })
      }
      // Add the group to this subject
      subjectMap.get(key)!.groups.push(assignment.group_code)
    })
    
    // Convert map to array and sort groups
    return Array.from(subjectMap.values()).map(subject => ({
      ...subject,
      groups: [...new Set(subject.groups)].sort() // Remove duplicates and sort
    }))
  }

  const getTeacherECTS = (teacherId: string): number => {
    if (!teacherAssignments || !Array.isArray(teacherAssignments)) {
      return 0
    }
    
    const assignments = teacherAssignments.filter(a => a.teacher_id === teacherId)
    
    // Sum up the ECTS assigned to this teacher
    const totalECTS = assignments.reduce((sum, assignment) => {
      return sum + (assignment.ects_assigned || 0)
    }, 0)
    
    return Math.round(totalECTS * 10) / 10 // Round to 1 decimal place
  }

  const deleteTeacher = async (id: string) => {
    if (!confirm('Estàs segur que vols eliminar aquest professor?')) return

    try {
      const { error } = await supabase
        .from('teachers')
        .delete()
        .eq('id', id)

      if (error) throw error

      setTeachers(teachers.filter(t => t.id !== id))
    } catch (error) {
      console.error('Error deleting teacher:', error)
      alert('Error al eliminar el professor')
    }
  }

  const createTeacher = async () => {
    try {
      setIsCreating(true)
      
      // Generate a unique code if not provided
      if (!newTeacher.code) {
        const randomNum = Math.floor(Math.random() * 9000) + 1000
        newTeacher.code = `PROF${randomNum}`
      }

      // Generate PDI if not provided
      if (!newTeacher.pdi && newTeacher.first_name && newTeacher.last_name) {
        newTeacher.pdi = `${newTeacher.last_name}, ${newTeacher.first_name}`
      }

      const { data, error } = await supabase
        .from('teachers')
        .insert([newTeacher])
        .select()
        .single()

      if (error) throw error

      setTeachers([...teachers, data])
      setIsCreateDialogOpen(false)
      setNewTeacher({
        code: '',
        first_name: '',
        last_name: '',
        email: '',
        department: 'Design',
        contract_type: 'full-time',
        max_hours: 20,
        id_profe: '',
        titulacio: '',
        doctorat_estat: '',
        doctorat_any: null,
        pdi: ''
      })
    } catch (error: any) {
      console.error('Error creating teacher:', error)
      alert(error.message || 'Error al crear el professor')
    } finally {
      setIsCreating(false)
    }
  }


  const filteredTeachers = teachers.filter(teacher => {
    // Search term filter
    if (searchTerm) {
      const fullName = `${teacher.first_name || ''} ${teacher.last_name || ''}`.toLowerCase()
      const code = (teacher.code || '').toLowerCase()
      const search = searchTerm.toLowerCase()
      if (!fullName.includes(search) && !code.includes(search)) return false
    }
    
    // Titulació filter
    if (filterTitulacio !== 'all' && teacher.titulacio !== filterTitulacio) return false
    
    // Doctorat filter
    if (filterDoctorat !== 'all' && teacher.doctorat_estat !== filterDoctorat) return false
    
    // ECTS filter
    if (filterECTS !== 'all') {
      const ects = getTeacherECTS(teacher.id)
      if (filterECTS === '0' && ects > 0) return false
      if (filterECTS === '1-10' && (ects < 1 || ects > 10)) return false
      if (filterECTS === '11-20' && (ects < 11 || ects > 20)) return false
      if (filterECTS === '21+' && ects < 21) return false
    }
    
    return true
  })

  // Get unique values for filters
  const uniqueTitulacions = [...new Set(teachers.map(t => t.titulacio).filter(Boolean))]
  const uniqueDoctorats = [...new Set(teachers.map(t => t.doctorat_estat).filter(Boolean))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Professors</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona el professorat del centre
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Afegir Professor
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Professors
            </CardTitle>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teachers.length}</div>
            <p className="text-xs text-muted-foreground">
              Professors actius al centre
            </p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              ECTS Totals Assignats
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teachers.reduce((sum, teacher) => sum + getTeacherECTS(teacher.id), 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Crèdits ECTS assignats
            </p>
          </CardContent>
        </Card>
        <Card className="bg-orange-50 border-orange-200">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Mitjana de Crèdits ECTS
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {teachers.length > 0 
                ? (teachers.reduce((sum, teacher) => sum + getTeacherECTS(teacher.id), 0) / teachers.length).toFixed(1)
                : '0'
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Crèdits ECTS per professor
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and filters */}
      <Card className="bg-orange-50 border-orange-200">
        <CardHeader>
          <CardTitle>Llistat de Professors</CardTitle>
          <CardDescription>
            Cerca i gestiona els professors del centre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cercar per nom o codi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={filterTitulacio} onValueChange={setFilterTitulacio}>
                <SelectTrigger>
                  <SelectValue placeholder="Titulació" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Totes les titulacions</SelectItem>
                  {uniqueTitulacions.map(titulacio => (
                    <SelectItem key={titulacio} value={titulacio}>
                      {titulacio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterDoctorat} onValueChange={setFilterDoctorat}>
                <SelectTrigger>
                  <SelectValue placeholder="Doctorat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tots els estats</SelectItem>
                  {uniqueDoctorats.map(doctorat => (
                    <SelectItem key={doctorat} value={doctorat}>
                      {doctorat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterECTS} onValueChange={setFilterECTS}>
                <SelectTrigger>
                  <SelectValue placeholder="ECTS Assignats" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tots els rangs</SelectItem>
                  <SelectItem value="0">Sense assignar</SelectItem>
                  <SelectItem value="1-10">1-10 ECTS</SelectItem>
                  <SelectItem value="11-20">11-20 ECTS</SelectItem>
                  <SelectItem value="21+">Més de 20 ECTS</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Active filters */}
            {(filterTitulacio !== 'all' || filterDoctorat !== 'all' || filterECTS !== 'all') && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm text-muted-foreground">Filtres actius:</span>
                {filterTitulacio !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Titulació: {filterTitulacio}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setFilterTitulacio('all')}
                    />
                  </Badge>
                )}
                {filterDoctorat !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Doctorat: {filterDoctorat}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setFilterDoctorat('all')}
                    />
                  </Badge>
                )}
                {filterECTS !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    ECTS: {filterECTS}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => setFilterECTS('all')}
                    />
                  </Badge>
                )}
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID Profe</TableHead>
                    <TableHead>PDI</TableHead>
                    <TableHead>Assignatures</TableHead>
                    <TableHead className="text-center">ECTS Assignats</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTeachers.map((teacher) => (
                    <TableRow key={teacher.id} className="group hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {teacher.id_profe || teacher.code}
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <div className="font-medium">
                            {teacher.pdi || `${teacher.last_name}, ${teacher.first_name}`}
                          </div>
                          <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                            <button
                              onClick={() => {
                                setSelectedTeacher(teacher)
                                setIsViewDialogOpen(true)
                              }}
                              className="text-xs text-primary hover:underline"
                            >
                              Veure
                            </button>
                            <span className="text-xs text-muted-foreground">|</span>
                            <button
                              onClick={() => {
                                setSelectedTeacher(teacher)
                                setIsEditDialogOpen(true)
                              }}
                              className="text-xs text-primary hover:underline"
                            >
                              Editar
                            </button>
                            <span className="text-xs text-muted-foreground">|</span>
                            <button
                              onClick={() => deleteTeacher(teacher.id)}
                              className="text-xs text-destructive hover:underline"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getTeacherSubjectsWithGroups(teacher.id).length > 0 ? (
                            getTeacherSubjectsWithGroups(teacher.id).map(subject => (
                              <div key={subject.code} className="flex items-center gap-2 flex-wrap">
                                <span className="text-sm font-medium">{subject.name}</span>
                                <span className="text-xs text-muted-foreground">→</span>
                                {subject.groups.map(group => (
                                  <Badge key={group} variant="secondary" className="text-xs">
                                    {group}
                                  </Badge>
                                ))}
                              </div>
                            ))
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{getTeacherECTS(teacher.id)}</span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Teacher Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Afegir Nou Professor</DialogTitle>
            <DialogDescription>
              Introdueix les dades del nou professor
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="id_profe" className="text-right">
                ID Profe
              </Label>
              <Input
                id="id_profe"
                value={newTeacher.id_profe}
                onChange={(e) => setNewTeacher({ ...newTeacher, id_profe: e.target.value })}
                className="col-span-3"
                placeholder="ID del professor"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="first_name" className="text-right">
                Nom
              </Label>
              <Input
                id="first_name"
                value={newTeacher.first_name}
                onChange={(e) => setNewTeacher({ ...newTeacher, first_name: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="last_name" className="text-right">
                Cognoms
              </Label>
              <Input
                id="last_name"
                value={newTeacher.last_name}
                onChange={(e) => setNewTeacher({ ...newTeacher, last_name: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={newTeacher.email}
                onChange={(e) => setNewTeacher({ ...newTeacher, email: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="pdi" className="text-right">
                PDI
              </Label>
              <Input
                id="pdi"
                value={newTeacher.pdi}
                onChange={(e) => setNewTeacher({ ...newTeacher, pdi: e.target.value })}
                className="col-span-3"
                placeholder="Cognom1 Cognom2, Nom"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="titulacio" className="text-right">
                Titulació
              </Label>
              <Input
                id="titulacio"
                value={newTeacher.titulacio}
                onChange={(e) => setNewTeacher({ ...newTeacher, titulacio: e.target.value })}
                className="col-span-3"
                placeholder="Titulació acadèmica"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="doctorat_estat" className="text-right">
                Doctorat
              </Label>
              <Input
                id="doctorat_estat"
                value={newTeacher.doctorat_estat}
                onChange={(e) => setNewTeacher({ ...newTeacher, doctorat_estat: e.target.value })}
                className="col-span-3"
                placeholder="Estat del doctorat"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="doctorat_any" className="text-right">
                Any Doctorat
              </Label>
              <Input
                id="doctorat_any"
                type="number"
                value={newTeacher.doctorat_any || ''}
                onChange={(e) => setNewTeacher({ ...newTeacher, doctorat_any: e.target.value ? parseInt(e.target.value) : null })}
                className="col-span-3"
                placeholder="Any del doctorat"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="department" className="text-right">
                Departament
              </Label>
              <Input
                id="department"
                value={newTeacher.department}
                onChange={(e) => setNewTeacher({ ...newTeacher, department: e.target.value })}
                className="col-span-3"
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="max_hours" className="text-right">
                Hores Max
              </Label>
              <Input
                id="max_hours"
                type="number"
                value={newTeacher.max_hours}
                onChange={(e) => setNewTeacher({ ...newTeacher, max_hours: parseInt(e.target.value) || 20 })}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsCreateDialogOpen(false)}
              disabled={isCreating}
            >
              Cancel·lar
            </Button>
            <Button 
              onClick={createTeacher}
              disabled={isCreating || !newTeacher.first_name || !newTeacher.last_name || !newTeacher.email}
            >
              {isCreating ? 'Creant...' : 'Crear Professor'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Teacher Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Detalls del Professor</DialogTitle>
          </DialogHeader>
          {selectedTeacher && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-muted-foreground">ID Profe</Label>
                  <p className="font-medium">{selectedTeacher.id_profe || selectedTeacher.code}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">PDI</Label>
                  <p className="font-medium">{selectedTeacher.pdi || `${selectedTeacher.last_name}, ${selectedTeacher.first_name}`}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Nom</Label>
                  <p className="font-medium">{selectedTeacher.first_name}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Cognoms</Label>
                  <p className="font-medium">{selectedTeacher.last_name}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Email</Label>
                  <p className="font-medium">{selectedTeacher.email}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Titulació</Label>
                  <p className="font-medium">{selectedTeacher.titulacio || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Doctorat</Label>
                  <p className="font-medium">{selectedTeacher.doctorat_estat || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Any Doctorat</Label>
                  <p className="font-medium">{selectedTeacher.doctorat_any || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Departament</Label>
                  <p className="font-medium">{selectedTeacher.department || '-'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Hores Màximes</Label>
                  <p className="font-medium">{selectedTeacher.max_hours}</p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
              Tancar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Teacher Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Professor</DialogTitle>
            <DialogDescription>
              Modifica les dades del professor
            </DialogDescription>
          </DialogHeader>
          {selectedTeacher && (
            <form onSubmit={async (e) => {
              e.preventDefault()
              try {
                const { error } = await supabase
                  .from('teachers')
                  .update({
                    id_profe: selectedTeacher.id_profe,
                    first_name: selectedTeacher.first_name,
                    last_name: selectedTeacher.last_name,
                    email: selectedTeacher.email,
                    pdi: selectedTeacher.pdi,
                    titulacio: selectedTeacher.titulacio,
                    doctorat_estat: selectedTeacher.doctorat_estat,
                    doctorat_any: selectedTeacher.doctorat_any,
                    department: selectedTeacher.department,
                    max_hours: selectedTeacher.max_hours
                  })
                  .eq('id', selectedTeacher.id)

                if (error) throw error

                await loadTeachers()
                setIsEditDialogOpen(false)
              } catch (error) {
                console.error('Error updating teacher:', error)
                alert('Error al actualitzar el professor')
              }
            }}>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-id_profe" className="text-right">
                    ID Profe
                  </Label>
                  <Input
                    id="edit-id_profe"
                    value={selectedTeacher.id_profe || ''}
                    onChange={(e) => setSelectedTeacher({ ...selectedTeacher, id_profe: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-first_name" className="text-right">
                    Nom
                  </Label>
                  <Input
                    id="edit-first_name"
                    value={selectedTeacher.first_name}
                    onChange={(e) => setSelectedTeacher({ ...selectedTeacher, first_name: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-last_name" className="text-right">
                    Cognoms
                  </Label>
                  <Input
                    id="edit-last_name"
                    value={selectedTeacher.last_name}
                    onChange={(e) => setSelectedTeacher({ ...selectedTeacher, last_name: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-email" className="text-right">
                    Email
                  </Label>
                  <Input
                    id="edit-email"
                    type="email"
                    value={selectedTeacher.email}
                    onChange={(e) => setSelectedTeacher({ ...selectedTeacher, email: e.target.value })}
                    className="col-span-3"
                    required
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-pdi" className="text-right">
                    PDI
                  </Label>
                  <Input
                    id="edit-pdi"
                    value={selectedTeacher.pdi || ''}
                    onChange={(e) => setSelectedTeacher({ ...selectedTeacher, pdi: e.target.value })}
                    className="col-span-3"
                    placeholder="Cognom1 Cognom2, Nom"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-titulacio" className="text-right">
                    Titulació
                  </Label>
                  <Input
                    id="edit-titulacio"
                    value={selectedTeacher.titulacio || ''}
                    onChange={(e) => setSelectedTeacher({ ...selectedTeacher, titulacio: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-doctorat_estat" className="text-right">
                    Doctorat
                  </Label>
                  <Input
                    id="edit-doctorat_estat"
                    value={selectedTeacher.doctorat_estat || ''}
                    onChange={(e) => setSelectedTeacher({ ...selectedTeacher, doctorat_estat: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-doctorat_any" className="text-right">
                    Any Doctorat
                  </Label>
                  <Input
                    id="edit-doctorat_any"
                    type="number"
                    value={selectedTeacher.doctorat_any || ''}
                    onChange={(e) => setSelectedTeacher({ ...selectedTeacher, doctorat_any: e.target.value ? parseInt(e.target.value) : null })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-department" className="text-right">
                    Departament
                  </Label>
                  <Input
                    id="edit-department"
                    value={selectedTeacher.department || ''}
                    onChange={(e) => setSelectedTeacher({ ...selectedTeacher, department: e.target.value })}
                    className="col-span-3"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="edit-max_hours" className="text-right">
                    Hores Max
                  </Label>
                  <Input
                    id="edit-max_hours"
                    type="number"
                    value={selectedTeacher.max_hours}
                    onChange={(e) => setSelectedTeacher({ ...selectedTeacher, max_hours: parseInt(e.target.value) || 20 })}
                    className="col-span-3"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                  Cancel·lar
                </Button>
                <Button type="submit">
                  Guardar Canvis
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}