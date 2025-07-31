"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Search, Monitor } from "lucide-react"
import { CLASSROOM_TYPES } from "@/lib/constants/classroom-types"

interface Classroom {
  id: string
  name: string
  code: string
  building?: string
  floor?: number
  capacity?: number
  type?: string
}

interface ClassroomAssignment {
  classroom_id: string
  licenses: number
}

interface ClassroomAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  software: {
    id: string
    name: string
    license_quantity?: number
    license_type?: string
  }
}

export function ClassroomAssignmentDialog({ 
  open, 
  onOpenChange, 
  onSuccess, 
  software 
}: ClassroomAssignmentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [assignments, setAssignments] = useState<ClassroomAssignment[]>([])
  const [currentAssignments, setCurrentAssignments] = useState<ClassroomAssignment[]>([])
  const [selectedClassrooms, setSelectedClassrooms] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (open && software) {
      loadClassrooms()
      loadCurrentAssignments()
    }
  }, [open, software])

  const loadClassrooms = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('classrooms')
        .select('id, name, code, building, floor, capacity, type')
        .order('building')
        .order('floor')
        .order('code')

      if (error) throw error
      
      // Sort classrooms: informatica type first, then others
      const sortedClassrooms = (data || []).sort((a, b) => {
        // First sort by type (informatica first)
        if (a.type === CLASSROOM_TYPES.INFORMATICA && b.type !== CLASSROOM_TYPES.INFORMATICA) return -1
        if (a.type !== CLASSROOM_TYPES.INFORMATICA && b.type === CLASSROOM_TYPES.INFORMATICA) return 1
        
        // Then by building
        if (a.building && b.building && a.building !== b.building) {
          return a.building.localeCompare(b.building)
        }
        
        // Then by floor
        if (a.floor !== b.floor) {
          return (a.floor || 0) - (b.floor || 0)
        }
        
        // Finally by code
        return a.code.localeCompare(b.code)
      })
      
      console.log('Loaded classrooms:', sortedClassrooms.map(c => ({ code: c.code, type: c.type })))
      setClassrooms(sortedClassrooms)
    } catch (error) {
      console.error('Error loading classrooms:', error)
      toast.error('Error al carregar les aules')
    }
  }

  const loadCurrentAssignments = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('classroom_software')
        .select('classroom_id, licenses')
        .eq('software_id', software.id)

      if (error) throw error
      
      const assignments = data?.map(item => ({
        classroom_id: item.classroom_id,
        licenses: item.licenses || 1
      })) || []
      
      console.log('Loaded current assignments:', assignments)
      setCurrentAssignments(assignments)
      setAssignments(assignments)
    } catch (error) {
      console.error('Error loading assignments:', error)
    }
  }

  const isFreeSoftware = software.license_type === 'free' || software.license_type === 'open_source'

  const handleClassroomToggle = (classroomId: string, checked: boolean) => {
    if (checked) {
      // Add assignment with default 1 license
      setAssignments(prev => [...prev, { classroom_id: classroomId, licenses: 1 }])
    } else {
      // Remove assignment
      setAssignments(prev => prev.filter(a => a.classroom_id !== classroomId))
    }
  }

  const handleSelectAll = (type?: string) => {
    const classroomsToSelect = type 
      ? filteredClassrooms.filter(c => c.type === type)
      : filteredClassrooms
    
    console.log('Selecting classrooms:', {
      type,
      filteredCount: filteredClassrooms.length,
      toSelectCount: classroomsToSelect.length,
      classroomsToSelect: classroomsToSelect.map(c => ({ code: c.code, type: c.type }))
    })
    
    const newAssignments = [...assignments]
    classroomsToSelect.forEach(classroom => {
      if (!assignments.find(a => a.classroom_id === classroom.id)) {
        newAssignments.push({ classroom_id: classroom.id, licenses: 1 })
      }
    })
    setAssignments(newAssignments)
  }

  const handleDeselectAll = () => {
    setAssignments([])
  }

  const handleLicenseChange = (classroomId: string, licenses: string) => {
    const licenseNumber = parseInt(licenses) || 1
    setAssignments(prev => 
      prev.map(a => 
        a.classroom_id === classroomId 
          ? { ...a, licenses: licenseNumber }
          : a
      )
    )
  }

  const filteredClassrooms = classrooms.filter(classroom => {
    const search = searchTerm.toLowerCase()
    return classroom.name.toLowerCase().includes(search) || 
           classroom.code.toLowerCase().includes(search) ||
           classroom.building?.toLowerCase().includes(search)
  })

  const getTotalLicenses = () => {
    return assignments.reduce((total, assignment) => total + assignment.licenses, 0)
  }

  const handleSubmit = async () => {
    setLoading(true)

    try {
      const supabase = createClient()
      
      // Delete existing assignments
      const { error: deleteError } = await supabase
        .from('classroom_software')
        .delete()
        .eq('software_id', software.id)

      if (deleteError) throw deleteError

      // Insert new assignments
      if (assignments.length > 0) {
        const newAssignments = assignments.map(assignment => ({
          software_id: software.id,
          classroom_id: assignment.classroom_id,
          licenses: isFreeSoftware ? null : assignment.licenses,
          installed_date: new Date().toISOString().split('T')[0] // Format as DATE only
        }))

        const { error: insertError } = await supabase
          .from('classroom_software')
          .insert(newAssignments)

        if (insertError) throw insertError
      }

      toast.success('Assignacions actualitzades correctament')
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Error al guardar les assignacions')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Assignar {software.name} a aules</DialogTitle>
          <DialogDescription>
            Selecciona les aules on està instal·lat aquest software i el número de llicències per aula
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Search and bulk actions */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Cercar aules..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectAll(CLASSROOM_TYPES.INFORMATICA)}
            >
              Sel. Informàtica
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectAll()}
            >
              Sel. Totes
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDeselectAll}
            >
              Desel. Totes
            </Button>
          </div>

          {/* Total licenses info - only for paid software */}
          {!isFreeSoftware && software.license_quantity && (
            <div className="rounded-lg border p-3 bg-muted/50">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Llicències totals disponibles:</span>
                <Badge variant={getTotalLicenses() > software.license_quantity ? "destructive" : "secondary"}>
                  {getTotalLicenses()} / {software.license_quantity}
                </Badge>
              </div>
              {getTotalLicenses() > software.license_quantity && (
                <p className="text-sm text-destructive mt-2">
                  ⚠️ Has assignat més llicències de les disponibles
                </p>
              )}
            </div>
          )}
          
          {/* Info for free software */}
          {isFreeSoftware && (
            <div className="rounded-lg border p-3 bg-muted/50">
              <div className="flex items-center gap-2">
                <Badge variant="secondary">Software {software.license_type === 'free' ? 'Gratuït' : 'de Codi Obert'}</Badge>
                <span className="text-sm text-muted-foreground">
                  No cal gestionar llicències - Il·limitades
                </span>
              </div>
            </div>
          )}

          {/* Classrooms list grouped by type */}
          <div className="border rounded-lg max-h-[400px] overflow-y-auto">
            <div className="space-y-4">
              {/* Computer classrooms first */}
              {filteredClassrooms.filter(c => c.type === CLASSROOM_TYPES.INFORMATICA).length > 0 && (
                <div>
                  <div className="sticky top-0 bg-background border-b px-4 py-2">
                    <h4 className="text-sm font-semibold flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Aules d'Informàtica
                    </h4>
                  </div>
                  <div className="p-4 space-y-3">
                    {filteredClassrooms
                      .filter(c => c.type === CLASSROOM_TYPES.INFORMATICA)
                      .map((classroom) => {
                        const assignment = assignments.find(a => a.classroom_id === classroom.id)
                        const isAssigned = !!assignment
                        
                        return (
                          <div key={classroom.id} className="flex items-center space-x-3 py-2">
                            <Checkbox
                              id={classroom.id}
                              checked={isAssigned}
                              onCheckedChange={(checked) => 
                                handleClassroomToggle(classroom.id, checked as boolean)
                              }
                            />
                            <div className="flex-1 flex items-center justify-between">
                              <label
                                htmlFor={classroom.id}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                              >
                                <span className="font-semibold">{classroom.code}</span>
                                <span>{classroom.name}</span>
                                {classroom.building && (
                                  <span className="text-xs text-muted-foreground">
                                    Edifici {classroom.building} - Pis {classroom.floor}
                                  </span>
                                )}
                              </label>
                              
                              {isAssigned && !isFreeSoftware && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-muted-foreground">Llicències:</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={assignment.licenses}
                                    onChange={(e) => handleLicenseChange(classroom.id, e.target.value)}
                                    className="w-20 h-7 text-xs"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}

              {/* Other classrooms */}
              {filteredClassrooms.filter(c => c.type !== CLASSROOM_TYPES.INFORMATICA).length > 0 && (
                <div>
                  <div className="sticky top-0 bg-background border-b px-4 py-2">
                    <h4 className="text-sm font-semibold">Altres Aules</h4>
                  </div>
                  <div className="p-4 space-y-3">
                    {filteredClassrooms
                      .filter(c => c.type !== CLASSROOM_TYPES.INFORMATICA)
                      .map((classroom) => {
                        const assignment = assignments.find(a => a.classroom_id === classroom.id)
                        const isAssigned = !!assignment
                        
                        return (
                          <div key={classroom.id} className="flex items-center space-x-3 py-2">
                            <Checkbox
                              id={classroom.id}
                              checked={isAssigned}
                              onCheckedChange={(checked) => 
                                handleClassroomToggle(classroom.id, checked as boolean)
                              }
                            />
                            <div className="flex-1 flex items-center justify-between">
                              <label
                                htmlFor={classroom.id}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer flex items-center gap-2"
                              >
                                <span>{classroom.code}</span>
                                <span>{classroom.name}</span>
                                {classroom.building && (
                                  <span className="text-xs text-muted-foreground">
                                    Edifici {classroom.building} - Pis {classroom.floor}
                                  </span>
                                )}
                              </label>
                              
                              {isAssigned && !isFreeSoftware && (
                                <div className="flex items-center gap-2">
                                  <Label className="text-xs text-muted-foreground">Llicències:</Label>
                                  <Input
                                    type="number"
                                    min="1"
                                    value={assignment.licenses}
                                    onChange={(e) => handleLicenseChange(classroom.id, e.target.value)}
                                    className="w-20 h-7 text-xs"
                                  />
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel·lar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Guardant..." : "Guardar assignacions"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}