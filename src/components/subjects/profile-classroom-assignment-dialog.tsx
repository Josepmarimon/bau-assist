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
import { Loader2, Trash2, Calendar, Edit, Users } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"
import { Switch } from "@/components/ui/switch"
import { SubjectGroupProfile } from "@/types/subject-group-profiles.types"

interface ProfileClassroomAssignmentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: SubjectGroupProfile
  subjectId: string
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

interface ProfileAssignment {
  id: string
  profile_id: string
  classroom_id: string
  semester_id: string
  time_slot_id: string
  is_full_semester: boolean
  week_range_type?: string
  classroom?: Classroom
  semester?: {
    id: string
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
  weeks?: number[]
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

export function ProfileClassroomAssignmentDialog({
  open,
  onOpenChange,
  profile,
  subjectId,
  onSuccess,
}: ProfileClassroomAssignmentDialogProps) {
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Form state
  const [dayOfWeek, setDayOfWeek] = useState<string>("")
  const [timePeriod, setTimePeriod] = useState<string>("")
  const [selectedClassroom, setSelectedClassroom] = useState<string>("")
  const [searchTerm, setSearchTerm] = useState("")
  const [isFullSemester, setIsFullSemester] = useState(true)
  const [selectedWeeks, setSelectedWeeks] = useState<number[]>([])
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null)
  
  // Data
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [assignments, setAssignments] = useState<ProfileAssignment[]>([])
  const [filteredClassrooms, setFilteredClassrooms] = useState<Classroom[]>([])
  const [classroomConflicts, setClassroomConflicts] = useState<Record<string, any>>({})
  const [semesters, setSemesters] = useState<any[]>([])
  const [selectedSemesterId, setSelectedSemesterId] = useState<string>("")
  const [memberGroups, setMemberGroups] = useState<any[]>([])
  
  // Filters
  const [buildingFilter, setBuildingFilter] = useState<string>("all")
  const [typeFilter, setTypeFilter] = useState<string>("all")
  const [floorFilter, setFloorFilter] = useState<string>("all")
  
  const supabase = createClient()

  // Load profile member groups
  useEffect(() => {
    if (!open || !profile.id) return
    
    const loadMemberGroups = async () => {
      const { data, error } = await supabase
        .from("subject_group_profile_members")
        .select(`
          subject_group_id,
          subject_groups (
            id,
            group_code,
            max_students
          )
        `)
        .eq("profile_id", profile.id)
        
      if (error) {
        console.error("Error loading member groups:", error.message || error)
      } else {
        // Extract subject groups and use max_students as capacity
        const subjectGroups = data?.map(m => m.subject_groups).filter(Boolean) || []
        
        const enrichedGroups = subjectGroups.map((sg: any) => ({
          ...sg,
          capacity: sg.max_students
        }))
        
        setMemberGroups(enrichedGroups)
      }
    }
    
    loadMemberGroups()
  }, [open, profile.id])

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
        if (data.length > 0 && !selectedSemesterId) {
          setSelectedSemesterId(data[0].id)
        }
      }
    }
    
    loadSemesters()
  }, [open])

  // Load existing profile assignments
  useEffect(() => {
    if (!open || !profile.id || !selectedSemesterId) return
    
    const loadAssignments = async () => {
      const { data, error } = await supabase
        .from("profile_classroom_assignments")
        .select(`
          id,
          profile_id,
          classroom_id,
          semester_id,
          time_slot_id,
          is_full_semester,
          week_range_type,
          classrooms (
            id,
            code,
            name,
            building,
            floor,
            capacity,
            type
          ),
          semesters (
            id,
            name,
            academic_years (
              name
            )
          ),
          time_slots (
            day_of_week,
            start_time,
            end_time,
            slot_type
          ),
          profile_assignment_weeks (
            week_number
          )
        `)
        .eq("profile_id", profile.id)
        
      if (error) {
        console.error("Error loading profile assignments:", error)
        return
      }
      
      // Process assignments to include weeks array
      const processedAssignments = (data || []).map((assignment: any) => ({
        ...assignment,
        classroom: assignment.classrooms,
        semester: assignment.semesters,
        time_slot: assignment.time_slots,
        weeks: assignment.profile_assignment_weeks?.map((w: any) => w.week_number) || []
      }))
      
      setAssignments(processedAssignments)
    }
    
    loadAssignments()
  }, [open, profile.id, selectedSemesterId])

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
    if (!dayOfWeek || !timePeriod || classrooms.length === 0 || !selectedSemesterId) return
    
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
      const weekNumbersToCheck = isFullSemester ? Array.from({length: 15}, (_, i) => i + 1) : (selectedWeeks.length > 0 ? selectedWeeks : [1])
      
      // Check conflicts for all classrooms at once
      const conflictMap: Record<string, any> = {}
      
      // Get all regular assignment conflicts
      const { data: regularConflicts } = await supabase
        .rpc('check_all_classroom_conflicts', {
          p_time_slot_id: timeSlot!.id,
          p_week_numbers: weekNumbersToCheck,
          p_exclude_assignment_id: null,
          p_semester_id: selectedSemesterId
        })
      
      // Get all profile assignment conflicts
      const { data: profileConflicts } = await supabase
        .rpc('check_all_profile_classroom_conflicts', {
          p_time_slot_id: timeSlot!.id,
          p_week_numbers: weekNumbersToCheck,
          p_exclude_profile_assignment_id: editingAssignmentId,
          p_semester_id: selectedSemesterId
        })
      
      // Process regular conflicts
      if (regularConflicts) {
        for (const conflict of regularConflicts) {
          conflictMap[conflict.classroom_id] = {
            name: conflict.subject_name,
            group_code: conflict.group_code,
            conflicting_weeks: conflict.conflicting_weeks,
            isProfile: false
          }
        }
      }
      
      // Process profile conflicts (may override regular conflicts)
      if (profileConflicts) {
        for (const conflict of profileConflicts) {
          conflictMap[conflict.classroom_id] = {
            name: conflict.profile_name,
            group_code: null,
            conflicting_weeks: conflict.conflicting_weeks,
            isProfile: true
          }
        }
      }
      
      setClassroomConflicts(conflictMap)
    }
    
    checkConflicts()
  }, [dayOfWeek, timePeriod, classrooms, isFullSemester, selectedWeeks, selectedSemesterId, editingAssignmentId])

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
    
    // Sort by capacity match (prefer classrooms with similar capacity to largest group)
    const maxGroupCapacity = Math.max(...memberGroups.map(g => g.capacity || g.max_students || 0), 0)
    if (maxGroupCapacity > 0) {
      filtered.sort((a, b) => {
        const diffA = Math.abs(a.capacity - maxGroupCapacity)
        const diffB = Math.abs(b.capacity - maxGroupCapacity)
        return diffA - diffB
      })
    }
    
    setFilteredClassrooms(filtered)
  }, [classrooms, searchTerm, buildingFilter, typeFilter, floorFilter, memberGroups])

  const handleSave = async () => {
    if (!dayOfWeek || !timePeriod || !selectedClassroom) {
      setError("Si us plau, selecciona el dia, la franja horària i l'aula")
      return
    }
    
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
      
      // Check for conflicts
      const weekNumbersToCheck = isFullSemester ? Array.from({length: 15}, (_, i) => i + 1) : (selectedWeeks.length > 0 ? selectedWeeks : [1])
      
      const { data: conflicts, error: conflictError } = await supabase
        .rpc('check_profile_classroom_conflicts', {
          p_classroom_id: selectedClassroom,
          p_time_slot_id: timeSlot!.id,
          p_week_numbers: weekNumbersToCheck,
          p_semester_id: selectedSemesterId,
          p_exclude_profile_assignment_id: editingAssignmentId
        })
        
      if (conflictError) throw conflictError
      
      if (conflicts && conflicts.length > 0) {
        const conflict = conflicts[0]
        const conflictingWeeks = conflict.conflicting_weeks
        
        if (isFullSemester) {
          setError(`Solapament d'aula: L'aula ja està assignada en aquest horari al perfil ${conflict.profile_name}`)
        } else {
          setError(`Solapament d'aula: L'aula ja està assignada al perfil ${conflict.profile_name} les setmanes: ${conflictingWeeks.join(', ')}`)
        }
        setSaving(false)
        return
      }
      
      // Create or update profile assignment
      let assignment
      let assignmentError
      
      if (editingAssignmentId) {
        // Update existing assignment
        const { data, error } = await supabase
          .from("profile_classroom_assignments")
          .update({
            classroom_id: selectedClassroom,
            semester_id: selectedSemesterId,
            time_slot_id: timeSlot!.id,
            is_full_semester: isFullSemester,
            week_range_type: isFullSemester ? 'full' : 'specific_weeks',
          })
          .eq("id", editingAssignmentId)
          .select()
          .single()
        
        assignment = data
        assignmentError = error
        
        // Delete existing week assignments to recreate them
        if (!error) {
          await supabase
            .from("profile_assignment_weeks")
            .delete()
            .eq("profile_assignment_id", editingAssignmentId)
        }
      } else {
        // Create new assignment
        const { data, error } = await supabase
          .from("profile_classroom_assignments")
          .insert({
            profile_id: profile.id,
            classroom_id: selectedClassroom,
            semester_id: selectedSemesterId,
            time_slot_id: timeSlot!.id,
            is_full_semester: isFullSemester,
            week_range_type: isFullSemester ? 'full' : 'specific_weeks',
          })
          .select()
          .single()
          
        assignment = data
        assignmentError = error
      }
        
      if (assignmentError) throw assignmentError
      
      // If specific weeks, insert week records
      if (!isFullSemester && selectedWeeks.length > 0) {
        const weekRecords = selectedWeeks.map(weekNumber => ({
          profile_assignment_id: assignment.id,
          week_number: weekNumber
        }))
        
        const { error: weeksError } = await supabase
          .from("profile_assignment_weeks")
          .insert(weekRecords)
          
        if (weeksError) throw weeksError
      }
      
      // Now create/update assignments for all member groups
      for (const memberGroup of memberGroups) {
        // Check if this group already has an assignment for this time slot
        const { data: existingAssignment } = await supabase
          .from("assignments")
          .select("id")
          .eq("subject_group_id", memberGroup.id)
          .eq("time_slot_id", timeSlot!.id)
          .eq("semester_id", selectedSemesterId)
          .single()
        
        let groupAssignment
        
        if (existingAssignment) {
          // Update existing assignment
          const { data, error } = await supabase
            .from("assignments")
            .update({
              hours_per_week: timePeriod === "mati" ? 6 : 5,
            })
            .eq("id", existingAssignment.id)
            .select()
            .single()
          
          if (error) throw error
          groupAssignment = data
          
          // Delete existing classroom assignments
          await supabase
            .from("assignment_classrooms")
            .delete()
            .eq("assignment_id", existingAssignment.id)
        } else {
          // Create new assignment
          const { data, error } = await supabase
            .from("assignments")
            .insert({
              semester_id: selectedSemesterId,
              subject_id: subjectId,
              subject_group_id: memberGroup.id,
              time_slot_id: timeSlot!.id,
              hours_per_week: timePeriod === "mati" ? 6 : 5,
            })
            .select()
            .single()
            
          if (error) throw error
          groupAssignment = data
        }
        
        // Create classroom assignment
        const { data: classroomAssignment, error: classroomAssignmentError } = await supabase
          .from("assignment_classrooms")
          .insert({
            assignment_id: groupAssignment.id,
            classroom_id: selectedClassroom,
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
      
      // Reload assignments
      const { data: updatedAssignments } = await supabase
        .from("profile_classroom_assignments")
        .select(`
          id,
          profile_id,
          classroom_id,
          semester_id,
          time_slot_id,
          is_full_semester,
          week_range_type,
          classrooms (
            id,
            code,
            name,
            building,
            floor,
            capacity,
            type
          ),
          semesters (
            id,
            name,
            academic_years (
              name
            )
          ),
          time_slots (
            day_of_week,
            start_time,
            end_time,
            slot_type
          ),
          profile_assignment_weeks (
            week_number
          )
        `)
        .eq("profile_id", profile.id)
        
      // Process updated assignments
      const processedUpdatedAssignments = (updatedAssignments || []).map((assignment: any) => ({
        ...assignment,
        classroom: assignment.classrooms,
        semester: assignment.semesters,
        time_slot: assignment.time_slots,
        weeks: assignment.profile_assignment_weeks?.map((w: any) => w.week_number) || []
      }))
      
      setAssignments(processedUpdatedAssignments)
      
      // Reset form
      setDayOfWeek("")
      setTimePeriod("")
      setSelectedClassroom("")
      setIsFullSemester(true)
      setSelectedWeeks([])
      setEditingAssignmentId(null)
      
      // Call success callback
      if (onSuccess) {
        onSuccess()
      }
      
    } catch (error: any) {
      console.error("Error saving profile assignment:", error.message || error)
      setError(error.message || "Error al guardar l'assignació del perfil")
    } finally {
      setSaving(false)
    }
  }
  
  const handleEdit = (assignment: ProfileAssignment) => {
    setEditingAssignmentId(assignment.id)
    
    if (assignment.time_slot) {
      setDayOfWeek(assignment.time_slot.day_of_week.toString())
      setTimePeriod(assignment.time_slot.slot_type)
    }
    
    if (assignment.classroom) {
      setSelectedClassroom(assignment.classroom.id)
    }
    
    if (!assignment.is_full_semester && assignment.weeks && assignment.weeks.length > 0) {
      setIsFullSemester(false)
      setSelectedWeeks(assignment.weeks)
    } else {
      setIsFullSemester(true)
      setSelectedWeeks([])
    }
    
    if (assignment.semester_id) {
      setSelectedSemesterId(assignment.semester_id)
    }
  }

  const handleDelete = async (assignmentId: string) => {
    if (!confirm("Estàs segur que vols eliminar aquesta assignació? Això també eliminarà les assignacions de tots els grups del perfil.")) return
    
    try {
      // Get the assignment details first
      const assignment = assignments.find(a => a.id === assignmentId)
      if (!assignment) return
      
      // Delete assignments for all member groups
      for (const memberGroup of memberGroups) {
        await supabase
          .from("assignments")
          .delete()
          .eq("subject_group_id", memberGroup.id)
          .eq("time_slot_id", assignment.time_slot_id)
          .eq("semester_id", assignment.semester_id)
      }
      
      // Delete the profile assignment
      const { error } = await supabase
        .from("profile_classroom_assignments")
        .delete()
        .eq("id", assignmentId)
        
      if (error) {
        console.error("Error deleting profile assignment:", error.message || error)
        setError("Error al eliminar l'assignació del perfil")
      } else {
        setAssignments(assignments.filter(a => a.id !== assignmentId))
        if (editingAssignmentId === assignmentId) {
          setEditingAssignmentId(null)
        }
      }
    } catch (error: any) {
      console.error("Error deleting assignments:", error.message || error)
      setError("Error al eliminar les assignacions")
    }
  }

  const uniqueBuildings = [...new Set(classrooms.map((c) => c.building).filter(Boolean))]
  const uniqueTypes = [...new Set(classrooms.map((c) => c.type).filter(Boolean))]
  const uniqueFloors = [...new Set(classrooms.map((c) => c.floor).filter(f => f !== null && f !== undefined))].sort((a, b) => a - b)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Assignar Aules al Perfil - {profile.name}</DialogTitle>
          <DialogDescription>
            {profile.description || "Assigna aules a tots els grups d'aquest perfil"}
          </DialogDescription>
        </DialogHeader>
        
        {/* Group info */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground px-6 pb-2">
          <Users className="h-4 w-4" />
          <span>{memberGroups.length} grups en aquest perfil</span>
          {memberGroups.length > 0 && (
            <span>
              ({memberGroups.map(g => g.group_code).join(", ")})
            </span>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto space-y-6 py-4">
          {/* Existing assignments */}
          {assignments.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Assignacions actuals del perfil</h3>
              
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
                            {assignment.classroom && (
                              <Badge variant="outline">
                                {assignment.classroom.code} - {assignment.classroom.name}
                              </Badge>
                            )}
                          </div>
                          {isFromDifferentSemester && assignment.semester && (
                            <div className="flex items-center gap-1 text-xs text-amber-700">
                              <span className="font-medium">
                                Semestre: {assignment.semester.academic_years?.name} - {assignment.semester.name}
                              </span>
                            </div>
                          )}
                          {!assignment.is_full_semester && assignment.weeks && assignment.weeks.length > 0 && (
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              <span>
                                Setmanes: {assignment.weeks.sort((a, b) => a - b).join(', ')}
                              </span>
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
                    setSelectedClassroom("")
                    setIsFullSemester(true)
                    setSelectedWeeks([])
                  }}
                >
                  Cancel·lar edició
                </Button>
              )}
            </div>
            
            {/* Semester selector */}
            {semesters.length > 0 && (
              <div className="space-y-2">
                <Label>Semestre</Label>
                <Select value={selectedSemesterId} onValueChange={setSelectedSemesterId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un semestre" />
                  </SelectTrigger>
                  <SelectContent>
                    {semesters.map((semester) => (
                      <SelectItem key={semester.id} value={semester.id}>
                        {semester.academic_years?.name} - {semester.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Dia de la setmana</Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS.map((day) => (
                      <SelectItem key={day.value} value={day.value.toString()}>
                        {day.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label>Franja horària</Label>
                <Select value={timePeriod} onValueChange={setTimePeriod}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una franja" />
                  </SelectTrigger>
                  <SelectContent>
                    {TIME_PERIODS.map((period) => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            {/* Week selection */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Assignació temporal</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={!isFullSemester}
                    onCheckedChange={(checked) => {
                      setIsFullSemester(!checked)
                      if (!checked) {
                        setSelectedWeeks([])
                      }
                    }}
                  />
                  <Label className="text-sm font-normal">
                    Només setmanes específiques
                  </Label>
                </div>
              </div>
              
              {!isFullSemester && (
                <div className="space-y-2">
                  <Label>Selecciona les setmanes (1-15)</Label>
                  <div className="grid grid-cols-5 gap-2">
                    {Array.from({ length: 15 }, (_, i) => i + 1).map((week) => (
                      <div
                        key={week}
                        className={cn(
                          "flex items-center justify-center p-2 border rounded-md cursor-pointer transition-colors",
                          selectedWeeks.includes(week)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "hover:bg-accent hover:text-accent-foreground"
                        )}
                        onClick={() => {
                          if (selectedWeeks.includes(week)) {
                            setSelectedWeeks(selectedWeeks.filter((w) => w !== week))
                          } else {
                            setSelectedWeeks([...selectedWeeks, week].sort((a, b) => a - b))
                          }
                        }}
                      >
                        <span className="text-sm font-medium">{week}</span>
                      </div>
                    ))}
                  </div>
                  {selectedWeeks.length > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-sm text-muted-foreground">
                        Setmanes seleccionades: {selectedWeeks.join(', ')}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedWeeks([])}
                      >
                        Esborrar
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Classroom selection */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Cerca aula</Label>
                <Input
                  placeholder="Cerca per codi o nom..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              {/* Filters */}
              <div className="flex gap-2">
                <Select value={buildingFilter} onValueChange={setBuildingFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Edifici" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tots</SelectItem>
                    {uniqueBuildings.map((building) => (
                      <SelectItem key={building} value={building}>
                        {building}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={floorFilter} onValueChange={setFloorFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Planta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Totes</SelectItem>
                    {uniqueFloors.map((floor) => (
                      <SelectItem key={floor} value={floor.toString()}>
                        Planta {floor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Tipus" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tots</SelectItem>
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
                    filteredClassrooms.map((classroom) => {
                      const isSelected = selectedClassroom === classroom.id
                      const maxGroupCapacity = Math.max(...memberGroups.map(g => g.capacity || g.max_students || 0), 0)
                      const capacityDiff = classroom.capacity - maxGroupCapacity
                      const hasConflict = classroomConflicts[classroom.id]
                      
                      return (
                        <div
                          key={classroom.id}
                          className={cn(
                            "flex items-center space-x-2 p-2 rounded-md cursor-pointer hover:bg-accent",
                            isSelected && "bg-accent",
                            hasConflict && "bg-red-50 hover:bg-red-100"
                          )}
                          onClick={() => setSelectedClassroom(classroom.id)}
                        >
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => setSelectedClassroom(classroom.id)}
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
                                Ocupada per: {hasConflict.name}
                                {hasConflict.group_code && ` (${hasConflict.group_code})`}
                                {hasConflict.isProfile && " [Perfil]"}
                                {hasConflict.conflicting_weeks && !isFullSemester && (
                                  <span> - Setmanes: {hasConflict.conflicting_weeks.join(', ')}</span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })
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
            disabled={saving || !dayOfWeek || !timePeriod || !selectedClassroom}
          >
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingAssignmentId ? "Actualitzar assignació" : "Guardar assignació"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}