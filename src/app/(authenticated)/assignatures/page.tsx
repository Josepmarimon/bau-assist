'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { SubjectDetailDialog } from '@/components/subjects/SubjectDetailDialog'
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
  GraduationCap
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
  password?: string | null
  username?: string | null
}

interface Filters {
  grau: string
  curs: string
  itinerari: string
  semestre: string
  torn: string
  nom: string
}

export default function SubjectsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [filters, setFilters] = useState<Filters>({
    grau: '',
    curs: '',
    itinerari: '',
    semestre: '',
    torn: '',
    nom: ''
  })
  const [studentGroups, setStudentGroups] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    loadSubjects()
    loadStudentGroups()
  }, [])

  const loadSubjects = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('subjects')
        .select(`
          *,
          itinerari:"ID Itinerari"
        `)
        .order('code', { ascending: true })

      if (error) throw error
      setSubjects(data || [])
    } catch (error) {
      console.error('Error loading subjects:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStudentGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('student_groups')
        .select('shift')
        .not('shift', 'is', null)

      if (error) throw error
      
      const uniqueShifts = [...new Set(data?.map(g => g.shift) || [])]
      setStudentGroups(uniqueShifts)
    } catch (error) {
      console.error('Error loading student groups:', error)
    }
  }

  const handleDelete = async (subjectId: string) => {
    if (!confirm('Estàs segur que vols eliminar aquesta assignatura?')) {
      return
    }

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', subjectId)

      if (error) throw error

      // Reload subjects after deletion
      await loadSubjects()
    } catch (error) {
      console.error('Error deleting subject:', error)
      alert('Error eliminant l\'assignatura')
    }
  }

  const filteredSubjects = subjects.filter(subject => {
    // Nom filter (search term)
    const search = (filters.nom || searchTerm).toLowerCase()
    const matchesSearch = !search || 
      subject.name.toLowerCase().includes(search) || 
      subject.code.toLowerCase().includes(search)
    
    // Grau filter
    const matchesGrau = !filters.grau || filters.grau === 'all' || subject.degree === filters.grau
    
    // Curs filter
    const matchesCurs = !filters.curs || filters.curs === 'all' || subject.year.toString() === filters.curs
    
    // Itinerari filter
    const matchesItinerari = !filters.itinerari || filters.itinerari === 'all' || subject.itinerari === filters.itinerari
    
    // Semestre filter
    const matchesSemestre = !filters.semestre || filters.semestre === 'all' || subject.semester === filters.semestre
    
    // Note: Torn (shift) filter cannot be applied directly to subjects
    // as it's a property of student groups, not subjects
    
    return matchesSearch && matchesGrau && matchesCurs && matchesItinerari && matchesSemestre
  })

  const totalECTS = subjects.reduce((sum, subject) => sum + subject.credits, 0)
  const subjectsByYear = subjects.reduce((acc, subject) => {
    acc[subject.year] = (acc[subject.year] || 0) + 1
    return acc
  }, {} as Record<number, number>)

  // Get unique values for filters
  const uniqueDegrees = [...new Set(subjects.map(s => s.degree).filter(Boolean))] as string[]
  const uniqueYears = [...new Set(subjects.map(s => s.year))].sort()
  const uniqueItineraris = [...new Set(subjects.map(s => s.itinerari).filter(Boolean))] as string[]
  const uniqueSemesters = [...new Set(subjects.map(s => s.semester))].sort()

  // Clear individual filter
  const clearFilter = (filterName: keyof Filters) => {
    setFilters(prev => ({ ...prev, [filterName]: '' }))
  }

  // Clear all filters
  const clearAllFilters = () => {
    setFilters({
      grau: '',
      curs: '',
      itinerari: '',
      semestre: '',
      torn: '',
      nom: ''
    })
    setSearchTerm('')
  }

  // Check if any filter is active
  const hasActiveFilters = Object.values(filters).some(v => v !== '' && v !== 'all') || searchTerm !== ''

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assignatures</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona les assignatures del centre
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Assignatura
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <Card className="p-3 bg-sky-50 border-sky-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-xl font-bold">{subjects.length}</p>
            </div>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3 bg-sky-50 border-sky-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">ECTS</p>
              <p className="text-xl font-bold">{totalECTS}</p>
            </div>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3 bg-sky-50 border-sky-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Disseny</p>
              <p className="text-xl font-bold">{subjects.filter(s => s.degree === 'Disseny').length}</p>
            </div>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3 bg-sky-50 border-sky-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">BBAA</p>
              <p className="text-xl font-bold">{subjects.filter(s => s.degree === 'Belles Arts').length}</p>
            </div>
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Search and list */}
      <Card className="bg-sky-50 border-sky-200">
        <CardHeader>
          <CardTitle>Llistat d'Assignatures</CardTitle>
          <CardDescription>
            Cerca i gestiona les assignatures del pla d'estudis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            {/* Filter dropdowns */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {/* Grau filter */}
              <Select value={filters.grau} onValueChange={(value) => setFilters(prev => ({ ...prev, grau: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Grau" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tots els graus</SelectItem>
                  {uniqueDegrees.map(degree => (
                    <SelectItem key={degree} value={degree}>
                      {degree}
                    </SelectItem>
                  ))}
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
                {filters.grau && filters.grau !== 'all' && (
                  <Badge variant="secondary" className="gap-1">
                    Grau: {filters.grau}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => clearFilter('grau')}
                    />
                  </Badge>
                )}
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>Grau</TableHead>
                    <TableHead>Crèdits ECTS</TableHead>
                    <TableHead>Curs</TableHead>
                    <TableHead>Semestre</TableHead>
                    <TableHead>Itinerari</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubjects.map((subject) => (
                    <TableRow key={subject.id} className="group">
                      <TableCell>
                        <div className="max-w-[300px]">
                          <div className="font-medium truncate">
                            {subject.name}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 mt-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                setSelectedSubject(subject)
                                setDetailOpen(true)
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => {
                                // TODO: Implement edit functionality
                                console.log('Edit subject:', subject.id)
                              }}
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleDelete(subject.id)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {subject.degree ? (
                          <Badge variant="outline">
                            {subject.degree}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{subject.credits}</TableCell>
                      <TableCell>{subject.year}r</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {subject.semester}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {subject.itinerari ? (
                          <Badge variant="secondary">
                            {subject.itinerari === 'A' ? 'Audiovisual' :
                             subject.itinerari === 'G' ? 'Gràfic' :
                             subject.itinerari === 'I' ? 'Espais' :
                             subject.itinerari === 'M' ? 'Moda' :
                             subject.itinerari}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subject Detail Dialog */}
      <SubjectDetailDialog
        subject={selectedSubject}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  )
}