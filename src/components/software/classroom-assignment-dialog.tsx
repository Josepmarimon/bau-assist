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

interface Classroom {
  id: string
  name: string
  code: string
  building?: string
  floor?: number
  capacity?: number
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
        .select('id, name, code, building, floor, capacity')
        .order('building')
        .order('floor')
        .order('code')

      if (error) throw error
      setClassrooms(data || [])
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
      
      setCurrentAssignments(assignments)
      setAssignments(assignments)
    } catch (error) {
      console.error('Error loading assignments:', error)
    }
  }

  const handleClassroomToggle = (classroomId: string, checked: boolean) => {
    if (checked) {
      // Add assignment with default 1 license
      setAssignments(prev => [...prev, { classroom_id: classroomId, licenses: 1 }])
    } else {
      // Remove assignment
      setAssignments(prev => prev.filter(a => a.classroom_id !== classroomId))
    }
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
          licenses: assignment.licenses,
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
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Cercar aules..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Total licenses info */}
          {software.license_quantity && (
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

          {/* Classrooms list */}
          <div className="border rounded-lg max-h-[400px] overflow-y-auto">
            <div className="p-4 space-y-3">
              {filteredClassrooms.map((classroom) => {
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
                        <Monitor className="h-4 w-4 text-muted-foreground" />
                        <span>{classroom.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {classroom.code}
                        </Badge>
                        {classroom.building && (
                          <span className="text-xs text-muted-foreground">
                            Edifici {classroom.building} - Pis {classroom.floor}
                          </span>
                        )}
                      </label>
                      
                      {isAssigned && (
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