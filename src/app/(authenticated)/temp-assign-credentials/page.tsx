'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { 
  Search, 
  Link, 
  Save, 
  X, 
  AlertCircle,
  CheckCircle,
  Loader2,
  FileSpreadsheet,
  Key
} from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import credentialsData from '../../../../csv/credentials_data.json'

interface Subject {
  id: string
  code: string
  name: string
  username?: string | null
  password?: string | null
}

interface Credential {
  usuario: string
  email: string
  password: string
}

interface Assignment {
  subjectId: string
  credentialIndex: number
}

export default function TempAssignCredentialsPage() {
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [saving, setSaving] = useState(false)
  const supabase = createClient()
  
  const credentials = credentialsData as Credential[]

  useEffect(() => {
    loadSubjects()
  }, [])

  const loadSubjects = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('subjects')
        .select('id, code, name, username, password')
        .order('code', { ascending: true })

      if (error) throw error
      setSubjects(data || [])
    } catch (error) {
      console.error('Error loading subjects:', error)
      toast.error('Error carregant assignatures')
    } finally {
      setLoading(false)
    }
  }

  const subjectsWithoutCredentials = subjects.filter(s => !s.username && !s.password)
  const filteredSubjects = subjectsWithoutCredentials.filter(subject => {
    const search = searchTerm.toLowerCase()
    return subject.name.toLowerCase().includes(search) || 
           subject.code.toLowerCase().includes(search)
  })

  const assignedCredentials = new Set(assignments.map(a => a.credentialIndex))
  const availableCredentials = credentials.filter((_, index) => !assignedCredentials.has(index))

  const addAssignment = (subjectId: string, credentialIndex: number) => {
    setAssignments(prev => [...prev, { subjectId, credentialIndex }])
  }

  const removeAssignment = (subjectId: string) => {
    setAssignments(prev => prev.filter(a => a.subjectId !== subjectId))
  }

  const getAssignmentForSubject = (subjectId: string) => {
    return assignments.find(a => a.subjectId === subjectId)
  }

  const saveAssignments = async () => {
    if (assignments.length === 0) {
      toast.error('No hi ha assignacions per guardar')
      return
    }

    try {
      setSaving(true)
      let successCount = 0
      let errorCount = 0

      for (const assignment of assignments) {
        const credential = credentials[assignment.credentialIndex]
        const subject = subjects.find(s => s.id === assignment.subjectId)
        
        if (!credential || !subject) continue

        const { error } = await supabase
          .from('subjects')
          .update({
            username: credential.usuario,
            password: credential.password
          })
          .eq('id', assignment.subjectId)

        if (error) {
          console.error(`Error updating subject ${subject.code}:`, error)
          errorCount++
        } else {
          successCount++
        }
      }

      if (successCount > 0) {
        toast.success(`${successCount} assignatures actualitzades correctament`)
      }
      
      if (errorCount > 0) {
        toast.error(`${errorCount} errors en actualitzar assignatures`)
      }

      // Reload subjects to see updates
      await loadSubjects()
      setAssignments([])
    } catch (error) {
      console.error('Error saving assignments:', error)
      toast.error('Error guardant les assignacions')
    } finally {
      setSaving(false)
    }
  }

  const autoAssignByName = () => {
    let matched = 0
    const newAssignments: Assignment[] = []

    for (const subject of subjectsWithoutCredentials) {
      // Try to find a credential that matches the subject name
      const subjectNameNormalized = subject.name.toLowerCase()
        .replace(/[àá]/g, 'a')
        .replace(/[èé]/g, 'e')
        .replace(/[ìí]/g, 'i')
        .replace(/[òó]/g, 'o')
        .replace(/[ùú]/g, 'u')
        .replace(/ç/g, 'c')
        .replace(/·/g, '')
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, '_')

      const credentialIndex = credentials.findIndex(cred => {
        const credNormalized = cred.usuario.toLowerCase()
        return credNormalized.includes(subjectNameNormalized) || 
               subjectNameNormalized.includes(credNormalized)
      })

      if (credentialIndex !== -1 && !assignedCredentials.has(credentialIndex)) {
        newAssignments.push({ subjectId: subject.id, credentialIndex })
        matched++
      }
    }

    setAssignments(prev => [...prev, ...newAssignments])
    toast.success(`${matched} assignacions automàtiques realitzades`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Assignar Credencials (Pàgina Temporal)
        </h1>
        <p className="text-muted-foreground mt-2">
          Assigna manualment les credencials del fitxer Excel a les assignatures
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-2 grid-cols-2 md:grid-cols-4">
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assignatures sense credencials</p>
              <p className="text-xl font-bold">{subjectsWithoutCredentials.length}</p>
            </div>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Credencials disponibles</p>
              <p className="text-xl font-bold">{availableCredentials.length}</p>
            </div>
            <Key className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Assignacions pendents</p>
              <p className="text-xl font-bold">{assignments.length}</p>
            </div>
            <Link className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
        <Card className="p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Credencials totals</p>
              <p className="text-xl font-bold">{credentials.length}</p>
            </div>
            <FileSpreadsheet className="h-4 w-4 text-muted-foreground" />
          </div>
        </Card>
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Accions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Button 
            onClick={autoAssignByName}
            variant="outline"
            disabled={assignments.length > 0}
          >
            Assignació automàtica per nom
          </Button>
          <Button 
            onClick={saveAssignments}
            disabled={assignments.length === 0 || saving}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Guardant...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Guardar {assignments.length} assignacions
              </>
            )}
          </Button>
          {assignments.length > 0 && (
            <Button 
              variant="ghost"
              onClick={() => setAssignments([])}
            >
              Esborrar tot
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle>Assignar Credencials</CardTitle>
          <CardDescription>
            Selecciona les credencials per cada assignatura sense username/password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cercar assignatura..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredSubjects.map(subject => {
                const assignment = getAssignmentForSubject(subject.id)
                const assignedCredential = assignment ? credentials[assignment.credentialIndex] : null

                return (
                  <div 
                    key={subject.id} 
                    className={`border rounded-lg p-4 ${assignment ? 'bg-green-50 border-green-200' : ''}`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline">{subject.code}</Badge>
                          <h4 className="font-medium">{subject.name}</h4>
                          {assignment && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        
                        {assignedCredential && (
                          <div className="text-sm text-muted-foreground space-y-1 mb-2">
                            <p>Usuari: <span className="font-mono">{assignedCredential.usuario}</span></p>
                            <p>Password: <span className="font-mono">{assignedCredential.password}</span></p>
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Select
                            value={assignment ? assignment.credentialIndex.toString() : ''}
                            onValueChange={(value) => {
                              if (assignment) {
                                removeAssignment(subject.id)
                              }
                              if (value) {
                                addAssignment(subject.id, parseInt(value))
                              }
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecciona credencials..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">Cap</SelectItem>
                              {availableCredentials.map((cred, index) => {
                                const realIndex = credentials.indexOf(cred)
                                return (
                                  <SelectItem key={realIndex} value={realIndex.toString()}>
                                    {cred.usuario} ({cred.password})
                                  </SelectItem>
                                )
                              })}
                              {assignment && (
                                <SelectItem value={assignment.credentialIndex.toString()}>
                                  {assignedCredential!.usuario} (Actual)
                                </SelectItem>
                              )}
                            </SelectContent>
                          </Select>
                          
                          {assignment && (
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => removeAssignment(subject.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
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