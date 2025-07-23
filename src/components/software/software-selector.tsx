"use client"

import { useState, useEffect } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Search, Package, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface Software {
  id: string
  name: string
  version?: string
  category: string
  license_type: string
  license_quantity?: number
}

interface ClassroomSoftware {
  software_id: string
  licenses: number
}

interface RequiredSoftware {
  software_id: string
  software_name: string
  subjects: {
    id: string
    code: string
    name: string
  }[]
}

interface SoftwareSelectorProps {
  classroomId: string
  onSoftwareChange?: () => void
}

const getCategoryName = (category: string): string => {
  const categoryMap: Record<string, string> = {
    'general': 'General',
    '3d_modeling': 'Modelat 3D',
    'design': 'Disseny',
    'programming': 'Programació',
    'web_development': 'Desenvolupament Web',
    'cad': 'CAD',
    'audio': 'Àudio',
    'render': 'Render',
    'patronatge': 'Patronatge'
  }
  return categoryMap[category] || category
}

export function SoftwareSelector({ classroomId, onSoftwareChange }: SoftwareSelectorProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [availableSoftware, setAvailableSoftware] = useState<Software[]>([])
  const [classroomSoftware, setClassroomSoftware] = useState<ClassroomSoftware[]>([])
  const [requiredSoftware, setRequiredSoftware] = useState<RequiredSoftware[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedSoftware, setSelectedSoftware] = useState<Map<string, number>>(new Map())
  const [hasChanges, setHasChanges] = useState(false)

  const supabase = createClient()

  useEffect(() => {
    if (classroomId) {
      loadData()
    }
  }, [classroomId])

  const loadData = async () => {
    try {
      setLoading(true)
      
      // Load all available software
      const { data: softwareData, error: softwareError } = await supabase
        .from('software')
        .select('*')
        .order('name')

      if (softwareError) throw softwareError
      setAvailableSoftware(softwareData || [])

      // Load software assigned to this classroom
      const { data: assignedData, error: assignedError } = await supabase
        .from('classroom_software')
        .select('software_id, licenses')
        .eq('classroom_id', classroomId)

      if (assignedError) throw assignedError
      
      const assigned = assignedData || []
      setClassroomSoftware(assigned)
      
      // Initialize selected software map
      const selectedMap = new Map<string, number>()
      assigned.forEach(item => {
        selectedMap.set(item.software_id, item.licenses || 1)
      })
      setSelectedSoftware(selectedMap)
      
      // Load required software from subjects assigned to this classroom
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          subject_id,
          subjects (
            id,
            code,
            name
          )
        `)
        .eq('classroom_id', classroomId)
        .not('subject_id', 'is', null)
      
      if (!assignmentError && assignmentData) {
        // Get unique subject IDs
        const uniqueSubjectIds = [...new Set(assignmentData.map(assignment => assignment.subject_id).filter(Boolean))]
        
        if (uniqueSubjectIds.length > 0) {
          // Get software requirements for these subjects
          const { data: requirementsData, error: requirementsError } = await supabase
            .from('subject_software')
            .select(`
              software_id,
              subject_id,
              software!inner (
                id,
                name
              )
            `)
            .in('subject_id', uniqueSubjectIds)
          
          if (!requirementsError && requirementsData) {
            // Group by software
            const softwareMap = new Map<string, RequiredSoftware>()
            
            requirementsData.forEach(req => {
              if (req.software && req.software_id) {
                const subject = assignmentData.find(a => a.subject_id === req.subject_id)?.subjects
                if (subject) {
                  if (!softwareMap.has(req.software_id)) {
                    softwareMap.set(req.software_id, {
                      software_id: req.software_id,
                      software_name: req.software && typeof req.software === 'object' && 'name' in req.software ? (req.software as any).name : 'Unknown',
                      subjects: []
                    })
                  }
                  if (subject && !Array.isArray(subject)) {
                    softwareMap.get(req.software_id)!.subjects.push(subject)
                  }
                }
              }
            })
            
            const requiredSoftwareArray = Array.from(softwareMap.values())
            setRequiredSoftware(requiredSoftwareArray)
          }
        }
      }
      
    } catch (error) {
      console.error('Error loading software:', error)
      toast.error('Error al carregar el software')
    } finally {
      setLoading(false)
    }
  }

  const handleSoftwareToggle = (softwareId: string, checked: boolean) => {
    const newSelected = new Map(selectedSoftware)
    if (checked) {
      newSelected.set(softwareId, 1)
    } else {
      newSelected.delete(softwareId)
    }
    setSelectedSoftware(newSelected)
    setHasChanges(true)
  }

  const handleLicenseChange = (softwareId: string, value: string) => {
    const licenses = parseInt(value) || 1
    const newSelected = new Map(selectedSoftware)
    newSelected.set(softwareId, licenses)
    setSelectedSoftware(newSelected)
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!classroomId) return
    
    setSaving(true)
    try {
      // Delete all existing assignments
      const { error: deleteError } = await supabase
        .from('classroom_software')
        .delete()
        .eq('classroom_id', classroomId)

      if (deleteError) throw deleteError

      // Insert new assignments
      if (selectedSoftware.size > 0) {
        const assignments = Array.from(selectedSoftware.entries()).map(([softwareId, licenses]) => ({
          classroom_id: classroomId,
          software_id: softwareId,
          licenses: licenses,
          installed_date: new Date().toISOString().split('T')[0]
        }))

        const { error: insertError } = await supabase
          .from('classroom_software')
          .insert(assignments)

        if (insertError) throw insertError
      }

      toast.success('Software actualitzat correctament')
      setHasChanges(false)
      onSoftwareChange?.()
      loadData() // Reload to get fresh data
    } catch (error: any) {
      console.error('Error saving software:', error)
      toast.error(error.message || 'Error al guardar els canvis')
    } finally {
      setSaving(false)
    }
  }

  const filteredSoftware = availableSoftware.filter(sw => {
    const search = searchTerm.toLowerCase()
    return sw.name.toLowerCase().includes(search) || 
           getCategoryName(sw.category).toLowerCase().includes(search)
  })

  if (!classroomId) {
    return (
      <div className="text-center text-muted-foreground py-8">
        Guarda l'aula primer per gestionar el software
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-muted-foreground">Carregant software...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Required software section */}
      {requiredSoftware.length > 0 ? (
        <div className="rounded-lg border bg-muted/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-orange-500" />
            <h4 className="font-medium text-sm">Software requerit per les assignatures</h4>
          </div>
          <div className="space-y-2">
            {requiredSoftware.map((req) => {
              const isInstalled = selectedSoftware.has(req.software_id)
              return (
                <div key={req.software_id} className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    {isInstalled ? (
                      <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-500 mt-0.5" />
                    )}
                    <div>
                      <span className="font-medium text-sm">{req.software_name}</span>
                      <div className="text-xs text-muted-foreground">
                        Requerit per: {req.subjects.map(s => s.code).join(', ')}
                      </div>
                    </div>
                  </div>
                  {!isInstalled && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleSoftwareToggle(req.software_id, true)}
                    >
                      Afegir
                    </Button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="rounded-lg border bg-muted/50 p-4 text-sm text-muted-foreground">
          <p>No hi ha software requerit per les assignatures d'aquesta aula.</p>
          <p className="text-xs mt-1">Assigna primer assignatures amb requisits de software per veure'ls aquí.</p>
        </div>
      )}

      {/* Search */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Cercar software..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Save button */}
        {hasChanges && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving} size="sm">
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Guardant...' : 'Guardar canvis'}
            </Button>
          </div>
        )}
      </div>

      {/* Software list */}
      <ScrollArea className="h-[350px] pr-4">
        <div className="space-y-2">
          {filteredSoftware.map((software) => {
            const isSelected = selectedSoftware.has(software.id)
            const licenses = selectedSoftware.get(software.id) || 1
            const requiredBySoftware = requiredSoftware.find(r => r.software_id === software.id)
            
            return (
              <div
                key={software.id}
                className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent/50 transition-colors"
              >
                <Checkbox
                  id={`software-${software.id}`}
                  checked={isSelected}
                  onCheckedChange={(checked) => 
                    handleSoftwareToggle(software.id, checked as boolean)
                  }
                />
                
                <div className="flex-1 space-y-1">
                  <label
                    htmlFor={`software-${software.id}`}
                    className="text-sm font-medium leading-none cursor-pointer flex items-center gap-2"
                  >
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span>{software.name}</span>
                    {software.version && (
                      <span className="text-xs text-muted-foreground">
                        v{software.version}
                      </span>
                    )}
                    {requiredBySoftware && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Badge variant="default" className="text-xs">
                              Requerit
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p className="text-xs">
                              Requerit per: {requiredBySoftware.subjects.map(s => s.code).join(', ')}
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                  </label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {getCategoryName(software.category)}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {software.license_type === 'free' ? 'Gratuït' : 'De pagament'}
                    </Badge>
                  </div>
                </div>
                
                {isSelected && software.license_type !== 'free' && (
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-muted-foreground">Llicències:</Label>
                    <Input
                      type="number"
                      min="1"
                      value={licenses}
                      onChange={(e) => handleLicenseChange(software.id, e.target.value)}
                      className="w-20 h-7 text-xs"
                    />
                  </div>
                )}
              </div>
            )
          })}
          
          {filteredSoftware.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No s'ha trobat cap software
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}