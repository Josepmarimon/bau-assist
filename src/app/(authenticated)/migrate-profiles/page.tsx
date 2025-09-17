'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import {
  Database,
  Copy,
  Check,
  AlertTriangle,
  Users,
  BookOpen,
  Calendar,
  School,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface SubjectGroup {
  id: string
  subject_id: string
  group_code: string
  max_students: number
  semester_id: string
  created_at: string
  updated_at: string
}

interface TeacherAssignment {
  id: string
  teacher_id: string
  subject_group_id: string
  academic_year: string
  ects_assigned: number
  is_coordinator: boolean
  teacher: {
    first_name: string
    last_name: string
    email: string
  }
}

interface Assignment {
  id: string
  subject_group_id: string
  student_group_id: string
  time_slot_id: string
  semester_id: string
  hours_per_week: number
  time_slot: {
    day_of_week: number
    start_time: string
    end_time: string
    slot_type: string
  }
  assignment_classrooms: Array<{
    id: string
    classroom_id: string
    is_full_semester: boolean
    week_range_type: string
    classroom: {
      code: string
      name: string
    }
    assignment_classroom_weeks: Array<{
      week_number: number
    }>
  }>
}

interface ProfileMember {
  id: string
  profile_id: string
  subject_group_id: string
  profile: {
    id: string
    name: string
  }
}

interface AnalysisData {
  originalSubjectGroup: SubjectGroup | null
  teacherAssignments: TeacherAssignment[]
  assignments: Assignment[]
  profileMembers: ProfileMember[]
}

export default function MigrateProfilesPage() {
  const [analysis, setAnalysis] = useState<AnalysisData>({
    originalSubjectGroup: null,
    teacherAssignments: [],
    assignments: [],
    profileMembers: []
  })
  const [loading, setLoading] = useState(false)
  const [migrating, setMigrating] = useState(false)
  const [migrationProgress, setMigrationProgress] = useState(0)
  const [migrationStep, setMigrationStep] = useState('')
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [creatingStudentGroups, setCreatingStudentGroups] = useState(false)
  const [studentGroupsCreated, setStudentGroupsCreated] = useState(false)

  const supabase = createClient()
  const SUBJECT_ID = '080c1c5d-76b0-4023-b53e-65c38bc5588f' // Taller de Gràfic i Comunicació Visual I
  const ORIGINAL_GROUP_CODE = 'GR3-Gm1'

  useEffect(() => {
    analyzeCurrentState()
  }, [])

  const analyzeCurrentState = async () => {
    setLoading(true)
    setError(null)

    try {
      // 1. Get the original subject group (might not exist if migration already ran)
      const { data: subjectGroups, error: sgError } = await supabase
        .from('subject_groups')
        .select('*')
        .eq('subject_id', SUBJECT_ID)
        .eq('group_code', ORIGINAL_GROUP_CODE)

      if (sgError) {
        throw new Error(`Error loading subject groups: ${sgError.message}`)
      }

      const subjectGroup = subjectGroups && subjectGroups.length > 0 ? subjectGroups[0] : null

      // Check if migration already completed
      const { data: newGroups, error: ngError } = await supabase
        .from('subject_groups')
        .select('*')
        .eq('subject_id', SUBJECT_ID)
        .in('group_code', ['GR3-Gm1a', 'GR3-Gm1b'])

      if (ngError) {
        throw new Error(`Error checking new groups: ${ngError.message}`)
      }

      if (newGroups && newGroups.length >= 2) {
        // Migration already completed, just check student groups
        setCompleted(true)

        const { data: studentGroups, error: studentGroupError } = await supabase
          .from('student_groups')
          .select('*')
          .in('name', ['GR3-Gm1a', 'GR3-Gm1b'])

        if (!studentGroupError && studentGroups && studentGroups.length >= 2) {
          setStudentGroupsCreated(true)
        }

        setAnalysis({
          originalSubjectGroup: null,
          teacherAssignments: [],
          assignments: [],
          profileMembers: []
        })
        return
      }

      // If no original subject group, we can't proceed with analysis
      if (!subjectGroup) {
        setAnalysis({
          originalSubjectGroup: null,
          teacherAssignments: [],
          assignments: [],
          profileMembers: []
        })
        return
      }

      // 2. Get teacher assignments
      const { data: teacherAssignments, error: taError } = await supabase
        .from('teacher_group_assignments')
        .select(`
          *,
          teacher:teachers (
            first_name,
            last_name,
            email
          )
        `)
        .eq('subject_group_id', subjectGroup.id)

      if (taError) {
        throw new Error(`Error loading teacher assignments: ${taError.message}`)
      }

      // 3. Get classroom/schedule assignments
      const { data: assignments, error: aError } = await supabase
        .from('assignments')
        .select(`
          *,
          time_slot:time_slots (*),
          assignment_classrooms (
            *,
            classroom:classrooms (
              code,
              name
            ),
            assignment_classroom_weeks (
              week_number
            )
          )
        `)
        .eq('subject_group_id', subjectGroup.id)

      if (aError) {
        throw new Error(`Error loading assignments: ${aError.message}`)
      }

      // 4. Get profile members
      const { data: profileMembers, error: pmError } = await supabase
        .from('subject_group_profile_members')
        .select(`
          *,
          profile:subject_group_profiles (
            id,
            name
          )
        `)
        .eq('subject_group_id', subjectGroup.id)

      if (pmError) {
        throw new Error(`Error loading profile members: ${pmError.message}`)
      }

      setAnalysis({
        originalSubjectGroup: subjectGroup,
        teacherAssignments: teacherAssignments || [],
        assignments: assignments || [],
        profileMembers: profileMembers || []
      })

    } catch (error: any) {
      console.error('Error analyzing current state:', error)
      setError(error.message)
    } finally {
      setLoading(false)
    }
  }

  const performMigration = async () => {
    if (!analysis.originalSubjectGroup) {
      setError('No subject group found to migrate')
      return
    }

    setMigrating(true)
    setMigrationProgress(0)
    setError(null)

    try {
      // Step 1: Create new subject groups
      setMigrationStep('Creando nuevos subject groups...')
      setMigrationProgress(10)

      const { data: newGroupA, error: createAError } = await supabase
        .from('subject_groups')
        .insert({
          subject_id: analysis.originalSubjectGroup.subject_id,
          group_code: 'GR3-Gm1a',
          max_students: analysis.originalSubjectGroup.max_students,
          semester_id: analysis.originalSubjectGroup.semester_id
        })
        .select()
        .single()

      if (createAError) throw new Error(`Error creating GR3-Gm1a: ${createAError.message}`)

      const { data: newGroupB, error: createBError } = await supabase
        .from('subject_groups')
        .insert({
          subject_id: analysis.originalSubjectGroup.subject_id,
          group_code: 'GR3-Gm1b',
          max_students: analysis.originalSubjectGroup.max_students,
          semester_id: analysis.originalSubjectGroup.semester_id
        })
        .select()
        .single()

      if (createBError) throw new Error(`Error creating GR3-Gm1b: ${createBError.message}`)

      // Step 2: Copy teacher assignments
      setMigrationStep('Copiando asignaciones de profesores...')
      setMigrationProgress(30)

      for (const ta of analysis.teacherAssignments) {
        // Copy to group A
        await supabase
          .from('teacher_group_assignments')
          .insert({
            teacher_id: ta.teacher_id,
            subject_group_id: newGroupA.id,
            academic_year: ta.academic_year,
            ects_assigned: ta.ects_assigned,
            is_coordinator: ta.is_coordinator
          })

        // Copy to group B
        await supabase
          .from('teacher_group_assignments')
          .insert({
            teacher_id: ta.teacher_id,
            subject_group_id: newGroupB.id,
            academic_year: ta.academic_year,
            ects_assigned: ta.ects_assigned,
            is_coordinator: ta.is_coordinator
          })
      }

      // Step 3: Copy schedule/classroom assignments
      setMigrationStep('Copiando asignaciones de horarios y aulas...')
      setMigrationProgress(50)

      for (const assignment of analysis.assignments) {
        // Copy to group A
        const { data: newAssignmentA, error: assignAError } = await supabase
          .from('assignments')
          .insert({
            subject_id: assignment.subject_id,
            subject_group_id: newGroupA.id,
            student_group_id: assignment.student_group_id,
            time_slot_id: assignment.time_slot_id,
            semester_id: assignment.semester_id,
            hours_per_week: assignment.hours_per_week,
            teacher_id: assignment.teacher_id
          })
          .select()
          .single()

        if (assignAError) throw new Error(`Error copying assignment to group A: ${assignAError.message}`)

        // Copy to group B
        const { data: newAssignmentB, error: assignBError } = await supabase
          .from('assignments')
          .insert({
            subject_id: assignment.subject_id,
            subject_group_id: newGroupB.id,
            student_group_id: assignment.student_group_id,
            time_slot_id: assignment.time_slot_id,
            semester_id: assignment.semester_id,
            hours_per_week: assignment.hours_per_week,
            teacher_id: assignment.teacher_id
          })
          .select()
          .single()

        if (assignBError) throw new Error(`Error copying assignment to group B: ${assignBError.message}`)

        // Copy classroom assignments for group A
        for (const ac of assignment.assignment_classrooms) {
          const { data: newClassroomAssignA, error: caAError } = await supabase
            .from('assignment_classrooms')
            .insert({
              assignment_id: newAssignmentA.id,
              classroom_id: ac.classroom_id,
              is_full_semester: ac.is_full_semester,
              week_range_type: ac.week_range_type
            })
            .select()
            .single()

          if (caAError) throw new Error(`Error copying classroom assignment A: ${caAError.message}`)

          // Copy weeks if any
          for (const week of ac.assignment_classroom_weeks) {
            await supabase
              .from('assignment_classroom_weeks')
              .insert({
                assignment_classroom_id: newClassroomAssignA.id,
                week_number: week.week_number
              })
          }
        }

        // Copy classroom assignments for group B
        for (const ac of assignment.assignment_classrooms) {
          const { data: newClassroomAssignB, error: caBError } = await supabase
            .from('assignment_classrooms')
            .insert({
              assignment_id: newAssignmentB.id,
              classroom_id: ac.classroom_id,
              is_full_semester: ac.is_full_semester,
              week_range_type: ac.week_range_type
            })
            .select()
            .single()

          if (caBError) throw new Error(`Error copying classroom assignment B: ${caBError.message}`)

          // Copy weeks if any
          for (const week of ac.assignment_classroom_weeks) {
            await supabase
              .from('assignment_classroom_weeks')
              .insert({
                assignment_classroom_id: newClassroomAssignB.id,
                week_number: week.week_number
              })
          }
        }
      }

      // Step 4: Update profile members
      setMigrationStep('Actualizando miembros de perfiles...')
      setMigrationProgress(80)

      for (const pm of analysis.profileMembers) {
        if (pm.profile.name === 'Gm1a') {
          // Update Gm1a to point to new group A
          await supabase
            .from('subject_group_profile_members')
            .update({ subject_group_id: newGroupA.id })
            .eq('id', pm.id)
        } else if (pm.profile.name === 'Gm1b') {
          // Update Gm1b to point to new group B
          await supabase
            .from('subject_group_profile_members')
            .update({ subject_group_id: newGroupB.id })
            .eq('id', pm.id)
        }
      }

      // Step 5: Clean up - Delete original assignments and subject group
      setMigrationStep('Limpiando datos originales...')
      setMigrationProgress(90)

      // Delete original assignments (cascading will handle classroom assignments)
      await supabase
        .from('assignments')
        .delete()
        .eq('subject_group_id', analysis.originalSubjectGroup.id)

      // Delete original teacher assignments
      await supabase
        .from('teacher_group_assignments')
        .delete()
        .eq('subject_group_id', analysis.originalSubjectGroup.id)

      // Delete original subject group
      await supabase
        .from('subject_groups')
        .delete()
        .eq('id', analysis.originalSubjectGroup.id)

      // Complete
      setMigrationStep('¡Migración completada!')
      setMigrationProgress(100)
      setCompleted(true)

      toast.success('Migración completada exitosamente')

    } catch (error: any) {
      console.error('Error during migration:', error)
      setError(`Error durante la migración: ${error.message}`)
      toast.error('Error durante la migración')
    } finally {
      setMigrating(false)
    }
  }

  const createStudentGroups = async () => {
    setCreatingStudentGroups(true)
    setError(null)

    try {
      // Get the original student group to copy its properties
      const { data: originalStudentGroup, error: sgError } = await supabase
        .from('student_groups')
        .select('*')
        .eq('name', 'GR3-Gm1')
        .single()

      if (sgError) {
        throw new Error(`Error finding original student group: ${sgError.message}`)
      }

      // Create student group for Gm1a
      const { data: newStudentGroupA, error: createAError } = await supabase
        .from('student_groups')
        .insert({
          name: 'GR3-Gm1a',
          year: originalStudentGroup.year,
          shift: originalStudentGroup.shift,
          max_students: originalStudentGroup.max_students,
          degree_id: originalStudentGroup.degree_id
        })
        .select()
        .single()

      if (createAError) {
        throw new Error(`Error creating student group GR3-Gm1a: ${createAError.message}`)
      }

      // Create student group for Gm1b
      const { data: newStudentGroupB, error: createBError } = await supabase
        .from('student_groups')
        .insert({
          name: 'GR3-Gm1b',
          year: originalStudentGroup.year,
          shift: originalStudentGroup.shift,
          max_students: originalStudentGroup.max_students,
          degree_id: originalStudentGroup.degree_id
        })
        .select()
        .single()

      if (createBError) {
        throw new Error(`Error creating student group GR3-Gm1b: ${createBError.message}`)
      }

      // Also recreate the generic student group GR3-Gm1 for unified view
      const { error: createGenericError } = await supabase
        .from('student_groups')
        .insert({
          name: 'GR3-Gm1',
          year: originalStudentGroup.year,
          shift: originalStudentGroup.shift,
          max_students: originalStudentGroup.max_students,
          degree_id: originalStudentGroup.degree_id
        })

      if (createGenericError && !createGenericError.message.includes('duplicate')) {
        console.warn('Could not create generic student group:', createGenericError.message)
      }

      // Get the new subject groups
      const { data: subjectGroupA, error: sgAError } = await supabase
        .from('subject_groups')
        .select('*')
        .eq('group_code', 'GR3-Gm1a')
        .single()

      const { data: subjectGroupB, error: sgBError } = await supabase
        .from('subject_groups')
        .select('*')
        .eq('group_code', 'GR3-Gm1b')
        .single()

      if (sgAError || sgBError) {
        throw new Error('Error finding new subject groups')
      }

      // Update assignments for subject group A to use new student group A
      const { error: updateAssignmentsAError } = await supabase
        .from('assignments')
        .update({ student_group_id: newStudentGroupA.id })
        .eq('subject_group_id', subjectGroupA.id)

      if (updateAssignmentsAError) {
        throw new Error(`Error updating assignments for group A: ${updateAssignmentsAError.message}`)
      }

      // Update assignments for subject group B to use new student group B
      const { error: updateAssignmentsBError } = await supabase
        .from('assignments')
        .update({ student_group_id: newStudentGroupB.id })
        .eq('subject_group_id', subjectGroupB.id)

      if (updateAssignmentsBError) {
        throw new Error(`Error updating assignments for group B: ${updateAssignmentsBError.message}`)
      }

      setStudentGroupsCreated(true)
      toast.success('Student groups y asignaciones actualizadas exitosamente')

    } catch (error: any) {
      console.error('Error creating student groups:', error)
      setError(`Error creando student groups: ${error.message}`)
      toast.error('Error creando student groups')
    } finally {
      setCreatingStudentGroups(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Migración de Perfiles</h1>
          <p className="text-muted-foreground">
            Separando GR3-Gm1 en GR3-Gm1a y GR3-Gm1b
          </p>
        </div>

        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Migración de Perfiles</h1>
        <p className="text-muted-foreground">
          Separando GR3-Gm1 en GR3-Gm1a y GR3-Gm1b
        </p>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Analysis Results */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Subject Group</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {analysis.originalSubjectGroup ? '1' : '0'}
            </div>
            <p className="text-xs text-muted-foreground">
              {analysis.originalSubjectGroup?.group_code || 'No encontrado'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Profesores</CardTitle>
            <School className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.teacherAssignments.length}</div>
            <p className="text-xs text-muted-foreground">
              Asignaciones de profesores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horarios</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.assignments.length}</div>
            <p className="text-xs text-muted-foreground">
              Asignaciones de horarios/aulas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Perfiles</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{analysis.profileMembers.length}</div>
            <p className="text-xs text-muted-foreground">
              Miembros de perfiles
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analysis */}
      {analysis.originalSubjectGroup && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Teachers */}
          <Card>
            <CardHeader>
              <CardTitle>Profesores Asignados</CardTitle>
              <CardDescription>
                Se copiarán a ambos grupos nuevos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.teacherAssignments.map((ta) => (
                  <div key={ta.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">
                        {ta.teacher.first_name} {ta.teacher.last_name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {ta.ects_assigned} ECTS
                      </div>
                    </div>
                    <Badge variant={ta.is_coordinator ? "default" : "secondary"}>
                      {ta.is_coordinator ? "Coordinador" : "Profesor"}
                    </Badge>
                  </div>
                ))}
                {analysis.teacherAssignments.length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay profesores asignados</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Assignments */}
          <Card>
            <CardHeader>
              <CardTitle>Horarios y Aulas</CardTitle>
              <CardDescription>
                Se copiarán a ambos grupos nuevos
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {analysis.assignments.map((assignment) => (
                  <div key={assignment.id} className="p-2 border rounded">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">
                        {['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes'][assignment.time_slot.day_of_week]}
                      </Badge>
                      <Badge variant="secondary">
                        {assignment.time_slot.start_time.substring(0, 5)} - {assignment.time_slot.end_time.substring(0, 5)}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Aulas: {assignment.assignment_classrooms.map(ac => ac.classroom.code).join(', ') || 'Sin aula'}
                    </div>
                  </div>
                ))}
                {analysis.assignments.length === 0 && (
                  <p className="text-sm text-muted-foreground">No hay horarios asignados</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Profiles */}
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Perfiles Actuales</CardTitle>
              <CardDescription>
                Se actualizarán para apuntar a los grupos correspondientes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {analysis.profileMembers.map((pm) => (
                  <div key={pm.id} className="flex items-center justify-between p-3 border rounded">
                    <div>
                      <div className="font-medium">{pm.profile.name}</div>
                      <div className="text-sm text-muted-foreground">
                        Actualmente: {ORIGINAL_GROUP_CODE}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        → GR3-{pm.profile.name}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Nuevo grupo
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Migration Progress */}
      {migrating && (
        <Card>
          <CardHeader>
            <CardTitle>Progreso de Migración</CardTitle>
            <CardDescription>
              {migrationStep}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Progress value={migrationProgress} className="w-full" />
            <p className="text-sm text-muted-foreground mt-2">
              {migrationProgress}% completado
            </p>
          </CardContent>
        </Card>
      )}

      {/* Status for already migrated */}
      {!analysis.originalSubjectGroup && !completed && (
        <Card>
          <CardHeader>
            <CardTitle className="text-amber-600">
              <AlertTriangle className="inline mr-2 h-5 w-5" />
              Migración Ya Ejecutada
            </CardTitle>
            <CardDescription>
              Los subject groups GR3-Gm1a y GR3-Gm1b ya existen. Solo necesitas crear los student groups.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={createStudentGroups}
              disabled={creatingStudentGroups}
              className="w-full"
            >
              {creatingStudentGroups && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Crear Student Groups (GR3-Gm1a, GR3-Gm1b)
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Migration Button */}
      {!completed && !migrating && analysis.originalSubjectGroup && (
        <Card>
          <CardHeader>
            <CardTitle>Iniciar Migración</CardTitle>
            <CardDescription>
              Esta operación creará los nuevos grupos y copiará todas las asignaciones.
              <br />
              <strong>Esta acción no se puede deshacer.</strong>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={performMigration} size="lg" className="w-full">
              <Copy className="mr-2 h-4 w-4" />
              Iniciar Migración
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Success Message */}
      {completed && !studentGroupsCreated && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">
              <Check className="inline mr-2 h-5 w-5" />
              Migración Completada - Paso 1/2
            </CardTitle>
            <CardDescription>
              Los subject groups se han creado exitosamente. Ahora necesitas crear los student groups correspondientes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">GR3-Gm1a</Badge>
                  <span className="text-sm">→ Subject group para perfil Gm1a ✅</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">GR3-Gm1b</Badge>
                  <span className="text-sm">→ Subject group para perfil Gm1b ✅</span>
                </div>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Paso 2: Crear Student Groups</h4>
                <p className="text-sm text-muted-foreground mb-4">
                  Para que aparezcan en "Assignació d'Horaris i Espais", necesitas crear los student groups correspondientes.
                </p>

                <Button
                  onClick={createStudentGroups}
                  disabled={creatingStudentGroups}
                  className="w-full"
                >
                  {creatingStudentGroups && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Crear Student Groups (GR3-Gm1a, GR3-Gm1b)
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Success Message */}
      {completed && studentGroupsCreated && (
        <Card>
          <CardHeader>
            <CardTitle className="text-green-600">
              <Check className="inline mr-2 h-5 w-5" />
              ¡Migración Completamente Finalizada!
            </CardTitle>
            <CardDescription>
              Todo está listo. Los perfiles Gm1a y Gm1b ahora aparecerán por separado en las asignaciones.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">GR3-Gm1a</Badge>
                  <span className="text-sm">→ Subject group + Student group ✅</span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">GR3-Gm1b</Badge>
                  <span className="text-sm">→ Subject group + Student group ✅</span>
                </div>
              </div>

              <Separator />

              <div className="bg-green-50 p-4 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">¿Qué puedes hacer ahora?</h4>
                <ul className="text-sm text-green-700 space-y-1">
                  <li>• Ve a <strong>Assignació d'Horaris i Espais</strong></li>
                  <li>• Selecciona <strong>GR3-Gm1a</strong> o <strong>GR3-Gm1b</strong> en el dropdown</li>
                  <li>• Verás las asignaciones con los nombres de los perfiles (Gm1a, Gm1b)</li>
                  <li>• Modifica cada perfil independientemente</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}