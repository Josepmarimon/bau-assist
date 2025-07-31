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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { createClient } from "@/lib/supabase/client"
import { Loader2, Trash2, Calendar, Edit, X } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { WeekSelector } from "@/components/schedules/week-selector"

interface ClassroomAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjectGroup: {
    id: string
    subject_id: string
    subject?: {
      id: string
      name: string
      code: string
    }
    group_code?: string
    student_group_id?: string | null
  }
  semesterId: string
  onSuccess?: () => void
}

interface Classroom {
  id: string
  code: string
  name: string
  building: string
  floor: number
  capacity: number
  type: string
}

interface Assignment {
  id: string
  time_slot_id: string
  semester_id?: string
  semesters?: {
    name: string
    academic_years?: {
      name: string
    }
  }
  time_slot?: {
    day_of_week: number
    start_time: string
    end_time: string
    slot_type: string
  }
  assignment_classrooms?: {
    classroom: Classroom
    is_full_semester?: boolean
    week_range_type?: string
    weeks?: number[]
  }[]
}

const DAYS = [
  { value: 1, label: "Dilluns" },
  { value: 2, label: "Dimarts" },
  { value: 3, label: "Dimecres" },
  { value: 4, label: "Dijous" },
  { value: 5, label: "Divendres" },
]

const TIME_PERIODS = [
  { value: "mati", label: "Matí (9:00-14:30)" },
  { value: "tarda", label: "Tarda (15:00-19:30)" },
]

export function ClassroomAssignmentDialog({
  open,
  onOpenChange,
  subjectGroup,
  semesterId,
  onSuccess,
}: ClassroomAssignmentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [dayOfWeek, setDayOfWeek] = useState<string>("")
  const [timePeriod, setTimePeriod] = useState<string>("")
  const [selectedClassrooms, setSelectedClassrooms] = useState<string[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [isFullSemester, setIsFullSemester] = useState(true)
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([])
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null)
  
  // Data
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [filteredClassrooms, setFilteredClassrooms] = useState<Classroom[]>([])
  const [studentGroup, setStudentGroup] = useState<any>(null)
  const [allStudentGroups, setAllStudentGroups] = useState<any[]>([])
  const [manualGroupSelection, setManualGroupSelection] = useState(false)
  const [classroomConflicts, setClassroomConflicts] = useState<Record<string, any>>({})
  const [semesters, setSemesters] = useState<any[]>([])
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>(semesterId)
  
  // Filters
  const [buildingFilter, setBuildingFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [floorFilter, setFloorFilter] = useState<string>("all")
  
  const supabase = createClient()

  // Load semesters on component mount
  useEffect(() => {
    if (!open) return
    
    const loadSemesters = async () => {
      const { data, error } = await supabase
        .from("semesters")
        .select(`
          id,
          name,
          number,
          academic_years (
            name
          )
        `)
        .order('academic_years(name)', { ascending: false })
        .order('number', { ascending: true })
        
      if (!error && data) {
        setSemesters(data)
      }
    }
    
    loadSemesters()
  }, [open])

  // Load student group and existing assignments
  useEffect(() => {
    if (!open || !subjectGroup.id) return
    
    const loadData = async () => {
      console.log("Loading data for subject group:", subjectGroup)
      console.log("Initial semesterId prop:", semesterId)
      console.log("Selected semester ID:", selectedSemesterId)
      
      // First, load all student groups
      const { data: allGroups, error: groupsError } = await supabase
        .from("student_groups")
        .select("*")
        .order("name")
        
      if (groupsError) {
        console.error("Error loading student groups:", groupsError)
      } else {
        console.log("All student groups:", allGroups)
        setAllStudentGroups(allGroups || [])
      }
      
      // First check if we already have a student_group_id
      if (subjectGroup.student_group_id && allGroups) {
        const existingGroup = allGroups.find(g => g.id === subjectGroup.student_group_id)
        if (existingGroup) {
          console.log("Found existing student group by ID:", existingGroup)
          setStudentGroup(existingGroup)
          setManualGroupSelection(false)
        }
      } else {
        // Try to find the student group from the group code
        const groupCode = subjectGroup.group_code
        if (groupCode && allGroups) {
          console.log("Subject group code:", groupCode)
          
          // Try exact match first
          let matchedGroup = allGroups.find(g => g.name === groupCode)
          
          if (matchedGroup) {
            console.log("Found exact match:", matchedGroup)
            setStudentGroup(matchedGroup)
          } else {
          // Try to extract pattern from the code
          // Subject group codes might be like "T-GR4-Gm1", "P1-GR2-Im", etc.
          // Student group names are like "GR4-Gm1", "GR2-Im", etc.
          console.log("Trying to extract student group from code:", groupCode)
          
          // Try different approaches
          let foundGroup = null
          
          // Approach 1: Look for exact GR pattern
          const grPattern = /GR\d+-[A-Za-z]+\d*/
          const grMatch = groupCode.match(grPattern)
          if (grMatch) {
            console.log("Found GR pattern:", grMatch[0])
            foundGroup = allGroups.find(g => g.name === grMatch[0])
          }
          
          // Approach 2: Extract GR and group parts separately
          if (!foundGroup) {
            const grNumberMatch = groupCode.match(/GR(\d+)/)
            const groupSuffixMatch = groupCode.match(/([A-Za-z]+\d*)$/)
            
            if (grNumberMatch && groupSuffixMatch) {
              const attemptedName = `GR${grNumberMatch[1]}-${groupSuffixMatch[1]}`
              console.log("Trying concatenated name:", attemptedName)
              foundGroup = allGroups.find(g => g.name === attemptedName)
            }
          }
          
          // Approach 3: Partial match
          if (!foundGroup) {
            foundGroup = allGroups.find(g => {
              // Check if the group code contains the student group name
              return groupCode.includes(g.name)
            })
          }
          
          if (foundGroup) {
            console.log("Found matching group:", foundGroup)
            setStudentGroup(foundGroup)
          } else {
            console.log("No matching group found, enabling manual selection")
            setManualGroupSelection(true)
          }
        }
        } else if (!groupCode) {
          console.log("No group code provided, enabling manual selection")
          setManualGroupSelection(true)
        }
      }
      
      // Load existing assignments - show ALL assignments regardless of semester
      const { data, error } = await supabase
        .from("assignments")
        .select(`
          id,
          time_slot_id,
          student_group_id,
          semester_id,
          semesters!semester_id (
            name,
            academic_years (
              name
            )
          ),
          time_slot:time_slots!time_slot_id (
            day_of_week,
            start_time,
            end_time,
            slot_type
          ),
          assignment_classrooms (
            classroom:classrooms!classroom_id (
              id,
              code,
              name,
              building,
              floor,
              capacity,
              type
            ),
            is_full_semester,
            week_range_type,
            assignment_classroom_weeks (
              week_number
            )
          )
        `)
        .eq("subject_group_id", subjectGroup.id)
        
      if (error) {
        console.error("Error loading assignments:", error)
        return
      }
      
      // Process assignments to include weeks array
      const processedAssignments = (data || []).map((assignment: any) => ({
        ...assignment,
        assignment_classrooms: assignment.assignment_classrooms?.map((ac: any) => ({
          ...ac,
          classroom: Array.isArray(ac.classroom) ? ac.classroom[0] : ac.classroom,
          weeks: ac.assignment_classroom_weeks?.map((w: any) => w.week_number) || []
        }))
      }))
      setAssignments(processedAssignments)
    }
    
    loadData()
  }, [open, subjectGroup.id, subjectGroup.subject_id, selectedSemesterId])

  // Load classrooms
  useEffect(() => {
    if (!open) return
    
    const loadClassrooms = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from("classrooms")
        .select("*")
        .order("code")
        
      if (error) {
        console.error("Error loading classrooms:", error)
        setError("Error al carregar les aules")
      } else {
        setClassrooms(data || [])
      }
      setLoading(false)
    }
    
    loadClassrooms()
  }, [open])

  // Check for classroom conflicts when day, time period, or weeks change
  useEffect(() => {
    if (!dayOfWeek || !timePeriod || classrooms.length === 0) return
    
    const checkConflicts = async () => {
      // Find or create time slot
      const startTime = timePeriod === "mati" ? "09:00:00" : "15:00:00"
      const endTime = timePeriod === "mati" ? "14:30:00" : "19:30:00"
      
      let { data: timeSlot } = await supabase
        .from("time_slots")
        .select("id")
        .eq("day_of_week", dayOfWeek)
        .eq("start_time", startTime)
        .eq("end_time", endTime)
        .single()
        
      if (!timeSlot) return
      
      // Determine which weeks to check
      const weekNumbersToCheck = isFullSemester ? Array.from({length: 15}, (_, i) => i + 1) : selectedWeeks
      
      // Check conflicts for all classrooms using the RPC function
      const conflictMap: Record<string, any> = {}
      
      for (const classroom of classrooms) {
        const { data: conflicts } = await supabase
          .rpc('check_classroom_week_conflicts', {
            p_classroom_id: classroom.id,
            p_time_slot_id: timeSlot!.id,
            p_week_numbers: weekNumbersToCheck.length > 0 ? weekNumbersToCheck : [1], // Default to week 1 if no weeks selected
            p_exclude_assignment_id: editingAssignmentId,
            p_semester_id: selectedSemesterId
          })
        
        if (conflicts && conflicts.length > 0) {
          conflictMap[classroom.id] = {
            subjects: { name: conflicts[0].subject_name },
            group_code: conflicts[0].group_code,
            conflicting_weeks: conflicts[0].conflicting_weeks
          }
        }
      }
      
      setClassroomConflicts(conflictMap)
    }
    
    checkConflicts()
  }, [dayOfWeek, timePeriod, classrooms, subjectGroup.id, isFullSemester, selectedWeeks, selectedSemesterId, editingAssignmentId])

  // Filter classrooms
  useEffect(() => {
    let filtered = classrooms
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }
    
    // Apply building filter
    if (buildingFilter !== "all") {
      filtered = filtered.filter((c) => c.building === buildingFilter)
    }
    
    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter((c) => c.type === typeFilter)
    }
    
    // Apply floor filter
    if (floorFilter !== "all") {
      filtered = filtered.filter((c) => c.floor === parseInt(floorFilter))
    }
    
    // Sort by capacity match (prefer classrooms with similar capacity)
    const groupCapacity = studentGroup?.capacity || 0
    if (groupCapacity > 0) {
      filtered.sort((a, b) => {
        const diffA = Math.abs(a.capacity - groupCapacity)
        const diffB = Math.abs(b.capacity - groupCapacity)
        return diffA - diffB
      })
    }
    
    setFilteredClassrooms(filtered)
  }, [classrooms, searchTerm, buildingFilter, typeFilter, floorFilter, studentGroup])

  const handleSave = async () => {
    if (!dayOfWeek || !timePeriod) {
      setError("Si us plau, selecciona el dia i la franja horària")
      return
    }
    
    // Student group is now optional
    // if (!studentGroup) {
    //   setError("No s'ha pogut determinar el grup d'estudiants")
    //   return
    // }
    
    setSaving(true)
    setError(null)
    
    try {
      // Find or create time slot
      const startTime = timePeriod === "mati" ? "09:00:00" : "15:00:00"
      const endTime = timePeriod === "mati" ? "14:30:00" : "19:30:00"
      
      let { data: timeSlot, error: timeSlotError } = await supabase
        .from("time_slots")
        .select("id")
        .eq("day_of_week", parseInt(dayOfWeek))
        .eq("start_time", startTime)
        .eq("end_time", endTime)
        .eq("slot_type", timePeriod)
        .single()
        
      if (timeSlotError || !timeSlot) {
        // Create time slot if it doesn't exist
        const { data: newTimeSlot, error: createError } = await supabase
          .from("time_slots")
          .insert({
            day_of_week: parseInt(dayOfWeek),
            start_time: startTime,
            end_time: endTime,
            slot_type: timePeriod,
          })
          .select()
          .single()
          
        if (createError) throw createError
        timeSlot = newTimeSlot
      }
      
      // Check for conflicts only if we have a student group
      if (studentGroup) {
        const { data: conflicts, error: conflictError } = await supabase
          .from("assignments")
          .select("id")
          .eq("time_slot_id", timeSlot!.id)
          .eq("student_group_id", studentGroup.id)
          .eq("semester_id", selectedSemesterId)  // Add semester filter
          .neq("subject_group_id", subjectGroup.id)
          
        if (conflictError) throw conflictError
        
        if (conflicts && conflicts.length > 0) {
          setError("Aquest grup ja té una assignació en aquest horari")
          setSaving(false)
          return
        }
      }
      
      // Only check for classroom conflicts if classrooms are selected
      if (selectedClassrooms.length > 0) {
        // Check for classroom conflicts considering weeks
        if (!isFullSemester && selectedWeeks.length === 0) {
          setError("Si us plau, selecciona almenys una setmana")
          setSaving(false)
          return
        }
        
        // Use the function to check conflicts for each classroom
        const weekNumbersToCheck = isFullSemester ? Array.from({length: 15}, (_, i) => i + 1) : selectedWeeks
        
        // Check conflicts for each selected classroom
        for (const classroomId of selectedClassrooms) {
          // Debug logging
          console.log('Checking classroom conflicts with:', {
            classroom: classroomId,
            timeSlot: timeSlot!.id,
            weeks: weekNumbersToCheck,
            semesterId: selectedSemesterId,
            excludeAssignment: editingAssignmentId
          })
          
          const { data: conflicts, error: conflictError } = await supabase
            .rpc('check_classroom_week_conflicts', {
              p_classroom_id: classroomId,
              p_time_slot_id: timeSlot!.id,
              p_week_numbers: weekNumbersToCheck,
              p_exclude_assignment_id: editingAssignmentId,
              p_semester_id: selectedSemesterId
            })
            
          if (conflictError) throw conflictError
          
          if (conflicts && conflicts.length > 0) {
            const conflict = conflicts[0]
          const conflictingWeeks = conflict.conflicting_weeks
          
          console.log('Conflict found:', conflict)
          
            const classroom = classrooms.find(c => c.id === classroomId)
            const classroomName = classroom ? classroom.name : 'Aula desconeguda'
            
            if (isFullSemester) {
              setError(`Solapament d'aula: ${classroomName} ja està assignada en aquest horari a ${conflict.subject_name} (${conflict.group_code})`)
            } else {
              setError(`Solapament d'aula: ${classroomName} ja està assignada a ${conflict.subject_name} (${conflict.group_code}) les setmanes: ${conflictingWeeks.join(', ')}`)
            }
            setSaving(false)
            return
          }
        }
      }
      
      // Check for teacher conflicts
      const { data: teacherConflicts, error: teacherConflictError } = await supabase
        .rpc('check_subject_group_teacher_conflicts', {
          p_subject_group_id: subjectGroup.id,
          p_time_slot_id: timeSlot!.id,
          p_semester_id: selectedSemesterId,
          p_exclude_assignment_id: editingAssignmentId
        })
        
      if (teacherConflictError) {
        console.error("Error checking teacher conflicts:", teacherConflictError)
        // TEMP: Skip teacher conflict checking due to RLS recursion issue
        // Continue anyway, as teacher conflict checking is not critical
      }
      
      if (teacherConflicts && teacherConflicts.length > 0) {
        const conflict = teacherConflicts[0]
        setError(`Solapament de professor: ${conflict.teacher_name} ja té classe de ${conflict.conflicting_subject} (${conflict.conflicting_group}) en aquest horari`)
        setSaving(false)
        return
      }
      
      // Create or update assignment
      let assignment
      let assignmentError
      
      if (editingAssignmentId) {
        // Update existing assignment
        const { data, error } = await supabase
          .from("assignments")
          .update({
            semester_id: selectedSemesterId,
            student_group_id: studentGroup?.id || null,
            time_slot_id: timeSlot!.id,
            hours_per_week: timePeriod === "mati" ? 6 : 5,
          })
          .eq("id", editingAssignmentId)
          .select()
          .single()
        
        assignment = data
        assignmentError = error
        
        // Delete existing classroom assignments to recreate them
        if (!error) {
          await supabase
            .from("assignment_classrooms")
            .delete()
            .eq("assignment_id", editingAssignmentId)
        }
      } else {
        // Create new assignment
        const { data, error } = await supabase
          .from("assignments")
          .insert({
            semester_id: selectedSemesterId,
            subject_id: subjectGroup.subject_id,
            subject_group_id: subjectGroup.id,
            student_group_id: studentGroup?.id || null,
            time_slot_id: timeSlot!.id,
            hours_per_week: timePeriod === "mati" ? 6 : 5,
          })
          .select()
          .single()
          
        assignment = data
        assignmentError = error
      }
        
      if (assignmentError) throw assignmentError
      
      // Create classroom assignments for all selected classrooms
      if (selectedClassrooms.length > 0) {
        for (const classroomId of selectedClassrooms) {
          const { data: classroomAssignment, error: classroomAssignmentError } = await supabase
            .from("assignment_classrooms")
            .insert({
              assignment_id: assignment.id,
              classroom_id: classroomId,
              is_full_semester: isFullSemester,
              week_range_type: isFullSemester ? 'full' : 'specific_weeks'
            })
            .select()
            .single()
            
          if (classroomAssignmentError) throw classroomAssignmentError
          
          // If specific weeks, insert week records
          if (!isFullSemester && selectedWeeks.length > 0) {
            const weekRecords = selectedWeeks.map(weekNumber => ({
              assignment_classroom_id: classroomAssignment.id,
              week_number: weekNumber
            }))
            
            const { error: weeksError } = await supabase
              .from("assignment_classroom_weeks")
              .insert(weekRecords)
              
            if (weeksError) throw weeksError
          }
        }
      }
      
      // Reload assignments - show ALL assignments regardless of semester
      const { data: updatedAssignments } = await supabase
        .from("assignments")
        .select(`
          id,
          time_slot_id,
          semester_id,
          semesters!semester_id (
            name,
            academic_years (
              name
            )
          ),
          time_slot:time_slots!time_slot_id (
            day_of_week,
            start_time,
            end_time,
            slot_type
          ),
          assignment_classrooms (
            classroom:classrooms!classroom_id (
              id,
              code,
              name,
              building,
              floor,
              capacity,
              type
            ),
            is_full_semester,
            week_range_type,
            assignment_classroom_weeks (
              week_number
            )
          )
        `)
        .eq("subject_group_id", subjectGroup.id)
        
      // Process updated assignments to include weeks array
      const processedUpdatedAssignments = (updatedAssignments || []).map((assignment: any) => ({
        ...assignment,
        assignment_classrooms: assignment.assignment_classrooms?.map((ac: any) => ({
          ...ac,
          classroom: Array.isArray(ac.classroom) ? ac.classroom[0] : ac.classroom,
          weeks: ac.assignment_classroom_weeks?.map((w: any) => w.week_number) || []
        }))
      }))
      setAssignments(processedUpdatedAssignments)
      
      // Reset form
      setDayOfWeek("")
      setTimePeriod("")
      setSelectedClassrooms([])
      setIsFullSemester(true)
      setSelectedWeeks([])
      setEditingAssignmentId(null)
      
      // Close dialog and call success callback
      onOpenChange(false)
      if (onSuccess) {
        onSuccess()
      }
      
    } catch (error: any) {
      console.error("Error saving assignment:", error)
      
      // Log error details properly
      if (error) {
        console.error("Error details:", {
          message: error.message || 'No message',
          details: error.details || 'No details',
          hint: error.hint || 'No hint',
          code: error.code || 'No code',
          stack: error.stack || 'No stack trace'
        })
        
        // Log the full error object
        console.error("Full error object:", JSON.stringify(error, Object.getOwnPropertyNames(error)))
      }
      
      // Check if it's a generic "occupied" error without details
      if (error.message && (error.message.includes('ocupada') || error.message.includes('occupied'))) {
        console.warn('Generic occupied error detected - this might be coming from a database constraint or trigger')
      }
      
      setError(error.message || "Error al guardar l'assignació")
    } finally {
      setSaving(false)
    }
  }
  
  const handleEdit = (assignment: Assignment) => {
    // Set editing mode
    setEditingAssignmentId(assignment.id)
    
    // Fill form with existing values
    if (assignment.time_slot) {
      setDayOfWeek(assignment.time_slot.day_of_week.toString())
      setTimePeriod(assignment.time_slot.slot_type)
    }
    
    // Set classrooms and weeks if available
    if (assignment.assignment_classrooms && assignment.assignment_classrooms.length > 0) {
      // Collect all classroom IDs
      const classroomIds = assignment.assignment_classrooms
        .filter(ac => ac.classroom)
        .map(ac => ac.classroom.id)
      setSelectedClassrooms(classroomIds)
      
      // Set weeks from first classroom (assuming all have same weeks)
      const firstClassroom = assignment.assignment_classrooms[0]
      if (!firstClassroom.is_full_semester && firstClassroom.weeks && firstClassroom.weeks.length > 0) {
        setIsFullSemester(false)
        setSelectedWeeks(firstClassroom.weeks)
      } else {
        setIsFullSemester(true)
        setSelectedWeeks([])
      }
    }
  }

  const handleDelete = async (assignmentId: string) => {
    if (!confirm("Estàs segur que vols eliminar aquesta assignació?")) return
    
    const { error } = await supabase
      .from("assignments")
      .delete()
      .eq("id", assignmentId)
      
    if (error) {
      console.error("Error deleting assignment:", error)
      setError("Error al eliminar l'assignació")
    } else {
      setAssignments(assignments.filter(a => a.id !== assignmentId))
      // Clear editing mode if we're deleting the assignment being edited
      if (editingAssignmentId === assignmentId) {
        setEditingAssignmentId(null)
      }
    }
  }

  const uniqueBuildings = [...new Set(classrooms.map((c) => c.building).filter(Boolean))]
  const uniqueTypes = [...new Set(classrooms.map((c) => c.type).filter(Boolean))]
  const uniqueFloors = [...new Set(classrooms.map((c) => c.floor).filter(f => f !== null && f !== undefined))].sort((a, b) => a - b)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assignar Aules - {subjectGroup.subject?.name}</DialogTitle>
          <DialogDescription>
            {subjectGroup.group_code && `Grup: ${subjectGroup.group_code}`}
            {studentGroup && (
              <span>
                {subjectGroup.group_code && ' - '}
                Grup d'estudiants: {studentGroup.name} ({studentGroup.capacity} estudiants)
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Existing assignments */}
          {assignments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Assignacions actuals</h3>
              
              {/* Warning if there are assignments from different semesters */}
              {assignments.some(a => a.semester_id !== selectedSemesterId) && (
                <Alert className="bg-amber-50 border-amber-200">
                  <AlertDescription className="text-amber-800">
                    Hi ha assignacions d'altres semestres. Les assignacions destacades en groc són d'un semestre diferent al seleccionat.
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="space-y-2">
                {assignments.map((assignment) => {
                  const isFromDifferentSemester = assignment.semester_id !== selectedSemesterId
                  
                  return (
                    <div
                      key={assignment.id}
                      className={cn(
                        "flex items-center justify-between p-3 border rounded-lg",
                        isFromDifferentSemester && "bg-amber-50 border-amber-200"
                      )}
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              {DAYS.find(d => d.value === assignment.time_slot?.day_of_week)?.label}
                            </Badge>
                            <Badge variant={assignment.time_slot?.slot_type === "mati" ? "default" : "secondary"}>
                              {assignment.time_slot?.slot_type === "mati" ? "Matí" : "Tarda"}
                            </Badge>
                            {assignment.assignment_classrooms?.map((ac) => (
                              <Badge key={ac.classroom?.id || Math.random()} variant="outline">
                                {ac.classroom?.code || 'N/A'} - {ac.classroom?.name || 'Sense nom'}
                              </Badge>
                            ))}
                          </div>
                          {isFromDifferentSemester && assignment.semesters && (
                            <div className="flex items-center gap-1 text-xs text-amber-700">
                              <span className="font-medium">
                                Semestre: {assignment.semesters.academic_years?.name} - {assignment.semesters.name}
                              </span>
                            </div>
                          )}
                          {assignment.assignment_classrooms?.some(ac => !ac.is_full_semester) && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {assignment.assignment_classrooms?.map((ac) => {
                                if (!ac.is_full_semester && ac.weeks && ac.weeks.length > 0) {
                                  const weeks = ac.weeks.sort((a, b) => a - b)
                                  const weekRanges: string[] = []
                                  let start = weeks[0]
                                  let end = weeks[0]
                                  
                                  for (let i = 1; i <= weeks.length; i++) {
                                    if (i === weeks.length || weeks[i] !== end + 1) {
                                      if (start === end) {
                                        weekRanges.push(`${start}`)
                                      } else {
                                        weekRanges.push(`${start}-${end}`)
                                      }
                                      if (i < weeks.length) {
                                        start = weeks[i]
                                        end = weeks[i]
                                      }
                                    } else {
                                      end = weeks[i]
                                    }
                                  }
                                  
                                  return (
                                    <span key={ac.classroom?.id}>
                                      Setmanes: {weekRanges.join(', ')}
                                    </span>
                                  )
                                }
                                return null
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(assignment)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(assignment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          
          {/* New assignment form */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">
                {editingAssignmentId ? "Editar assignació" : "Nova assignació"}
              </h3>
              {editingAssignmentId && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setEditingAssignmentId(null)
                    setDayOfWeek("")
                    setTimePeriod("")
                    setSelectedClassrooms([])
                    setIsFullSemester(true)
                    setSelectedWeeks([])
                  }}
                >
                  Cancel·lar edició
                </Button>
              )}
            </div>
            
            {editingAssignmentId && (
              <Alert>
                <AlertDescription className="text-sm">
                  Pots modificar l'horari o eliminar l'aula assignada. Deixa l'aula sense seleccionar per mantenir l'assignació horària sense aula.
                </AlertDescription>
              </Alert>
            )}
            
            {/* Main form grid */}
            <div className="grid grid-cols-3 gap-3">
              {/* Semester */}
              {semesters.length > 0 && (
                <Select value={selectedSemesterId} onValueChange={setSelectedSemesterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Semestre" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id}>
                        {semester.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              
              {/* Day of week */}
              <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                <SelectTrigger>
                  <SelectValue placeholder="Dia de la setmana" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((day) => (
                    <SelectItem key={day.value} value={day.value.toString()}>
                      {day.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {/* Time period */}
              <Select value={timePeriod} onValueChange={setTimePeriod}>
                <SelectTrigger>
                  <SelectValue placeholder="Franja horària" />
                </SelectTrigger>
                <SelectContent>
                  {TIME_PERIODS.map((period) => {
                    const isDisabled = studentGroup?.shift && studentGroup.shift !== period.value
                    
                    return (
                      <SelectItem
                        key={period.value}
                        value={period.value}
                        disabled={isDisabled}
                      >
                        {period.label}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
            
            {/* Week selection */}
            <WeekSelector
              isFullSemester={isFullSemester}
              selectedWeeks={selectedWeeks}
              onFullSemesterChange={setIsFullSemester}
              onWeeksChange={setSelectedWeeks}
            />
            
            {/* Classroom selection */}
            <div className="space-y-4">
              {/* Selected classrooms display */}
              {selectedClassrooms.length > 0 && (
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {selectedClassrooms.map(classroomId => {
                      const classroom = classrooms.find(c => c.id === classroomId)
                      return classroom ? (
                        <Badge 
                          key={classroomId} 
                          variant="secondary"
                          className="flex items-center gap-1"
                        >
                          {classroom.code} - {classroom.name}
                          <button
                            type="button"
                            onClick={() => setSelectedClassrooms(selectedClassrooms.filter(id => id !== classroomId))}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ) : null
                    })}
                  </div>
                </div>
              )}
              
              {/* Search and filters grid */}
              <div className="grid grid-cols-4 gap-3">
                <Input
                  placeholder="Cerca aula..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                
                <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tots els edificis" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tots els edificis</SelectItem>
                    {uniqueBuildings.map((building) => (
                      <SelectItem key={building} value={building}>
                        {building}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={floorFilter} onValueChange={setFloorFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Totes les plantes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Totes les plantes</SelectItem>
                    {uniqueFloors.map((floor) => (
                      <SelectItem key={floor} value={floor.toString()}>
                        Planta {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tots els tipus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tots els tipus</SelectItem>
                    {uniqueTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Classroom list */}
              <ScrollArea className="h-64 border rounded-md">
                <div className="p-2 space-y-1">
                  {loading ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                  ) : filteredClassrooms.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      No s'han trobat aules
                    </div>
                  ) : (
                    <>
                      {/* Option to remove all classroom assignments */}
                      {selectedClassrooms.length > 0 && (
                        <div
                          className="flex items-center space-x-2 p-2 rounded-md cursor-pointer bg-amber-50 hover:bg-amber-100 mb-2"
                          onClick={() => setSelectedClassrooms([])}
                        >
                          <Checkbox
                            checked={selectedClassrooms.length === 0}
                            onCheckedChange={() => setSelectedClassrooms([])}
                          />
                          <div className="flex-1">
                            <span className="font-medium text-amber-700">
                              Sense aula assignada
                            </span>
                            <p className="text-xs text-amber-600">
                              Selecciona aquesta opció per eliminar totes les assignacions d'aula
                            </p>
                          </div>
                        </div>
                      )}
                      {/* Classroom list */}
                      {filteredClassrooms.map((classroom) => {
                      const isSelected = selectedClassrooms.includes(classroom.id)
                      const capacityDiff = classroom.capacity - (studentGroup?.capacity || 0)
                      const hasConflict = classroomConflicts[classroom.id]
                      
                      return (
                        <div
                          key={classroom.id}
                          className={cn(
                            "flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-accent",
                            isSelected && "bg-accent",
                            hasConflict && "bg-red-50 hover:bg-red-100"
                          )}
                          onClick={() => {
                            if (hasConflict) return
                            if (isSelected) {
                              setSelectedClassrooms(selectedClassrooms.filter(id => id !== classroom.id))
                            } else {
                              setSelectedClassrooms([...selectedClassrooms, classroom.id])
                            }
                          }}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setSelectedClassrooms([...selectedClassrooms, classroom.id])
                              } else {
                                setSelectedClassrooms(selectedClassrooms.filter(id => id !== classroom.id))
                              }
                            }}
                            disabled={hasConflict}
                          />
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className={cn(
                                "font-medium",
                                hasConflict && "text-red-600"
                              )}>
                                {classroom.code} - {classroom.name}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="text-xs">
                                  {classroom.building} - P{classroom.floor}
                                </Badge>
                                <Badge
                                  variant={capacityDiff >= 0 ? "default" : "destructive"}
                                  className="text-xs"
                                >
                                  {classroom.capacity} places
                                  {capacityDiff >= 0 ? ` (+${capacityDiff})` : ` (${capacityDiff})`}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                  {classroom.type}
                                </Badge>
                              </div>
                            </div>
                            {hasConflict && (
                              <div className="text-xs text-red-600 mt-1">
                                Ocupada per: {hasConflict.subjects?.name || 'Assignatura desconeguda'} 
                                {hasConflict.group_code && ` (${hasConflict.group_code})`}
                                {hasConflict.conflicting_weeks && !isFullSemester && (
                                  <span> - Setmanes: {hasConflict.conflicting_weeks.join(', ')}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                    </>
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
          
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel·lar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || !dayOfWeek || !timePeriod}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingAssignmentId ? "Actualitzar assignació" : 
              selectedClassrooms.length > 0 
                ? `Guardar assignació (${selectedClassrooms.length} ${selectedClassrooms.length === 1 ? 'aula' : 'aules'})`
                : "Guardar assignació"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}