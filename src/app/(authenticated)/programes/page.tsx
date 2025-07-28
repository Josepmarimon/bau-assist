'use client'

import { useState, useEffect } from 'react'
import { Plus, GraduationCap, BookOpen, Award, ChevronDown, ChevronRight, Edit, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ProgramFormDialog } from '@/components/programs/program-form-dialog'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Program = Database['public']['Tables']['programs']['Row']
type ProgramType = Database['public']['Enums']['program_type']

const programTypeConfig = {
  grau: { label: 'Graus', icon: GraduationCap, color: 'bg-blue-500' },
  master: { label: 'Màsters', icon: BookOpen, color: 'bg-purple-500' },
  postgrau: { label: 'Postgraus', icon: Award, color: 'bg-green-500' }
} as const

export default function ProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedType, setSelectedType] = useState<ProgramType | 'all'>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null)
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set())
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadPrograms()
  }, [])

  const loadPrograms = async () => {
    try {
      const { data, error } = await supabase
        .from('programs')
        .select('*')
        .order('type')
        .order('name')

      if (error) throw error
      setPrograms(data || [])
    } catch (error) {
      console.error('Error loading programs:', error)
      toast({
        title: 'Error',
        description: 'No s\'han pogut carregar els programes',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = () => {
    setSelectedProgram(null)
    setDialogOpen(true)
  }

  const handleEdit = (program: Program) => {
    setSelectedProgram(program)
    setDialogOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Estàs segur que vols eliminar aquest programa?')) return

    try {
      const { error } = await supabase
        .from('programs')
        .delete()
        .eq('id', id)

      if (error) throw error

      toast({
        title: 'Programa eliminat',
        description: 'El programa s\'ha eliminat correctament'
      })
      
      loadPrograms()
    } catch (error) {
      console.error('Error deleting program:', error)
      toast({
        title: 'Error',
        description: 'No s\'ha pogut eliminar el programa',
        variant: 'destructive'
      })
    }
  }

  const toggleProgram = (programId: string) => {
    setExpandedPrograms(prev => {
      const newSet = new Set(prev)
      if (newSet.has(programId)) {
        newSet.delete(programId)
      } else {
        newSet.add(programId)
      }
      return newSet
    })
  }

  const filteredPrograms = selectedType === 'all' 
    ? programs 
    : programs.filter(p => p.type === selectedType)

  const getProgramsByType = (type: ProgramType) => 
    programs.filter(p => p.type === type)

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Carregant...</div>
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Gestió de Programes Acadèmics</h1>
          <p className="text-muted-foreground">Gestiona graus, màsters i postgraus</p>
        </div>
        <Button onClick={handleAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Afegir Programa
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Object.entries(programTypeConfig).map(([type, config]) => {
          const count = getProgramsByType(type as ProgramType).length
          return (
            <Card key={type}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {config.label}
                </CardTitle>
                <config.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground">
                  {count === 1 ? 'programa' : 'programes'} actius
                </p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs defaultValue="all" value={selectedType} onValueChange={(v) => setSelectedType(v as typeof selectedType)}>
        <TabsList>
          <TabsTrigger value="all">Tots els programes</TabsTrigger>
          {Object.entries(programTypeConfig).map(([type, config]) => (
            <TabsTrigger key={type} value={type}>
              {config.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={selectedType} className="space-y-4 mt-6">
          {filteredPrograms.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <p className="text-muted-foreground mb-4">
                  No hi ha programes {selectedType !== 'all' && `de tipus ${programTypeConfig[selectedType]?.label.toLowerCase()}`}
                </p>
                <Button onClick={handleAdd} variant="outline">
                  <Plus className="mr-2 h-4 w-4" />
                  Afegir el primer programa
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredPrograms.map((program) => {
                const isExpanded = expandedPrograms.has(program.id)
                return (
                  <Card key={program.id} className="overflow-hidden">
                    <CardHeader 
                      className="cursor-pointer"
                      onClick={() => toggleProgram(program.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 transition-transform" />
                              ) : (
                                <ChevronRight className="h-4 w-4 transition-transform" />
                              )}
                              {program.color && (
                                <div 
                                  className="w-6 h-6 rounded-md border"
                                  style={{ backgroundColor: program.color }}
                                />
                              )}
                              <CardTitle className="hover:underline">{program.name}</CardTitle>
                              <Badge className={programTypeConfig[program.type].color}>
                                {programTypeConfig[program.type].label}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1 ml-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleEdit(program)
                            }}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete(program.id)
                            }}
                            title="Eliminar"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {isExpanded && (
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Codi</p>
                            <p className="font-medium">{program.code}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Durada</p>
                            <p className="font-medium">
                              {program.duration_years} {program.duration_years === 1 ? 'any' : 'anys'}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Crèdits</p>
                            <p className="font-medium">{program.credits || '-'} ECTS</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Estat</p>
                            <Badge variant={program.active ? 'default' : 'secondary'}>
                              {program.active ? 'Actiu' : 'Inactiu'}
                            </Badge>
                          </div>
                        </div>
                        {(program.coordinator_name || program.coordinator_email) && (
                          <div className="grid grid-cols-2 gap-4 text-sm mt-4">
                            {program.coordinator_name && (
                              <div>
                                <p className="text-muted-foreground">Coordinador/a</p>
                                <p className="font-medium">{program.coordinator_name}</p>
                              </div>
                            )}
                            {program.coordinator_email && (
                              <div>
                                <p className="text-muted-foreground">Email coordinació</p>
                                <p className="font-medium text-xs">{program.coordinator_email}</p>
                              </div>
                            )}
                          </div>
                        )}
                        {program.description && (
                          <div className="mt-4">
                            <p className="text-sm text-muted-foreground">Descripció</p>
                            <p className="text-sm mt-1">{program.description}</p>
                          </div>
                        )}
                      </CardContent>
                    )}
                  </Card>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <ProgramFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        program={selectedProgram}
        onSuccess={() => {
          setDialogOpen(false)
          loadPrograms()
        }}
      />
    </div>
  )
}