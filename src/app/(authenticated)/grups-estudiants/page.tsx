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
  ChevronRight
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

interface SubjectGroup {
  id: string
  subject_id: string
  semester_id: string
  group_code: string
  max_students: number
  created_at: string
  updated_at: string
  // Relations
  subject?: {
    id: string
    code: string
    name: string
    year: number
    credits: number
    department?: string
    type: 'OBLIGATORIA' | 'OPTATIVA' | 'TFG'
    description?: string
  }
  semester?: {
    name: string
    academic_year?: {
      name: string
    }
  }
  // Computed fields
  current_students?: number
  num_teachers?: number
  teacher_names?: string
}

export default function StudentGroupsPage() {
  const [groups, setGroups] = useState<SubjectGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set())
  const [filterYear, setFilterYear] = useState<string>('all')
  const [filterType, setFilterType] = useState<string>('all')
  const [selectedDegree, setSelectedDegree] = useState<string>('GD')
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    loadGroups()
  }, [selectedDegree])

  const loadGroups = async () => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('subject_groups')
        .select(`
          *,
          subjects!inner(
            id,
            code,
            name,
            year,
            credits,
            department,
            type,
            description
          ),
          semesters(
            name,
            academic_years(
              name
            )
          )
        `)
        .like('subjects.code', `${selectedDegree}%`)
        .order('group_code', { ascending: true })

      if (error) throw error
      
      console.log('Raw subject groups data:', data?.slice(0, 5)) // Debug first 5 groups
      
      // Get teacher names using the RPC function
      let teacherNames: Record<string, string> = {}
      
      const { data: teacherData, error: teacherError } = await supabase
        .rpc('get_teacher_names_by_degree', { degree_prefix: selectedDegree })
      
      if (teacherData) {
        teacherData.forEach((item: any) => {
          teacherNames[item.subject_group_id] = item.teacher_names
        })
      }
      
      // Map the data with teacher names
      const groupsWithMappedData = (data || []).map((group) => {
        return {
          ...group,
          subject: group.subjects, // Map the subjects relation to subject
          semester: group.semesters, // Map the semesters relation to semester
          current_students: Math.floor(Math.random() * group.max_students), // Placeholder
          teacher_names: teacherNames[group.id] || '' // Get teacher names from our calculation
        }
      })
      
      setGroups(groupsWithMappedData)
    } catch (error) {
      console.error('Error loading subject groups:', error)
      setGroups([])
    } finally {
      setLoading(false)
    }
  }

  const filteredGroups = groups.filter(group => {
    const search = searchTerm.toLowerCase()
    const matchesSearch = group.group_code.toLowerCase().includes(search) ||
           (group.subject?.name && group.subject.name.toLowerCase().includes(search)) ||
           (group.subject?.code && group.subject.code.toLowerCase().includes(search))
    
    const matchesYear = filterYear === 'all' || group.subject?.year?.toString() === filterYear
    const matchesType = filterType === 'all' || group.subject?.type === filterType
    
    return matchesSearch && matchesYear && matchesType
  })
  
  // Get unique values for filters
  const uniqueYears = [...new Set(groups.map(g => g.subject?.year).filter(Boolean))].sort()
  const uniqueTypes = [...new Set(groups.map(g => g.subject?.type).filter(Boolean))]

  // Group by subject and sort by subject code
  const groupedBySubject = filteredGroups.reduce((acc, group) => {
    const subjectKey = group.subject?.id || 'no-subject'
    if (!acc[subjectKey]) {
      acc[subjectKey] = {
        subject: group.subject,
        groups: []
      }
    }
    acc[subjectKey].groups.push(group)
    return acc
  }, {} as Record<string, { subject: any, groups: SubjectGroup[] }>)
  
  // Sort the grouped subjects by code
  const sortedGroupedSubjects = Object.values(groupedBySubject).sort((a, b) => {
    const codeA = a.subject?.code || 'ZZZ'
    const codeB = b.subject?.code || 'ZZZ'
    return codeA.localeCompare(codeB)
  })

  const toggleSubject = (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects)
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId)
    } else {
      newExpanded.add(subjectId)
    }
    setExpandedSubjects(newExpanded)
  }

  const handleViewGroup = (groupId: string) => {
    router.push(`/grups-estudiants/${groupId}`)
  }

  const handleEditGroup = (groupId: string) => {
    router.push(`/grups-estudiants/${groupId}/edit`)
  }

  const totalStudents = groups.reduce((sum, group) => sum + (group.current_students || 0), 0)
  const totalCapacity = groups.reduce((sum, group) => sum + group.max_students, 0)
  const occupancyRate = totalCapacity > 0 ? Math.round((totalStudents / totalCapacity) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Grups d'Assignatures</h1>
          <p className="text-muted-foreground mt-2">
            Gestiona els grups d'assignatures i les seves assignacions
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nou Grup
        </Button>
      </div>

      {/* Degree Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Selecciona el Grau</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedDegree} onValueChange={setSelectedDegree}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GD">Grau en Disseny</SelectItem>
              <SelectItem value="GB">Grau en Belles Arts</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>


      {/* Search and list */}
      <Card>
        <CardHeader>
          <CardTitle>Llistat de Grups</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cercar per codi de grup, assignatura..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
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
              {sortedGroupedSubjects.map(({ subject, groups }) => {
                const isExpanded = expandedSubjects.has(subject?.id || 'no-subject')
                return (
                  <div key={subject?.id || 'no-subject'} className="border rounded-lg overflow-hidden">
                    <div 
                      className="bg-muted/50 px-4 py-3 cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => toggleSubject(subject?.id || 'no-subject')}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          <div>
                            <h3 className="font-semibold text-lg">
                              {subject?.name || 'Sense assignatura'}
                            </h3>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span>{subject?.code}</span>
                              <span>{subject?.year}r curs</span>
                              <span>{subject?.credits} crèdits</span>
                            </div>
                          </div>
                        </div>
                        <Badge variant="secondary">
                          {groups.length} grups
                        </Badge>
                      </div>
                    </div>
                    {isExpanded && (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-[150px]">Codi Grup</TableHead>
                            <TableHead>Professors Assignats</TableHead>
                            <TableHead>Semestre</TableHead>
                            <TableHead className="text-right">Accions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {groups.map((group) => (
                            <TableRow key={group.id}>
                              <TableCell className="font-medium">
                                <Badge variant="outline">
                                  {group.group_code}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {group.teacher_names ? (
                                  <div className="text-sm">
                                    {group.teacher_names}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground text-sm">
                                    Sense professor assignat
                                  </span>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm">
                                  {group.semester?.name || '-'}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex items-center justify-end gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleViewGroup(group.id)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleEditGroup(group.id)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
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