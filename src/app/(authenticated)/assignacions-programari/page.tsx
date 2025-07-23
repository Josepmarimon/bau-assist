'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { CheckboxIndeterminate } from '@/components/ui/checkbox-indeterminate'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { createClient } from '@/lib/supabase/client'
import { 
  Package, 
  Search,
  Plus,
  Save,
  Copy,
  Filter,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface Subject {
  id: string
  code: string
  name: string
  year: number
  type: string
  itinerari?: string | null
}

interface Software {
  id: string
  name: string
  category: string
  license_type: string
}

interface Assignment {
  subject_id: string
  software_id: string
  is_required: boolean
}

export default function SoftwareAssignmentsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [software, setSoftware] = useState<Software[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedSubjects, setSelectedSubjects] = useState<Set<string>>(new Set())
  
  // Filters
  const [subjectSearch, setSubjectSearch] = useState('')
  const [softwareSearch, setSoftwareSearch] = useState('')
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [academicYear, setAcademicYear] = useState('2025-2026')
  
  // Track changes
  const [modifiedAssignments, setModifiedAssignments] = useState<Set<string>>(new Set())
  
  const supabase = createClient()

  useEffect(() => {
    loadData()
  }, [academicYear])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('id, code, name, year, type, credits, semester, ID_Itinerari')
        .order('year')
        .order('code')

      if (subjectsError) throw subjectsError
      console.log('Loaded subjects:', subjectsData?.length, 'Sample:', subjectsData?.[0])
      setSubjects(subjectsData || [])

      // Load software
      const { data: softwareData, error: softwareError } = await supabase
        .from('software')
        .select('id, name, category, license_type')
        .order('name')

      if (softwareError) throw softwareError
      console.log('Loaded software:', softwareData?.length, 'Sample:', softwareData?.[0])
      setSoftware(softwareData || [])

      // Load assignments for current academic year
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from('subject_software')
        .select('subject_id, software_id, is_required')
        .eq('academic_year', academicYear)

      if (assignmentsError) throw assignmentsError
      
      // Convert to simple assignment format
      const assignmentMap = (assignmentsData || []).map(a => ({
        subject_id: a.subject_id,
        software_id: a.software_id,
        is_required: a.is_required
      }))
      setAssignments(assignmentMap)

    } catch (error) {
      console.error('Error loading data:', error)
      toast.error('Error carregant les dades')
    } finally {
      setLoading(false)
    }
  }

  const isAssigned = (subjectId: string, softwareId: string) => {
    return assignments.some(a => a.subject_id === subjectId && a.software_id === softwareId)
  }

  const getAssignment = (subjectId: string, softwareId: string) => {
    return assignments.find(a => a.subject_id === subjectId && a.software_id === softwareId)
  }

  const toggleAssignment = (subjectId: string, softwareId: string, isRequired: boolean = true) => {
    const key = `${subjectId}|||${softwareId}`
    const newModified = new Set(modifiedAssignments)
    newModified.add(key)
    setModifiedAssignments(newModified)

    const existingIndex = assignments.findIndex(
      a => a.subject_id === subjectId && a.software_id === softwareId
    )

    if (existingIndex >= 0) {
      // Remove assignment
      setAssignments(assignments.filter((_, index) => index !== existingIndex))
    } else {
      // Add assignment
      setAssignments([...assignments, { subject_id: subjectId, software_id: softwareId, is_required: isRequired }])
    }
  }

  const saveChanges = async () => {
    try {
      setSaving(true)
      
      console.log('Modified assignments:', Array.from(modifiedAssignments))
      console.log('Current assignments state:', assignments)

      // Get current assignments from database
      const { data: currentData, error: currentError } = await supabase
        .from('subject_software')
        .select('subject_id, software_id')
        .eq('academic_year', academicYear)

      if (currentError) throw currentError

      const currentAssignments = new Set(
        (currentData || []).map(a => `${a.subject_id}|||${a.software_id}`)
      )

      // Prepare new assignments
      const newAssignments = new Set(
        assignments.map(a => `${a.subject_id}|||${a.software_id}`)
      )

      // Find assignments to delete
      const toDelete = Array.from(modifiedAssignments).filter(key => {
        return currentAssignments.has(key) && !newAssignments.has(key)
      })

      // Find assignments to insert
      const toInsert = assignments.filter(a => {
        const key = `${a.subject_id}|||${a.software_id}`
        return modifiedAssignments.has(key) && !currentAssignments.has(key)
      })

      // Delete removed assignments
      if (toDelete.length > 0) {
        for (const key of toDelete) {
          const [subjectId, softwareId] = key.split('|||')
          
          if (!subjectId || !softwareId) {
            console.error(`Invalid key format: ${key}`)
            continue
          }
          
          console.log(`Deleting assignment: subject_id=${subjectId}, software_id=${softwareId}`)
          
          const { error } = await supabase
            .from('subject_software')
            .delete()
            .eq('subject_id', subjectId)
            .eq('software_id', softwareId)
            .eq('academic_year', academicYear)

          if (error) {
            console.error(`Error deleting assignment:`, error)
            throw error
          }
        }
      }

      // Insert new assignments
      if (toInsert.length > 0) {
        const { error } = await supabase
          .from('subject_software')
          .insert(
            toInsert.map(a => ({
              subject_id: a.subject_id,
              software_id: a.software_id,
              academic_year: academicYear,
              is_required: a.is_required
            }))
          )

        if (error) throw error
      }

      toast.success(`S'han guardat ${modifiedAssignments.size} canvis`)
      setModifiedAssignments(new Set())
      
      // Reload to ensure consistency
      await loadData()

    } catch (error) {
      console.error('Error saving changes:', error)
      toast.error('Error guardant els canvis')
    } finally {
      setSaving(false)
    }
  }

  const copyFromYear = async (fromYear: string) => {
    try {
      setSaving(true)
      
      const { data, error } = await supabase
        .from('subject_software')
        .select('subject_id, software_id, is_required')
        .eq('academic_year', fromYear)

      if (error) throw error

      if (!data || data.length === 0) {
        toast.error('No hi ha dades per copiar')
        return
      }

      // Set the assignments
      const newAssignments = data.map(a => ({
        subject_id: a.subject_id,
        software_id: a.software_id,
        is_required: a.is_required
      }))

      setAssignments(newAssignments)
      
      // Mark all as modified
      const allKeys = newAssignments.map(a => `${a.subject_id}|||${a.software_id}`)
      setModifiedAssignments(new Set(allKeys))

      toast.success(`S'han copiat ${data.length} assignacions de ${fromYear}`)

    } catch (error) {
      console.error('Error copying assignments:', error)
      toast.error('Error copiant les assignacions')
    } finally {
      setSaving(false)
    }
  }

  // Filtered data
  const filteredSubjects = subjects.filter(subject => {
    if (subjectSearch && !subject.name.toLowerCase().includes(subjectSearch.toLowerCase()) && 
        !subject.code.toLowerCase().includes(subjectSearch.toLowerCase())) {
      return false
    }
    if (selectedYear !== 'all' && subject.year !== parseInt(selectedYear)) {
      return false
    }
    if (selectedType !== 'all' && subject.type !== selectedType) {
      return false
    }
    return true
  })

  const filteredSoftware = software.filter(sw => {
    if (softwareSearch && !sw.name.toLowerCase().includes(softwareSearch.toLowerCase())) {
      return false
    }
    if (selectedCategory !== 'all' && sw.category !== selectedCategory) {
      return false
    }
    return true
  })

  // Get unique values for filters
  const years = [...new Set(subjects.map(s => s.year))].sort()
  const types = [...new Set(subjects.map(s => s.type))]
  const categories = [...new Set(software.map(s => s.category))]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignació de Software</h1>
          <p className="text-muted-foreground mt-2">
            Assigna software a les assignatures per l'any acadèmic {academicYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {modifiedAssignments.size > 0 && (
            <>
              <Badge variant="secondary" className="gap-1">
                <AlertCircle className="h-3 w-3" />
                {modifiedAssignments.size} canvis pendents
              </Badge>
              <Button 
                onClick={saveChanges}
                disabled={saving}
              >
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
            </>
          )}
        </div>
      </div>

      {/* Controls */}
      <Card className="bg-sky-50 border-sky-200">
        <CardHeader>
          <CardTitle>Opcions</CardTitle>
          <CardDescription>
            Selecciona l'any acadèmic i els filtres per gestionar les assignacions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-4">
            <div>
              <Label>Any Acadèmic</Label>
              <Select value={academicYear} onValueChange={setAcademicYear}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2025-2026">2025-2026</SelectItem>
                  <SelectItem value="2024-2025">2024-2025</SelectItem>
                  <SelectItem value="2026-2027">2026-2027</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Copiar d'un altre any</Label>
              <Select onValueChange={copyFromYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un any" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024-2025">Copiar de 2024-2025</SelectItem>
                  <SelectItem value="2025-2026">Copiar de 2025-2026</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Subjects */}
        <Card className="h-[800px] flex flex-col bg-sky-50 border-sky-200">
          <CardHeader>
            <CardTitle>Assignatures</CardTitle>
            <CardDescription>
              Selecciona una assignatura per veure i modificar el seu software
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cercar assignatura..."
                  value={subjectSearch}
                  onChange={(e) => setSubjectSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Select value={selectedYear} onValueChange={setSelectedYear}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tots els cursos</SelectItem>
                    {years.map(year => (
                      <SelectItem key={year} value={year.toString()}>{year}r curs</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tots els tipus</SelectItem>
                    {types.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {filteredSubjects.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const allIds = new Set(filteredSubjects.map(s => s.id))
                      setSelectedSubjects(allIds)
                    }}
                  >
                    Seleccionar tot
                  </Button>
                  {selectedSubjects.size > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSubjects(new Set())}
                    >
                      Deseleccionar tot
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Subject List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                filteredSubjects.map(subject => {
                  const subjectAssignments = assignments.filter(a => a.subject_id === subject.id)
                  const assignedCount = subjectAssignments.length
                  const isSelected = selectedSubjects.has(subject.id)
                  
                  return (
                    <div
                      key={subject.id}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                        isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-accent/50'
                      }`}
                      onClick={(e) => {
                        // Prevent click if clicking on checkbox
                        if ((e.target as HTMLElement).closest('button[role="checkbox"]')) {
                          return
                        }
                        const newSelected = new Set(selectedSubjects)
                        if (isSelected) {
                          newSelected.delete(subject.id)
                        } else {
                          newSelected.add(subject.id)
                        }
                        setSelectedSubjects(newSelected)
                      }}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Checkbox 
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
                              onClick={(e) => e.stopPropagation()}
                            />
                            <h4 className="font-medium">{subject.name}</h4>
                            <Badge variant="outline" className="text-xs">
                              {subject.code}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground ml-6">
                            <span>{subject.year}r curs</span>
                            <span>·</span>
                            <span>{subject.type}</span>
                            {assignedCount > 0 && (
                              <>
                                <span>·</span>
                                <span className="flex items-center gap-1">
                                  <Package className="h-3 w-3" />
                                  {assignedCount} programes
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Software */}
        <Card className="h-[800px] flex flex-col bg-sky-50 border-sky-200">
          <CardHeader>
            <CardTitle>Software Disponible</CardTitle>
            <CardDescription>
              Marca el software necessari per cada assignatura
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
            {/* Filters */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Cercar software..."
                  value={softwareSearch}
                  onChange={(e) => setSoftwareSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Totes les categories</SelectItem>
                  {categories.map(cat => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Software List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedSubjects.size > 0 ? (
                    // Subjects selected - show checkboxes
                    <div className="space-y-2">
                      <div className="mb-4 p-3 bg-primary/10 rounded-lg">
                        <p className="text-sm font-medium">
                          {selectedSubjects.size} assignatura{selectedSubjects.size > 1 ? 'es' : ''} seleccionada{selectedSubjects.size > 1 ? 'es' : ''}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Marca els programes necessaris per aquestes assignatures
                        </p>
                      </div>
                      {filteredSoftware.map(sw => {
                        // Check how many selected subjects have this software
                        const selectedArray = Array.from(selectedSubjects)
                        const assignedCount = selectedArray.filter(subjectId => 
                          isAssigned(subjectId, sw.id)
                        ).length
                        const allAssigned = assignedCount === selectedSubjects.size
                        const someAssigned = assignedCount > 0 && assignedCount < selectedSubjects.size
                        
                        // Debug log
                        if (sw.name === 'Teams') {
                          console.log(`${sw.name}: assigned=${assignedCount}/${selectedSubjects.size}, all=${allAssigned}, some=${someAssigned}`)
                        }
                        
                        return (
                          <div
                            key={sw.id}
                            className="p-4 rounded-lg border transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <CheckboxIndeterminate
                                checked={allAssigned}
                                indeterminate={someAssigned}
                                onCheckedChange={(checked) => {
                                  // If checked is true, add to all subjects that don't have it
                                  // If checked is false, remove from all subjects that have it
                                  selectedArray.forEach(subjectId => {
                                    const isCurrentlyAssigned = isAssigned(subjectId, sw.id)
                                    
                                    if (checked && !isCurrentlyAssigned) {
                                      // Add assignment
                                      toggleAssignment(subjectId, sw.id)
                                    } else if (!checked && isCurrentlyAssigned) {
                                      // Remove assignment
                                      toggleAssignment(subjectId, sw.id)
                                    }
                                  })
                                }}
                              />
                              <div className="flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium">{sw.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {sw.category}
                                  </Badge>
                                  <Badge 
                                    variant={sw.license_type === 'proprietary' ? 'destructive' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {sw.license_type === 'proprietary' ? 'Privatiu' : 'Lliure'}
                                  </Badge>
                                  {assignedCount > 0 && (
                                    <Badge variant="secondary" className="text-xs">
                                      {assignedCount}/{selectedSubjects.size} assignades
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    // Multiple or no subjects - show software list with counts
                    <div className="space-y-2">
                      {filteredSoftware.map(sw => {
                        const assignedToCount = assignments.filter(a => a.software_id === sw.id).length
                        
                        return (
                          <div
                            key={sw.id}
                            className="p-4 rounded-lg border"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Package className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{sw.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {sw.category}
                                </Badge>
                                <Badge 
                                  variant={sw.license_type === 'proprietary' ? 'destructive' : 'secondary'}
                                  className="text-xs"
                                >
                                  {sw.license_type === 'proprietary' ? 'Privatiu' : 'Lliure'}
                                </Badge>
                              </div>
                              {assignedToCount > 0 && (
                                <span className="text-sm text-muted-foreground">
                                  {assignedToCount} assignatures
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}