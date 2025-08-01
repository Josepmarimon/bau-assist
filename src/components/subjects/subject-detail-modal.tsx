'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { SubjectGroupProfilesList } from '@/components/subject-group-profiles/subject-group-profiles-list'
import {
  BookOpen,
  Users,
  Clock,
  Calendar,
  MapPin,
  User,
  Package,
  Loader2,
  GraduationCap,
  Hash,
  Edit,
  X,
  Link,
  Check
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

interface SubjectDetailModalProps {
  subject: Subject
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit?: () => void
}

export function SubjectDetailModal({ 
  subject, 
  open, 
  onOpenChange,
  onEdit 
}: SubjectDetailModalProps) {
  const [loading, setLoading] = useState(true)
  const [groups, setGroups] = useState<SubjectGroup[]>([])
  const [softwareRequirements, setSoftwareRequirements] = useState<SoftwareRequirement[]>([])
  const [groupAssignmentDetails, setGroupAssignmentDetails] = useState<Record<string, any[]>>({})
  const [activeTab, setActiveTab] = useState('groups')
  const [copiedUrl, setCopiedUrl] = useState(false)
  
  const supabase = createClient()

  useEffect(() => {
    if (open && subject) {
      loadSubjectData()
    }
  }, [open, subject])

  const loadSubjectData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadSubjectGroups(),
        loadSoftwareRequirements()
      ])
    } catch (error) {
      console.error('Error loading subject data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadSubjectGroups = async () => {
    try {
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
        .eq('subject_id', subject.id)
        .order('group_code', { ascending: true })

      if (error) throw error
      
      // Get teacher names for groups
      let teacherNames: Record<string, string> = {}
      
      const { data: teacherData } = await supabase
        .rpc('get_teacher_names_for_subject', { p_subject_id: subject.id })
      
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
      
      const assignmentDetails: Record<string, any[]> = {}
      
      if (assignmentData) {
        assignmentData.forEach((assignment: any) => {
          if (!assignmentDetails[assignment.subject_group_id]) {
            assignmentDetails[assignment.subject_group_id] = []
          }
          
          assignmentDetails[assignment.subject_group_id].push({
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
      
      setGroupAssignmentDetails(assignmentDetails)
      
      const groupsWithTeachers = (data || []).map((group) => ({
        ...group,
        semester: group.semesters,
        teacher_names: teacherNames[group.id] || ''
      }))
      
      setGroups(groupsWithTeachers)
    } catch (error) {
      console.error('Error loading subject groups:', error)
    }
  }

  const loadSoftwareRequirements = async () => {
    try {
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
        .eq('subject_id', subject.id)
        .order('academic_year', { ascending: false })

      if (error) throw error
      setSoftwareRequirements((data as any) || [])
    } catch (error) {
      console.error('Error loading software requirements:', error)
    }
  }

  const getDayName = (day: number) => {
    const days = ['', 'Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']
    return days[day] || ''
  }

  const getItinerariName = (code: string | null | undefined) => {
    if (!code) return 'No especificat'
    switch (code) {
      case 'A': return 'Audiovisual'
      case 'G': return 'Gràfic'
      case 'I': return 'Espais'
      case 'M': return 'Moda'
      default: return code
    }
  }

  const copySubjectUrl = async () => {
    const url = `${window.location.origin}/assignatures-grups?subject=${subject.id}`
    try {
      await navigator.clipboard.writeText(url)
      setCopiedUrl(true)
      setTimeout(() => setCopiedUrl(false), 2000)
    } catch (err) {
      console.error('Failed to copy URL:', err)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-2xl mb-2">{subject.name}</DialogTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="font-mono">{subject.code}</Badge>
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  {subject.credits} ECTS
                </Badge>
                <Badge variant="secondary">
                  <GraduationCap className="h-3 w-3 mr-1" />
                  {subject.year}r curs
                </Badge>
                <Badge variant="secondary">
                  <Calendar className="h-3 w-3 mr-1" />
                  {subject.semester}
                </Badge>
                {subject.itinerari && (
                  <Badge variant="secondary">
                    <Hash className="h-3 w-3 mr-1" />
                    {getItinerariName(subject.itinerari)}
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={copySubjectUrl}
                className="relative"
              >
                {copiedUrl ? (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Copiat!
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Copiar URL
                  </>
                )}
              </Button>
              {onEdit && (
                <Button variant="outline" size="sm" onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>

        <Separator className="my-4" />

        <div className="flex-1 overflow-hidden">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-5 flex-shrink-0">
              <TabsTrigger value="groups">Grups</TabsTrigger>
              <TabsTrigger value="profiles">Perfils</TabsTrigger>
              <TabsTrigger value="details">Detalls</TabsTrigger>
              <TabsTrigger value="software">Software</TabsTrigger>
              <TabsTrigger value="needs">Necessitats</TabsTrigger>
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4 pb-4">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                <>
                  {/* Groups Tab */}
                  <TabsContent value="groups" className="mt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Grups de l'assignatura</h3>
                        <Badge variant="outline">
                          {groups.length} {groups.length === 1 ? 'grup' : 'grups'}
                        </Badge>
                      </div>

                      {groups.length === 0 ? (
                        <Card className="bg-muted/50">
                          <CardContent className="flex flex-col items-center justify-center py-8">
                            <Users className="h-12 w-12 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">No hi ha grups per aquesta assignatura</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-3">
                          {groups.map((group) => (
                            <Card key={group.id}>
                              <CardContent className="pt-6">
                                <div className="space-y-3">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <Badge variant="outline" className="font-mono text-lg">
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
                                  </div>
                                  
                                  {group.teacher_names && (
                                    <div className="flex items-center gap-2 text-sm">
                                      <User className="h-4 w-4 text-muted-foreground" />
                                      <span className="text-muted-foreground">Professors:</span>
                                      <span className="font-medium">{group.teacher_names}</span>
                                    </div>
                                  )}
                                  
                                  {groupAssignmentDetails[group.id] && groupAssignmentDetails[group.id].length > 0 && (
                                    <div className="space-y-2">
                                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                        <MapPin className="h-4 w-4" />
                                        <span>Horaris i aules:</span>
                                      </div>
                                      <div className="ml-6 space-y-1">
                                        {groupAssignmentDetails[group.id].map((assignment, idx) => (
                                          <div key={idx} className="flex items-center gap-2 text-sm">
                                            <span className="font-medium min-w-[80px]">
                                              {getDayName(assignment.day)}
                                            </span>
                                            <span className="text-muted-foreground">
                                              {assignment.startTime?.substring(0, 5)} - {assignment.endTime?.substring(0, 5)}
                                            </span>
                                            {assignment.classrooms.map((classroom: any, cIdx: number) => (
                                              <div key={cIdx} className="flex items-center gap-1">
                                                <Badge variant="outline" className="text-xs">
                                                  {classroom.name} ({classroom.building})
                                                </Badge>
                                                {!classroom.is_full_semester && classroom.weeks.length > 0 && (
                                                  <span className="text-xs text-muted-foreground">
                                                    Setm. {classroom.weeks.join(', ')}
                                                  </span>
                                                )}
                                              </div>
                                            ))}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Profiles Tab */}
                  <TabsContent value="profiles" className="mt-0">
                    <SubjectGroupProfilesList subjectId={subject.id} />
                  </TabsContent>

                  {/* Details Tab */}
                  <TabsContent value="details" className="mt-0">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold mb-4">Informació de l'assignatura</h3>
                      
                      <Card>
                        <CardContent className="pt-6">
                          <dl className="grid grid-cols-2 gap-6">
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Codi</dt>
                              <dd className="mt-1 text-base">{subject.code}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Departament</dt>
                              <dd className="mt-1 text-base">{subject.department || 'No especificat'}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Tipus</dt>
                              <dd className="mt-1 text-base">{subject.type}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Crèdits ECTS</dt>
                              <dd className="mt-1 text-base">{subject.credits}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Curs</dt>
                              <dd className="mt-1 text-base">{subject.year}r</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Semestre</dt>
                              <dd className="mt-1 text-base">{subject.semester}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Itinerari</dt>
                              <dd className="mt-1 text-base">{getItinerariName(subject.itinerari)}</dd>
                            </div>
                            <div>
                              <dt className="text-sm font-medium text-muted-foreground">Estat</dt>
                              <dd className="mt-1">
                                <Badge variant={subject.active ? 'default' : 'secondary'}>
                                  {subject.active ? 'Activa' : 'Inactiva'}
                                </Badge>
                              </dd>
                            </div>
                            {subject.password && (
                              <div className="col-span-2">
                                <dt className="text-sm font-medium text-muted-foreground">Password Guia Docent</dt>
                                <dd className="mt-1 font-mono text-xs bg-gray-100 px-3 py-2 rounded border">{subject.password}</dd>
                              </div>
                            )}
                          </dl>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>

                  {/* Software Tab */}
                  <TabsContent value="software" className="mt-0">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold">Software necessari</h3>
                        <Badge variant="outline">
                          {softwareRequirements.length} {softwareRequirements.length === 1 ? 'programa' : 'programes'}
                        </Badge>
                      </div>
                      
                      {softwareRequirements.length === 0 ? (
                        <Card className="bg-muted/50">
                          <CardContent className="flex flex-col items-center justify-center py-8">
                            <Package className="h-12 w-12 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">No hi ha software assignat</p>
                          </CardContent>
                        </Card>
                      ) : (
                        <div className="space-y-3">
                          {softwareRequirements.map((req) => (
                            <Card key={req.id}>
                              <CardContent className="pt-6">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <Package className="h-5 w-5 text-muted-foreground" />
                                    <div>
                                      <p className="font-medium text-base">{req.software.name}</p>
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
                                      {req.notes && (
                                        <p className="text-sm text-muted-foreground mt-2">{req.notes}</p>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-sm text-muted-foreground">
                                    {req.academic_year}
                                  </span>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  {/* Needs Tab */}
                  <TabsContent value="needs" className="mt-0">
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold mb-4">Necessitats especials</h3>
                      
                      <Card className="bg-muted/50">
                        <CardContent className="flex flex-col items-center justify-center py-8">
                          <BookOpen className="h-12 w-12 text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">Informació de necessitats en desenvolupament</p>
                        </CardContent>
                      </Card>
                    </div>
                  </TabsContent>
                </>
              )}
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}