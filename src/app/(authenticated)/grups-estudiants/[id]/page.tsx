'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { 
  ArrowLeft, 
  Edit, 
  Users, 
  Calendar, 
  GraduationCap,
  Loader2,
  Building2,
  Clock
} from 'lucide-react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface SubjectGroup {
  id: string
  subject_id: string
  semester_id: string
  group_code: string
  max_students: number
  created_at: string
  updated_at: string
  subject?: {
    id: string
    code: string
    name: string
    year: number
    credits: number
    department?: string
    type: 'OBLIGATORIA' | 'OPTATIVA' | 'TFG'
  }
  semester?: {
    name: string
    academic_year?: {
      name: string
    }
  }
}

export default function ViewGroupPage() {
  const params = useParams()
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [group, setGroup] = useState<SubjectGroup | null>(null)
  const [teachers, setTeachers] = useState<any[]>([])
  const supabase = createClient()

  useEffect(() => {
    loadGroup()
  }, [params.id])

  const loadGroup = async () => {
    try {
      const { data, error } = await supabase
        .from('subject_groups')
        .select(`
          *,
          subjects(
            id,
            code,
            name,
            year,
            credits,
            department,
            type
          ),
          semesters(
            name,
            academic_years(
              name
            )
          )
        `)
        .eq('id', params.id)
        .single()

      if (error) throw error
      
      setGroup(data)
      
      // Load teachers assigned to this specific group using RPC function
      const { data: teacherData, error: teacherError } = await supabase
        .rpc('get_teachers_for_group', { group_id: params.id })
      
      if (teacherError) {
        console.error('Error loading teachers:', teacherError)
      }
      
      setTeachers(teacherData?.map((t: any) => ({
        id: t.teacher_id,
        name: `${t.first_name} ${t.last_name}`,
        email: t.email,
        department: t.department
      })) || [])
    } catch (error) {
      console.error('Error loading group:', error)
    } finally {
      setLoading(false)
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


  const getTypeVariant = (type: string) => {
    switch (type) {
      case 'OBLIGATORIA':
        return 'default'
      case 'OPTATIVA':
        return 'secondary'
      case 'TFG':
        return 'destructive'
      default:
        return 'outline'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push('/grups-estudiants')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Grup {group.group_code}
            </h1>
            <p className="text-muted-foreground mt-2">
              {group.subject?.name}
            </p>
          </div>
        </div>
        <Button onClick={() => router.push(`/grups-estudiants/${params.id}/edit`)}>
          <Edit className="h-4 w-4 mr-2" />
          Editar
        </Button>
      </div>

      {/* Group Info */}
      <div className="grid gap-4 md:grid-cols-2">

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Capacitat
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {group.max_students} estudiants
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Semestre
            </CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {group.semester?.name || '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {group.semester?.academic_year?.name}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Subject Details */}
      <Card>
        <CardHeader>
          <CardTitle>Detalls de l'Assignatura</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Codi</p>
              <p className="font-medium">{group.subject?.code}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Nom</p>
              <p className="font-medium">{group.subject?.name}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Curs</p>
              <p className="font-medium">{group.subject?.year}r curs</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Crèdits</p>
              <p className="font-medium">{group.subject?.credits} ECTS</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Departament</p>
              <p className="font-medium">{group.subject?.department || '-'}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Tipus</p>
              <Badge variant={getTypeVariant(group.subject?.type || '')}>
                {group.subject?.type}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Teachers */}
      <Card className="bg-orange-50 border-orange-200">
        <CardHeader>
          <CardTitle>Professors Assignats</CardTitle>
          <CardDescription>
            Professors que imparteixen aquest grup
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No hi ha professors assignats a aquest grup
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Departament</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                        {teacher.name}
                      </div>
                    </TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>{teacher.department || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Timestamps */}
      <Card>
        <CardHeader>
          <CardTitle>Informació del Sistema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Creat
              </p>
              <p className="font-medium">
                {new Date(group.created_at).toLocaleDateString('ca-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-3 w-3" />
                Última actualització
              </p>
              <p className="font-medium">
                {new Date(group.updated_at).toLocaleDateString('ca-ES', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}