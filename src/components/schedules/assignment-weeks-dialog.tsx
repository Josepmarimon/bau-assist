"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Calendar } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WeekSelector } from "./week-selector"
import { Badge } from "@/components/ui/badge"

interface Assignment {
  id: string
  subject?: {
    name: string
    code: string
  }
  time_slot?: {
    day_of_week: number
    start_time: string
    end_time: string
  }
  classrooms?: Array<{
    id: string
    code: string
    name: string
  }>
}

interface AssignmentWeeksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignment: Assignment | null
  onSuccess?: () => void
}

const DAYS = [
  { value: 1, label: "Dilluns" },
  { value: 2, label: "Dimarts" },
  { value: 3, label: "Dimecres" },
  { value: 4, label: "Dijous" },
  { value: 5, label: "Divendres" },
]

export function AssignmentWeeksDialog({
  open,
  onOpenChange,
  assignment,
  onSuccess,
}: AssignmentWeeksDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isFullSemester, setIsFullSemester] = useState(true)
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([])
  const [currentWeeks, setCurrentWeeks] = useState<Record<string, number[]>>({})
  
  const supabase = createClient()

  useEffect(() => {
    if (open && assignment) {
      loadCurrentWeeks()
    }
  }, [open, assignment])

  const loadCurrentWeeks = async () => {
    if (!assignment) return
    
    setLoading(true)
    setError(null)
    
    try {
      // Load current assignment classrooms with their weeks
      const { data, error } = await supabase
        .from('assignment_classrooms')
        .select(`
          classroom_id,
          is_full_semester,
          assignment_classroom_weeks (
            week_number
          )
        `)
        .eq('assignment_id', assignment.id)
      
      if (error) throw error
      
      if (data && data.length > 0) {
        // Store weeks for each classroom
        const weeksByClassroom: Record<string, number[]> = {}
        let allFullSemester = true
        
        data.forEach(ac => {
          const weeks = ac.assignment_classroom_weeks?.map(w => w.week_number) || []
          weeksByClassroom[ac.classroom_id] = weeks
          if (!ac.is_full_semester) {
            allFullSemester = false
          }
        })
        
        setCurrentWeeks(weeksByClassroom)
        setIsFullSemester(allFullSemester)
        
        // If all classrooms have the same weeks, use those as selected weeks
        const firstClassroomWeeks = Object.values(weeksByClassroom)[0] || []
        const allSameWeeks = Object.values(weeksByClassroom).every(weeks => 
          weeks.length === firstClassroomWeeks.length &&
          weeks.every(w => firstClassroomWeeks.includes(w))
        )
        
        if (allSameWeeks && !allFullSemester) {
          setSelectedWeeks(firstClassroomWeeks)
        }
      }
    } catch (error) {
      console.error('Error loading weeks:', error)
      setError('Error al carregar les setmanes actuals')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!assignment) return
    
    setSaving(true)
    setError(null)
    
    try {
      // Validate weeks if not full semester
      if (!isFullSemester && selectedWeeks.length === 0) {
        setError('Si us plau, selecciona almenys una setmana')
        setSaving(false)
        return
      }
      
      // Update all assignment classrooms with new weeks
      const { data: assignmentClassrooms, error: fetchError } = await supabase
        .from('assignment_classrooms')
        .select('id, classroom_id')
        .eq('assignment_id', assignment.id)
      
      if (fetchError) throw fetchError
      
      for (const ac of assignmentClassrooms || []) {
        // Update is_full_semester and week_range_type
        const { error: updateError } = await supabase
          .from('assignment_classrooms')
          .update({
            is_full_semester: isFullSemester,
            week_range_type: isFullSemester ? 'full' : 'specific_weeks'
          })
          .eq('id', ac.id)
        
        if (updateError) throw updateError
        
        // Delete existing weeks
        const { error: deleteError } = await supabase
          .from('assignment_classroom_weeks')
          .delete()
          .eq('assignment_classroom_id', ac.id)
        
        if (deleteError) throw deleteError
        
        // Insert new weeks if not full semester
        if (!isFullSemester && selectedWeeks.length > 0) {
          const weekRecords = selectedWeeks.map(weekNumber => ({
            assignment_classroom_id: ac.id,
            week_number: weekNumber
          }))
          
          const { error: insertError } = await supabase
            .from('assignment_classroom_weeks')
            .insert(weekRecords)
          
          if (insertError) throw insertError
        }
      }
      
      // Success
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
    } catch (error: any) {
      console.error('Error saving weeks:', error)
      setError(error.message || 'Error al guardar les setmanes')
    } finally {
      setSaving(false)
    }
  }

  if (!assignment) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Setmanes d'Assignació</DialogTitle>
          <DialogDescription>
            {assignment.subject?.name} - {assignment.subject?.code}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Assignment info */}
          <div className="flex items-center gap-4 text-sm">
            <Badge variant="outline">
              {DAYS.find(d => d.value === assignment.time_slot?.day_of_week)?.label}
            </Badge>
            <Badge variant="secondary">
              {assignment.time_slot?.start_time?.substring(0, 5)} - {assignment.time_slot?.end_time?.substring(0, 5)}
            </Badge>
            {assignment.classrooms?.map(classroom => (
              <Badge key={classroom.id} variant="outline">
                {classroom.code} - {classroom.name}
              </Badge>
            ))}
          </div>
          
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : (
            <>
              {/* Current weeks info */}
              {Object.keys(currentWeeks).length > 0 && !isFullSemester && (
                <Alert>
                  <Calendar className="h-4 w-4" />
                  <AlertDescription>
                    Setmanes actuals: {
                      Object.entries(currentWeeks).map(([classroomId, weeks]) => {
                        const classroom = assignment.classrooms?.find(c => c.id === classroomId)
                        return `${classroom?.code || 'Aula'}: ${weeks.sort((a, b) => a - b).join(', ')}`
                      }).join(' | ')
                    }
                  </AlertDescription>
                </Alert>
              )}
              
              {/* Week selector */}
              <WeekSelector
                isFullSemester={isFullSemester}
                selectedWeeks={selectedWeeks}
                onFullSemesterChange={setIsFullSemester}
                onWeeksChange={setSelectedWeeks}
              />
              
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel·lar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || loading}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar canvis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}