'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { 
  Users,
  Search,
  Plus,
  UserCheck,
  Clock,
  Calendar,
  Edit,
  Trash2,
  GraduationCap,
  Eye,
  ChevronDown,
  ChevronRight,
  School,
  BookOpen,
  Loader2,
  X,
  Check
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'

interface StudentGroup {
  id: string
  name: string
  code: string
  year: number
  shift: 'mati' | 'tarda'
  max_students: number
  specialization?: string | null
  created_at: string
  updated_at: string
}

interface Subject {
  id: string
  code: string
  name: string
  year: number
  semester: string
  credits: number
  type: string
}

interface SubjectGroup {
  id: string
  subject_id: string
  group_code: string
  max_students: number
  subjects?: Subject
}

export default function GrupsEstudiantsPage() {
  const supabase = createClient()
  const [groups, setGroups] = useState<StudentGroup[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subjectGroups, setSubjectGroups] = useState<SubjectGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDegree, setSelectedDegree] = useState<string>('GR') // Default to Design
  const [selectedYear, setSelectedYear] = useState<string>('3')
  const [selectedItinerari, setSelectedItinerari] = useState<string>('')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  
  // Dialog states
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<StudentGroup | null>(null)
  const [assignDialogOpen, setAssignDialogOpen] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState<StudentGroup | null>(null)
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [subjectFilter, setSubjectFilter] = useState('')
  
  // Form states
  const [formData, setFormData] = useState({
    name: '',
    year: 3,
    shift: 'mati' as 'mati' | 'tarda',
    max_students: 25,
    itinerari: ''
  })

  useEffect(() => {
    // Clear itinerari when switching to Fine Arts or year 1
    if (selectedDegree === 'GB' || selectedYear === '1') {
      setSelectedItinerari('')
    }
    loadData()
  }, [selectedDegree, selectedYear])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load student groups filtered by degree and year
      const { data: groupsData, error: groupsError } = await supabase
        .from('student_groups')
        .select('*')
        .eq('year', parseInt(selectedYear))
        .like('name', `${selectedDegree}%`)
        .order('name')
      
      if (groupsError) throw groupsError
      setGroups(groupsData || [])
      
      // Load subjects for the selected year
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .eq('year', parseInt(selectedYear))
        .eq('active', true)
        .order('name')
      
      if (subjectsError) throw subjectsError
      setSubjects(subjectsData || [])
      
      // Load all subject groups with their subjects
      const { data: subjectGroupsData, error: sgError } = await supabase
        .from('subject_groups')
        .select(`
          *,
          subjects!inner(
            id,
            code,
            name,
            year,
            semester,
            credits,
            type
          )
        `)
        .eq('subjects.year', parseInt(selectedYear))
      
      if (sgError) throw sgError
      setSubjectGroups(subjectGroupsData || [])
      
    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error carregant dades')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = () => {
    setEditingGroup(null)
    setFormData({
      name: '',
      year: parseInt(selectedYear),
      shift: 'mati',
      max_students: 25,
      itinerari: ''
    })
    setDialogOpen(true)
  }

  const handleEditGroup = (group: StudentGroup) => {
    setEditingGroup(group)
    setFormData({
      name: group.name,
      year: group.year,
      shift: group.shift,
      max_students: group.max_students,
      itinerari: group.specialization || ''
    })
    setDialogOpen(true)
  }

  const handleDeleteGroup = async (group: StudentGroup) => {
    if (!confirm(`Segur que vols eliminar el grup ${group.name}?`)) return
    
    try {
      // First delete all subject group assignments
      const { error: sgError } = await supabase
        .from('subject_groups')
        .delete()
        .eq('group_code', group.name)
      
      if (sgError) throw sgError
      
      // Then delete the student group
      const { error } = await supabase
        .from('student_groups')
        .delete()
        .eq('id', group.id)
      
      if (error) throw error
      
      toast.success('Grup eliminat correctament')
      loadData()
    } catch (error) {
      console.error('Error deleting group:', error)
      toast.error('Error eliminant el grup')
    }
  }

  const handleSaveGroup = async () => {
    try {
      setSaving(true)
      
      const groupData = {
        name: formData.name,
        code: formData.name, // Using name as code
        year: formData.year,
        shift: formData.shift,
        max_students: formData.max_students,
        specialization: formData.itinerari || null
      }
      
      if (editingGroup) {
        // Update existing group
        const { error } = await supabase
          .from('student_groups')
          .update(groupData)
          .eq('id', editingGroup.id)
        
        if (error) throw error
        
        // If name changed, update subject_groups
        if (editingGroup.name !== formData.name) {
          const { error: sgError } = await supabase
            .from('subject_groups')
            .update({ group_code: formData.name })
            .eq('group_code', editingGroup.name)
          
          if (sgError) throw sgError
        }
        
        toast.success('Grup actualitzat correctament')
      } else {
        // Create new group
        const { error } = await supabase
          .from('student_groups')
          .insert(groupData)
        
        if (error) throw error
        toast.success('Grup creat correctament')
      }
      
      setDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Error saving group:', error)
      toast.error('Error guardant el grup')
    } finally {
      setSaving(false)
    }
  }

  const handleAssignSubjects = (group: StudentGroup) => {
    setSelectedGroup(group)
    
    // Get current subjects for this group
    const currentSubjectIds = new Set(
      subjectGroups
        .filter(sg => sg.group_code === group.name)
        .map(sg => sg.subject_id)
    )
    
    setSelectedSubjects(currentSubjectIds)
    setAssignDialogOpen(true)
  }

  const handleSaveAssignments = async () => {
    if (!selectedGroup) return
    
    try {
      setSaving(true)
      
      // Get current assignments
      const currentAssignments = subjectGroups.filter(
        sg => sg.group_code === selectedGroup.name
      )
      
      // Find subjects to add and remove
      const currentSubjectIds = new Set(currentAssignments.map(sg => sg.subject_id))
      const toAdd = Array.from(selectedSubjects).filter(id => !currentSubjectIds.has(id))
      const toRemove = Array.from(currentSubjectIds).filter(id => !selectedSubjects.has(id))
      
      // Get both semesters
      const { data: semesters } = await supabase
        .from('semesters')
        .select('id, name')
        .eq('academic_year_id', '2b210161-5447-4494-8003-f09a0b553a3f') // 2025-2026
        .order('name')
      
      if (!semesters || semesters.length === 0) {
        throw new Error('No semesters found for academic year 2025-2026')
      }
      
      // Remove assignments
      if (toRemove.length > 0) {
        const { error } = await supabase
          .from('subject_groups')
          .delete()
          .eq('group_code', selectedGroup.name)
          .in('subject_id', toRemove)
        
        if (error) throw error
      }
      
      // Add new assignments
      if (toAdd.length > 0) {
        // Create assignments for each subject in BOTH semesters
        const newAssignments = toAdd.flatMap(subjectId => {
          // Create an assignment for EACH semester
          return semesters.map(semester => ({
            subject_id: subjectId,
            semester_id: semester.id,
            group_code: selectedGroup.name,
            max_students: selectedGroup.max_students
          }))
        })
        
        const { error } = await supabase
          .from('subject_groups')
          .insert(newAssignments)
        
        if (error) throw error
      }
      
      toast.success('Assignacions actualitzades correctament')
      setAssignDialogOpen(false)
      loadData()
    } catch (error) {
      console.error('Error saving assignments:', error)
      toast.error('Error guardant assignacions')
    } finally {
      setSaving(false)
    }
  }

  const getSubjectsForGroup = (groupName: string) => {
    return subjectGroups
      .filter(sg => sg.group_code === groupName)
      .map(sg => sg.subjects)
      .filter(Boolean) as Subject[]
  }

  const toggleGroupExpanded = (groupId: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId)
    } else {
      newExpanded.add(groupId)
    }
    setExpandedGroups(newExpanded)
  }

  const itineraris = ['Audiovisual', 'Gràfic', 'Interiors', 'Moda']

  const filteredGroups = groups.filter(group => {
    if (!selectedItinerari) return true
    
    // Map itinerari names to group code patterns
    const itinerariPatterns: Record<string, string> = {
      'Audiovisual': 'A',
      'Gràfic': 'G',
      'Interiors': 'I',
      'Moda': 'M'
    }
    
    const pattern = itinerariPatterns[selectedItinerari]
    if (!pattern) return true
    
    // Check if group name matches the pattern (e.g., GR3-Am, GR3-At for Audiovisual)
    const regex = new RegExp(`^GR[234]-${pattern}`)
    return regex.test(group.name)
  })

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grups d'Estudiants</h1>
          <p className="text-muted-foreground">
            Gestiona els grups d'estudiants i les seves assignacions a assignatures
          </p>
        </div>
        <Button onClick={handleCreateGroup}>
          <Plus className="h-4 w-4 mr-2" />
          Nou Grup
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={selectedDegree} onValueChange={setSelectedDegree}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GR">Grau en Disseny</SelectItem>
            <SelectItem value="GB">Grau en Belles Arts</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedYear} onValueChange={setSelectedYear}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1r curs</SelectItem>
            <SelectItem value="2">2n curs</SelectItem>
            <SelectItem value="3">3r curs</SelectItem>
            <SelectItem value="4">4t curs</SelectItem>
          </SelectContent>
        </Select>

        {selectedDegree === 'GR' && (selectedYear === '2' || selectedYear === '3' || selectedYear === '4') && (
          <Select value={selectedItinerari || "all"} onValueChange={(value) => setSelectedItinerari(value === "all" ? "" : value)}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tots els itineraris" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tots els itineraris</SelectItem>
              {itineraris.map(spec => (
                <SelectItem key={spec} value={spec}>{spec}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Groups Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filteredGroups.map(group => {
          const groupSubjects = getSubjectsForGroup(group.name)
          const isExpanded = expandedGroups.has(group.id)
          
          return (
            <Card key={group.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{group.name}</CardTitle>
                    <div className="space-y-1 mt-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <School className="h-3 w-3" />
                        <span>{group.year}r curs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-3 w-3" />
                        <span>{group.shift === 'mati' ? 'Matí' : 'Tarda'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Users className="h-3 w-3" />
                        <span>{group.max_students} estudiants màx.</span>
                      </div>
                      {group.specialization && (
                        <Badge variant="secondary" className="mt-1">
                          {group.specialization}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEditGroup(group)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDeleteGroup(group)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full justify-start"
                      onClick={() => toggleGroupExpanded(group.id)}
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 mr-2" />
                      ) : (
                        <ChevronRight className="h-4 w-4 mr-2" />
                      )}
                      <BookOpen className="h-4 w-4 mr-2" />
                      {groupSubjects.length} assignatures
                    </Button>
                  </div>
                  
                  {isExpanded && (
                    <div className="space-y-2 mt-2">
                      <ScrollArea className="h-[200px]">
                        <div className="space-y-1 pr-3">
                          {groupSubjects.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              Cap assignatura assignada
                            </p>
                          ) : (
                            groupSubjects.map(subject => (
                              <div
                                key={subject.id}
                                className="text-sm p-2 rounded-md bg-muted/50"
                              >
                                <div className="font-medium">{subject.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {subject.code} • {subject.credits} crèdits • {subject.semester}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </ScrollArea>
                    </div>
                  )}
                  
                  <Button
                    className="w-full"
                    variant="secondary"
                    onClick={() => handleAssignSubjects(group)}
                  >
                    <BookOpen className="h-4 w-4 mr-2" />
                    Gestionar Assignatures
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Create/Edit Group Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingGroup ? 'Editar Grup' : 'Crear Nou Grup'}
            </DialogTitle>
            <DialogDescription>
              {editingGroup 
                ? 'Modifica les dades del grup d\'estudiants'
                : 'Introdueix les dades del nou grup d\'estudiants'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">Nom del grup</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: GR3-Am"
              />
            </div>
            
            <div>
              <Label htmlFor="year">Curs</Label>
              <Select 
                value={formData.year.toString()} 
                onValueChange={(value) => setFormData({ ...formData, year: parseInt(value) })}
              >
                <SelectTrigger id="year">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1r curs</SelectItem>
                  <SelectItem value="2">2n curs</SelectItem>
                  <SelectItem value="3">3r curs</SelectItem>
                  <SelectItem value="4">4t curs</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="shift">Torn</Label>
              <Select 
                value={formData.shift} 
                onValueChange={(value) => setFormData({ ...formData, shift: value as 'mati' | 'tarda' })}
              >
                <SelectTrigger id="shift">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mati">Matí</SelectItem>
                  <SelectItem value="tarda">Tarda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="max_students">Capacitat màxima</Label>
              <Input
                id="max_students"
                type="number"
                value={formData.max_students}
                onChange={(e) => setFormData({ ...formData, max_students: parseInt(e.target.value) || 25 })}
              />
            </div>
            
            <div>
              <Label htmlFor="itinerari">Itinerari (opcional)</Label>
              <Select 
                value={formData.itinerari || "none"} 
                onValueChange={(value) => setFormData({ ...formData, itinerari: value === "none" ? "" : value })}
              >
                <SelectTrigger id="itinerari">
                  <SelectValue placeholder="Selecciona itinerari" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Cap</SelectItem>
                  {itineraris.map(spec => (
                    <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel·lar
            </Button>
            <Button onClick={handleSaveGroup} disabled={saving || !formData.name}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {editingGroup ? 'Actualitzar' : 'Crear'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Subjects Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={(open) => {
        setAssignDialogOpen(open)
        if (!open) setSubjectFilter('')
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Assignar Assignatures a {selectedGroup?.name}</DialogTitle>
            <DialogDescription>
              Selecciona les assignatures que pot cursar aquest grup
            </DialogDescription>
          </DialogHeader>
          
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Filtrar per nom d'assignatura..."
                value={subjectFilter}
                onChange={(e) => setSubjectFilter(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
          
          <ScrollArea className="h-[400px]">
            <div className="space-y-4 pr-3">
              {subjects
                .filter(subject => 
                  subject.name.toLowerCase().includes(subjectFilter.toLowerCase()) ||
                  subject.code.toLowerCase().includes(subjectFilter.toLowerCase())
                )
                .map(subject => {
                const isSelected = selectedSubjects.has(subject.id)
                
                return (
                  <div
                    key={subject.id}
                    className={cn(
                      "flex items-center space-x-3 p-3 rounded-lg border",
                      isSelected && "bg-primary/5 border-primary"
                    )}
                  >
                    <Checkbox
                      id={subject.id}
                      checked={isSelected}
                      onCheckedChange={(checked) => {
                        const newSelected = new Set(selectedSubjects)
                        if (checked) {
                          newSelected.add(subject.id)
                        } else {
                          newSelected.delete(subject.id)
                        }
                        setSelectedSubjects(newSelected)
                      }}
                    />
                    <label
                      htmlFor={subject.id}
                      className="flex-1 cursor-pointer space-y-1"
                    >
                      <div className="font-medium">{subject.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {subject.code} • {subject.credits} crèdits • {subject.semester}
                      </div>
                    </label>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
              Cancel·lar
            </Button>
            <Button onClick={handleSaveAssignments} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Guardar Assignacions
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}