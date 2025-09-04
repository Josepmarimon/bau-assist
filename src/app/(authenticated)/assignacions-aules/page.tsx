'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Input } from '@/components/ui/input'
import { createClient } from '@/lib/supabase/client'
import { 
  Calendar,
  Building2,
  Users,
  Clock,
  GraduationCap,
  Undo,
  Redo,
  Download,
  BookOpen,
  ChevronRight,
  ChevronDown,
  X
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverEvent,
  useDraggable,
  useDroppable
} from '@dnd-kit/core'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ClassroomConflictDialog } from '@/components/classrooms/classroom-conflict-dialog'
import { AssignmentWeeksDialog } from '@/components/schedules/assignment-weeks-dialog'

// Types
interface Subject {
  id: string
  code: string
  name: string
  credits: number
  year: number
  type: string
  semester?: string
}

interface StudentGroup {
  id: string
  name: string
  year: number
  shift: 'mati' | 'tarda'
  max_students: number
  degree_id?: string
}

interface Classroom {
  id: string
  code: string
  name: string
  capacity: number
  type: string | null
  equipment?: string[]
  building: string | null
}

interface Teacher {
  id: string
  first_name: string
  last_name: string
  email: string
}

interface TimeSlot {
  id: string
  day_of_week: number
  start_time: string
  end_time: string
  slot_type: 'full' | 'first' | 'second'
}

interface Assignment {
  id: string
  subject: Subject
  student_group: StudentGroup
  classroom: Classroom | null  // Deprecated, kept for compatibility
  classrooms?: Classroom[]      // New: array of classrooms
  time_slot: TimeSlot
  teacher: Teacher | null
  day_of_week: number
  assignment_classrooms?: Array<{
    classroom: Classroom
    is_full_semester: boolean
    weeks: number[]
  }>
}

// Draggable Subject Component
function DraggableSubject({ subject, remainingHours }: { subject: Subject, remainingHours?: number }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: subject.id,
    data: { type: 'subject', subject }
  })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  const totalHours = subject.credits || 6
  const hoursToShow = remainingHours !== undefined ? remainingHours : totalHours

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-white p-3 rounded-lg border shadow-sm cursor-grab",
        "hover:shadow-md transition-all duration-200",
        isDragging && "cursor-grabbing"
      )}
    >
      <div className="font-medium text-sm">{subject.name}</div>
    </div>
  )
}

/*
 * IMPORTANT: Teacher Assignment Loading
 * 
 * This component loads teacher data through the assignments table.
 * DO NOT use the assignments_with_teachers view as it causes RLS recursion errors.
 * 
 * The correct approach:
 * 1. Query assignments table directly
 * 2. Include teachers through foreign key: teachers!teacher_id (...)
 * 3. Teacher data is synced from teacher_group_assignments via database triggers
 * 
 * See docs/TEACHER_ASSIGNMENTS_ARCHITECTURE.md for full details
 */
export default function AssignacionsAulesPage() {
  const supabase = createClient()
  
  // Filter states
  const [selectedDegree, setSelectedDegree] = useState<string>('')
  const [selectedYear, setSelectedYear] = useState<string>('')
  const [selectedGroup, setSelectedGroup] = useState<string>('')
  const [selectedSemester, setSelectedSemester] = useState<string>('')
  
  // Data states
  const [degrees, setDegrees] = useState<{value: string, label: string}[]>([])
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classrooms, setClassrooms] = useState<Classroom[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [loading, setLoading] = useState(false)
  const [classroomSearchTerm, setClassroomSearchTerm] = useState<string>('')
  const [collapsedClassroomTypes, setCollapsedClassroomTypes] = useState<Set<string>>(new Set())
  const [currentSemesterId, setCurrentSemesterId] = useState<string | null>(null)
  
  // Drag states
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragType, setDragType] = useState<'subject' | 'classroom' | 'assignment' | null>(null)
  const [dropZone, setDropZone] = useState<'full' | 'first' | 'second'>('full')
  const dropZoneRef = useRef<'full' | 'first' | 'second'>('full')
  
  // Conflict dialog states
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [currentConflicts, setCurrentConflicts] = useState<any[]>([])
  const [pendingClassroomAssignment, setPendingClassroomAssignment] = useState<{
    assignmentId: string
    classroomId: string
    classroom: Classroom
  } | null>(null)
  
  // Weeks dialog states
  const [weeksDialogOpen, setWeeksDialogOpen] = useState(false)
  const [selectedAssignmentForWeeks, setSelectedAssignmentForWeeks] = useState<Assignment | null>(null)
  
  // Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Load initial data
  useEffect(() => {
    loadDegrees()
    loadClassrooms()
  }, [])
  
  // Add event listener for week editing
  useEffect(() => {
    const handleEditWeeks = (e: any) => {
      const assignment = e.detail as Assignment
      setSelectedAssignmentForWeeks(assignment)
      setWeeksDialogOpen(true)
    }
    
    const pageEl = document.querySelector('[data-assignment-page]')
    if (pageEl) {
      pageEl.addEventListener('editAssignmentWeeks', handleEditWeeks)
      return () => {
        pageEl.removeEventListener('editAssignmentWeeks', handleEditWeeks)
      }
    }
  }, [])

  // Load groups when degree and year change
  useEffect(() => {
    if (selectedDegree && selectedYear) {
      loadGroups()
    }
  }, [selectedDegree, selectedYear])

  // Load subjects when group changes
  useEffect(() => {
    if (selectedGroup && selectedSemester) {
      loadSubjectsForGroup()
    }
  }, [selectedGroup, selectedSemester])

  // Load assignments when group or semester changes
  useEffect(() => {
    if (selectedGroup && selectedSemester) {
      loadAssignments()
    }
  }, [selectedGroup, selectedSemester])

  const loadDegrees = async () => {
    try {
      // Get all unique degree prefixes from student groups
      const { data: groupsData, error } = await supabase
        .from('student_groups')
        .select('name')
        .order('name')

      if (error) {
        console.error('Error loading degrees:', error)
        return
      }

      if (groupsData) {
        // Extract unique degree prefixes
        const degreeMap = new Map<string, string>()
        
        groupsData.forEach(group => {
          // Match both uppercase patterns (GR, GB) and mixed case patterns (Gr)
          const match = group.name.match(/^(G[A-Z]+|Gr)/i)
          if (match) {
            const prefix = match[1]
            // Normalize to uppercase for consistency
            const normalizedPrefix = prefix.toUpperCase()
            if (!degreeMap.has(normalizedPrefix)) {
              // Map prefixes to full names
              switch(normalizedPrefix) {
                case 'GR':
                  degreeMap.set(normalizedPrefix, 'Grau en Disseny')
                  break
                case 'GB':
                  degreeMap.set(normalizedPrefix, 'Grau en Belles Arts')
                  break
                default:
                  degreeMap.set(normalizedPrefix, normalizedPrefix)
              }
            }
          }
        })

        const degreesArray = Array.from(degreeMap, ([value, label]) => ({ value, label }))
        setDegrees(degreesArray.sort((a, b) => a.label.localeCompare(b.label)))
      }
    } catch (error) {
      console.error('Error in loadDegrees:', error)
    }
  }

  const loadGroups = async () => {
    try {
      console.log('Loading groups for degree:', selectedDegree, 'year:', selectedYear)
      
      // Build the query based on the selected year
      let query = supabase
        .from('student_groups')
        .select('*')
        .eq('year', parseInt(selectedYear))
        .order('name')

      // For year 2, we need to handle both regular groups (GR2_M, etc.) and itinerary groups (Gr2-Im, Gr2-Gm)
      if (selectedYear === '2' && selectedDegree === 'GR') {
        // For Design degree year 2, include both GR2 groups and Gr2- itinerary groups
        query = query.or(`name.ilike.GR2%,name.ilike.Gr2-%`)
      } else {
        // For other years or degrees, just use the standard pattern
        query = query.ilike('name', `${selectedDegree}%`)
      }

      const { data: groupsData, error } = await query

      if (error) {
        console.error('Error loading groups:', error)
        return
      }

      if (groupsData) {
        console.log('Groups loaded:', groupsData.map(g => g.name))
        setStudentGroups(groupsData)
      }
    } catch (error) {
      console.error('Error in loadGroups:', error)
    }
  }

  const loadClassrooms = async () => {
    const { data: classroomsData, error } = await supabase
      .from('classrooms')
      .select('*')
      .order('code')

    if (classroomsData) {
      setClassrooms(classroomsData)
      
      // Initialize all classroom types as collapsed
      const types = new Set<string>()
      classroomsData.forEach(classroom => {
        types.add(classroom.type || 'Altres')
      })
      setCollapsedClassroomTypes(types)
    }
  }

  const loadSubjectsForGroup = async () => {
    try {
      setLoading(true)
      
      // Find the selected group's code
      const selectedGroupData = studentGroups.find(g => g.id === selectedGroup)
      if (!selectedGroupData) {
        console.error('Selected group not found')
        return
      }

      console.log('Loading subjects for group:', selectedGroupData.name)
      
      // Load subjects that have subject_groups matching this student group's name
      // Both regular groups (GR2-M1) and itinerary groups (GR2-Im) use the full name as group_code
      const { data: subjectGroupsData, error } = await supabase
        .from('subject_groups')
        .select(`
          subject:subjects(*)
        `)
        .eq('group_code', selectedGroupData.name)

      console.log('Subject groups data:', subjectGroupsData, 'Error:', error)

      if (subjectGroupsData && subjectGroupsData.length > 0) {
        // Extract unique subjects
        const uniqueSubjects = new Map<string, Subject>()
        
        subjectGroupsData.forEach(sg => {
          const subject = Array.isArray(sg.subject) ? sg.subject[0] : sg.subject
          if (subject && subject.id) {
            // Filter by semester
            // Subject semester field contains "1r", "2n", or "1r i 2n"
            const semesterMap = { '1': '1r', '2': '2n' }
            const selectedSemesterText = semesterMap[selectedSemester as keyof typeof semesterMap]
            
            if (!subject.semester || 
                subject.semester === selectedSemesterText || 
                subject.semester === '1r i 2n') {
              uniqueSubjects.set(subject.id, subject)
            }
          }
        })
        
        const subjectsArray = Array.from(uniqueSubjects.values())
        setSubjects(subjectsArray.sort((a, b) => a.name.localeCompare(b.name)))
      }
    } catch (error) {
      console.error('Error loading subjects:', error)
      setSubjects([])
    } finally {
      setLoading(false)
    }
  }

  const loadAssignments = async () => {
    try {
      
      // Find the semester ID from the selected semester for the current academic year
      const { data: semesters, error: semesterError } = await supabase
        .from('semesters')
        .select('id')
        .eq('number', parseInt(selectedSemester))
        .eq('academic_year_id', '2b210161-5447-4494-8003-f09a0b553a3f') // 2025-2026
        .single()
      
      if (semesterError) {
        console.error('Error finding semester:', semesterError)
        return
      }
      
      // Store the current semester ID
      setCurrentSemesterId(semesters?.id || null)
      
      // Load existing assignments for this group and semester
      const { data: assignmentsData, error } = await supabase
        .from('assignments')
        .select(`
          id,
          hours_per_week,
          subject_id,
          subject_group_id,
          student_group_id,
          classroom_id,
          time_slot_id,
          teacher_id,
          semester_id,
          subjects!subject_id (*),
          student_groups!student_group_id (*),
          classrooms!classroom_id (*),
          time_slots!time_slot_id (*),
          teachers!teacher_id (id, first_name, last_name, email)
        `)
        .eq('student_group_id', selectedGroup)
        .eq('semester_id', semesters?.id)

      if (error) {
        console.error('Error loading assignments:', error)
        return
      }

      if (assignmentsData) {
        // Check if any assignments are missing teachers and trigger sync if needed
        const assignmentsWithoutTeacher = assignmentsData.filter(a => 
          !a.teacher_id && a.subject_group_id
        )
        
        if (assignmentsWithoutTeacher.length > 0) {
          console.log(`Found ${assignmentsWithoutTeacher.length} assignments without teachers. Triggering sync...`)
          
          // Call the sync function to fix missing teachers
          const { data: syncResult, error: syncError } = await supabase
            .rpc('sync_all_teachers')
          
          if (syncError) {
            console.error('Error syncing teachers:', syncError)
          } else {
            console.log(`Teacher sync completed. Updated ${syncResult} assignments.`)
            
            // Reload assignments after sync
            if (syncResult > 0) {
              const { data: refreshedData } = await supabase
                .from('assignments')
                .select(`
                  id,
                  hours_per_week,
                  subject_id,
                  subject_group_id,
                  student_group_id,
                  classroom_id,
                  time_slot_id,
                  teacher_id,
                  semester_id,
                  subjects!subject_id (*),
                  student_groups!student_group_id (*),
                  classrooms!classroom_id (*),
                  time_slots!time_slot_id (*),
                  teachers!teacher_id (id, first_name, last_name, email)
                `)
                .eq('student_group_id', selectedGroup)
                .eq('semester_id', semesters?.id)
              
              if (refreshedData) {
                assignmentsData.splice(0, assignmentsData.length, ...refreshedData)
              }
            }
          }
        }
        
        // Load classrooms for each assignment from the new junction table
        const assignmentIds = assignmentsData.map(a => a.id)
        
        const { data: assignmentClassrooms, error: classroomsError } = await supabase
          .from('assignment_classrooms')
          .select(`
            assignment_id,
            is_full_semester,
            classrooms (*),
            assignment_classroom_weeks (
              week_number
            )
          `)
          .in('assignment_id', assignmentIds)
        
        if (classroomsError) {
          console.error('Error loading assignment classrooms:', classroomsError)
        }
        
        // Group classrooms by assignment_id with week information
        const classroomsByAssignment: Record<string, Classroom[]> = {}
        const assignmentClassroomDetails: Record<string, any[]> = {}
        
        if (assignmentClassrooms) {
          assignmentClassrooms.forEach(ac => {
            if (!classroomsByAssignment[ac.assignment_id]) {
              classroomsByAssignment[ac.assignment_id] = []
            }
            if (!assignmentClassroomDetails[ac.assignment_id]) {
              assignmentClassroomDetails[ac.assignment_id] = []
            }
            
            if (ac.classrooms && !Array.isArray(ac.classrooms)) {
              classroomsByAssignment[ac.assignment_id].push(ac.classrooms as Classroom)
              
              // Store detailed classroom info with weeks
              assignmentClassroomDetails[ac.assignment_id].push({
                classroom: ac.classrooms as Classroom,
                is_full_semester: ac.is_full_semester,
                weeks: ac.assignment_classroom_weeks?.map((w: any) => w.week_number) || []
              })
            }
          })
        }
        
        // Transform data
        const transformedAssignments = assignmentsData.map(a => {
          return {
            id: a.id,
            subject: !Array.isArray(a.subjects) ? a.subjects : a.subjects[0],
            student_group: !Array.isArray(a.student_groups) ? a.student_groups : a.student_groups[0],
            classroom: !Array.isArray(a.classrooms) ? a.classrooms : a.classrooms[0], // Keep for backwards compatibility
            classrooms: classroomsByAssignment[a.id] || [], // New: array of classrooms
            assignment_classrooms: assignmentClassroomDetails[a.id] || [], // New: detailed classroom info with weeks
            time_slot: !Array.isArray(a.time_slots) ? a.time_slots : a.time_slots[0],
            teacher: !Array.isArray(a.teachers) ? a.teachers : a.teachers[0],
            day_of_week: a.time_slots && typeof a.time_slots === 'object' && !Array.isArray(a.time_slots) && 'day_of_week' in a.time_slots ? (a.time_slots as any).day_of_week : undefined
          }
        })
        
        console.log('Assignments with multiple classrooms:', transformedAssignments)
        setAssignments(transformedAssignments as Assignment[])
      }
    } catch (error) {
      console.error('Error loading assignments:', error)
      setAssignments([])
    }
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
    const dragData = event.active.data.current
    setDragType(dragData?.type || null)
    // Reset zone when starting a new drag
    setDropZone('full')
  }

  const handleDragOver = (event: DragOverEvent) => {
    if (!event.over) return
    
    const overData = event.over.data.current
    if (overData?.zone) {
      setDropZone(overData.zone)
      dropZoneRef.current = overData.zone
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    console.log('Drag ended:', { 
      activeId: active.id, 
      overId: over?.id,
      dragType: active.data.current?.type,
      dropType: over?.data.current?.type
    })
    
    if (!over) {
      setActiveId(null)
      setDragType(null)
      return
    }

    const dragData = active.data.current
    const dropData = over.data.current

    // Handle subject being dropped on a time slot
    if (dragData?.type === 'subject' && dropData?.type === 'time-slot') {
      const zone = dropData.zone || dropZoneRef.current
      console.log('Creating assignment with zone from dropData:', zone)
      await createAssignment(dragData.subject, dropData.day, dropData.shift, zone)
    }
    
    // Handle classroom being dropped on an assignment
    else if (dragData?.type === 'classroom' && dropData?.type === 'assignment') {
      await updateAssignmentClassroom(dropData.assignmentId, dragData.classroom.id)
    }

    setActiveId(null)
    setDragType(null)
    setDropZone('full')
  }

  const createAssignment = async (subject: Subject, day: number, shift: 'morning' | 'afternoon', zone: 'full' | 'first' | 'second') => {
    try {
      let startTime: string, endTime: string
      const slotType = shift === 'morning' ? 'mati' : 'tarda'
      
      if (shift === 'morning') {
        switch (zone) {
          case 'first':
            startTime = '09:00'
            endTime = '11:00'
            break
          case 'second':
            startTime = '11:30'
            endTime = '14:30'
            break
          default: // 'full'
            startTime = '09:00'
            endTime = '14:30'
        }
      } else {
        switch (zone) {
          case 'first':
            startTime = '15:00'
            endTime = '17:00'
            break
          case 'second':
            startTime = '17:30'
            endTime = '19:30'
            break
          default: // 'full'
            startTime = '15:00'
            endTime = '19:30'
        }
      }

      console.log('Creating assignment:', {
        subject: subject.name,
        day,
        shift,
        zone,
        startTime,
        endTime
      })

      // Check if time slot exists, if not create it
      const { data: timeSlots, error: timeSlotError } = await supabase
        .from('time_slots')
        .select('*')
        .eq('day_of_week', day)
        .eq('start_time', startTime)
        .eq('end_time', endTime)
        .eq('slot_type', slotType)

      if (timeSlotError) {
        console.error('Error checking time slots:', timeSlotError)
        return
      }

      let timeSlotId = timeSlots && timeSlots.length > 0 ? timeSlots[0].id : null

      if (!timeSlotId) {
        const { data: newTimeSlot, error: createError } = await supabase
          .from('time_slots')
          .insert({
            day_of_week: day,
            start_time: startTime,
            end_time: endTime,
            slot_type: slotType
          })
          .select()
          .single()
        
        if (createError) {
          console.error('Error creating time slot:', createError)
          return
        }
        
        timeSlotId = newTimeSlot?.id
      }

      // Create assignment
      if (!timeSlotId) {
        console.error('No time slot ID found!')
        return
      }
      
      console.log('Creating assignment with:', {
        subject_id: subject.id,
        student_group_id: selectedGroup,
        time_slot_id: timeSlotId
      })
      
      // Find the semester ID from the selected semester for the current academic year
      const { data: semesters, error: semesterError } = await supabase
        .from('semesters')
        .select('id')
        .eq('number', parseInt(selectedSemester))
        .eq('academic_year_id', '2b210161-5447-4494-8003-f09a0b553a3f') // 2025-2026
        .single()
      
      if (semesterError) {
        console.error('Error finding semester:', semesterError)
        return
      }
      
      console.log('Found semester ID:', semesters?.id)
      
      // Get selected group data to find subject group
      const selectedGroupData = studentGroups.find(g => g.id === selectedGroup)
      console.log('Selected group data:', selectedGroupData)
      
      // Find the subject group ID for this subject and student group
      const { data: subjectGroup, error: sgError } = await supabase
        .from('subject_groups')
        .select('id')
        .eq('subject_id', subject.id)
        .eq('group_code', selectedGroupData?.name)
        .single()

      if (sgError) {
        console.error('Error finding subject group:', sgError)
        return
      }

      console.log('Found subject group ID:', subjectGroup?.id)

      // Check if assignment already exists for this time slot and semester
      const { data: existingAssignment } = await supabase
        .from('assignments')
        .select(`
          id, 
          subject_id,
          subjects!subject_id (name)
        `)
        .eq('student_group_id', selectedGroup)
        .eq('time_slot_id', timeSlotId)
        .eq('semester_id', semesters?.id)
        .maybeSingle()

      if (existingAssignment) {
        const existingSubjectName = (existingAssignment.subjects as any)?.name || 'Assignatura desconeguda'
        alert(`Ja existeix una assignació en aquest horari per al grup seleccionat:\n\n${existingSubjectName}\n\nSi vols canviar-la, primer elimina l'assignació existent.`)
        console.error('An assignment already exists for this time slot and group')
        console.log('Existing assignment:', existingAssignment)
        return
      }

      const assignmentData = {
        subject_id: subject.id,
        subject_group_id: subjectGroup?.id,
        student_group_id: selectedGroup,
        time_slot_id: timeSlotId,
        semester_id: semesters?.id,
        hours_per_week: subject.credits || 6
        // Removed created_by to avoid RLS recursion issues
      }

      console.log('Creating assignment with data:', assignmentData)
      
      // Validate all required fields
      if (!assignmentData.subject_id || !assignmentData.student_group_id || 
          !assignmentData.time_slot_id || !assignmentData.semester_id) {
        console.error('Missing required fields:', {
          subject_id: assignmentData.subject_id,
          student_group_id: assignmentData.student_group_id,
          time_slot_id: assignmentData.time_slot_id,
          semester_id: assignmentData.semester_id
        })
        alert('Error: Falten dades obligatòries per crear l\'assignació.')
        return
      }

      // Use RPC function to bypass RLS issues
      const { data, error } = await supabase
        .rpc('create_assignment_bypass_rls', {
          p_subject_id: assignmentData.subject_id,
          p_subject_group_id: assignmentData.subject_group_id,
          p_student_group_id: assignmentData.student_group_id,
          p_time_slot_id: assignmentData.time_slot_id,
          p_semester_id: assignmentData.semester_id,
          p_hours_per_week: assignmentData.hours_per_week
        })

      if (error) {
        console.error('Error creating assignment:', error.message || error)
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        })
        
        // Show user-friendly error message
        let errorMessage = 'Error al crear l\'assignació: '
        if (error.code === '23505') {
          errorMessage += 'Ja existeix una assignació per aquest horari.'
        } else if (error.code === '23503') {
          errorMessage += 'Dades invàlides. Comprova que l\'assignatura i el grup són correctes.'
        } else if (error.message) {
          errorMessage += error.message
        } else {
          errorMessage += 'Error desconegut. Comprova la consola per més detalls.'
        }
        
        alert(errorMessage)
      } else {
        console.log('Assignment created successfully:', data)
        // Reload assignments to show the new one
        await loadAssignments()
      }
    } catch (error) {
      console.error('Error in createAssignment:', error)
    }
  }

  const updateAssignmentClassroom = async (assignmentId: string, classroomId: string, skipConflictCheck = false) => {
    try {
      // Check if this classroom is already assigned
      const { data: existing, error: checkError } = await supabase
        .from('assignment_classrooms')
        .select('id')
        .eq('assignment_id', assignmentId)
        .eq('classroom_id', classroomId)
        .maybeSingle()
      
      if (checkError) {
        console.error('Error checking existing assignment:', checkError)
        // Continue anyway, the insert will fail if it already exists
      }
      
      if (existing) {
        console.log('Classroom already assigned to this assignment')
        return
      }
      
      // Get the classroom details
      const { data: classroomData, error: classroomError } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', classroomId)
        .single()
      
      if (classroomError || !classroomData) {
        console.error('Error fetching classroom:', classroomError)
        return
      }
      
      // Get the assignment details to check for conflicts
      const { data: assignmentData, error: assignmentError } = await supabase
        .from('assignments')
        .select(`
          id,
          time_slot_id,
          semester_id,
          subject_id,
          subjects!subject_id (name)
        `)
        .eq('id', assignmentId)
        .single()
      
      if (assignmentError || !assignmentData) {
        console.error('Error fetching assignment:', assignmentError)
        alert('Error al obtenir la información de la assignació')
        return
      }
      
      // Skip conflict check if explicitly requested (when accepting overlap)
      if (!skipConflictCheck) {
        // Check for classroom conflicts using the database function
        const allWeeks = Array.from({ length: 15 }, (_, i) => i + 1)
        const { data: conflicts, error: conflictError } = await supabase
          .rpc('check_classroom_week_conflicts', {
            p_classroom_id: classroomId,
            p_time_slot_id: assignmentData.time_slot_id,
            p_week_numbers: allWeeks,
            p_exclude_assignment_id: null,
            p_semester_id: assignmentData.semester_id
          })
        
        if (conflictError) {
          console.error('Error checking conflicts:', conflictError)
          alert('Error al comprovar conflictes d\'aula')
          return
        }
        
        // If there are conflicts, show the dialog
        if (conflicts && conflicts.length > 0) {
          setPendingClassroomAssignment({
            assignmentId,
            classroomId,
            classroom: classroomData
          })
          setCurrentConflicts(conflicts)
          setConflictDialogOpen(true)
          return
        }
      }
      
      // Add the new classroom to the assignment
      const { error } = await supabase
        .from('assignment_classrooms')
        .insert({
          assignment_id: assignmentId,
          classroom_id: classroomId,
          is_full_semester: true,
          week_range_type: 'full'
        })
      
      if (error) {
        console.error('Error adding classroom:', error)
        alert('Error al assignar l\'aula')
      } else {
        console.log('Classroom added successfully')
        await loadAssignments()
      }
    } catch (error) {
      console.error('Error in updateAssignmentClassroom:', error)
      alert('Error inesperat al assignar l\'aula')
    }
  }

  const handleAcceptOverlap = async () => {
    if (!pendingClassroomAssignment) return
    
    setConflictDialogOpen(false)
    await updateAssignmentClassroom(
      pendingClassroomAssignment.assignmentId,
      pendingClassroomAssignment.classroomId,
      true // Skip conflict check
    )
    setPendingClassroomAssignment(null)
    setCurrentConflicts([])
  }

  const handleSelectAlternative = async (alternativeClassroomId: string) => {
    if (!pendingClassroomAssignment) return
    
    setConflictDialogOpen(false)
    await updateAssignmentClassroom(
      pendingClassroomAssignment.assignmentId,
      alternativeClassroomId,
      false // Check conflicts for the alternative
    )
    setPendingClassroomAssignment(null)
    setCurrentConflicts([])
  }

  const getAssignmentsForSlot = (day: number, shift: 'morning' | 'afternoon') => {
    return assignments.filter(assignment => {
      if (!assignment.time_slot || !assignment.time_slot.start_time) return false
      const startHour = parseInt(assignment.time_slot.start_time.split(':')[0])
      const isMorning = startHour < 14
      return assignment.time_slot.day_of_week === day && 
             ((shift === 'morning' && isMorning) || (shift === 'afternoon' && !isMorning))
    })
  }

  const availableYears = ['1', '2', '3', '4']
  const semesters = [
    { value: '1', label: 'Primer Semestre' },
    { value: '2', label: 'Segon Semestre' }
  ]

  return (
    <div className="space-y-6" data-assignment-page>
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Assignació d'Horaris i Espais</h1>
        <p className="text-muted-foreground">
          Gestiona les assignacions d'assignatures, horaris i espais
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Select value={selectedDegree} onValueChange={setSelectedDegree}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Grau" />
          </SelectTrigger>
          <SelectContent>
            {degrees.map(degree => (
              <SelectItem key={degree.value} value={degree.value}>
                {degree.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={selectedYear} 
          onValueChange={setSelectedYear}
          disabled={!selectedDegree}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Any" />
          </SelectTrigger>
          <SelectContent>
            {availableYears.map(year => (
              <SelectItem key={year} value={year}>
                {year}r curs
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={selectedGroup} 
          onValueChange={setSelectedGroup}
          disabled={!selectedDegree || !selectedYear}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Grup" />
          </SelectTrigger>
          <SelectContent>
            {studentGroups.map(group => (
              <SelectItem key={group.id} value={group.id}>
                {group.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select 
          value={selectedSemester} 
          onValueChange={setSelectedSemester}
          disabled={!selectedGroup}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Semestre" />
          </SelectTrigger>
          <SelectContent>
            {semesters.map(semester => (
              <SelectItem key={semester.value} value={semester.value}>
                {semester.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {selectedGroup && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {studentGroups.find(g => g.id === selectedGroup)?.shift === 'mati' ? 'Matí' : 'Tarda'}
            </span>
          </div>
        )}
      </div>

      {/* Main Content - Only show if group is selected */}
      {selectedGroup && selectedSemester && (
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragOver={handleDragOver}
        >
          <div className="grid grid-cols-[240px_1fr_250px] gap-6">
            {/* Left Panel - Subjects */}
            <Card className="h-[calc(100vh-20rem)]">
              <CardHeader className="pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Assignatures del Grup
                  </CardTitle>
                  <div className="flex justify-between items-center">
                    <Badge variant="secondary">
                      {subjects.filter(s => {
                        const assignedHours = assignments
                          .filter(a => a.subject?.id === s.id)
                          .reduce((total, assignment) => {
                            if (!assignment.time_slot) return total
                            const start = assignment.time_slot.start_time.split(':')
                            const end = assignment.time_slot.end_time.split(':')
                            const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1])
                            const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1])
                            return total + (endMinutes - startMinutes) / 60
                          }, 0)
                        return (s.credits || 6) - assignedHours > 0.5
                      }).length} / {subjects.length}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-30rem)]">
                  <div className="space-y-3 pr-3">
                    {subjects
                      .filter(subject => {
                        // Calculate total hours already assigned for this subject
                        const assignedHours = assignments
                          .filter(a => a.subject?.id === subject.id)
                          .reduce((total, assignment) => {
                            if (!assignment.time_slot) return total
                            const start = assignment.time_slot.start_time.split(':')
                            const end = assignment.time_slot.end_time.split(':')
                            const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1])
                            const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1])
                            return total + (endMinutes - startMinutes) / 60
                          }, 0)
                        
                        // Show subject if it still has unassigned hours (with 0.5h tolerance)
                        return (subject.credits || 6) - assignedHours > 0.5
                      })
                      .map(subject => {
                        // Calculate remaining hours for this subject
                        const assignedHours = assignments
                          .filter(a => a.subject?.id === subject.id)
                          .reduce((total, assignment) => {
                            if (!assignment.time_slot) return total
                            const start = assignment.time_slot.start_time.split(':')
                            const end = assignment.time_slot.end_time.split(':')
                            const startMinutes = parseInt(start[0]) * 60 + parseInt(start[1])
                            const endMinutes = parseInt(end[0]) * 60 + parseInt(end[1])
                            return total + (endMinutes - startMinutes) / 60
                          }, 0)
                        
                        const remainingHours = (subject.credits || 6) - assignedHours
                        
                        return (
                          <DraggableSubject 
                            key={subject.id} 
                            subject={subject} 
                            remainingHours={remainingHours}
                          />
                        )
                      })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>

            {/* Center Panel - Schedule */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Horari Setmanal
                    </CardTitle>
                    {(() => {
                      const assignmentsWithoutClassroom = assignments.filter(a => 
                        !a.classroom && (!a.classrooms || a.classrooms.length === 0)
                      ).length
                      return assignmentsWithoutClassroom > 0 ? (
                        <div className="flex items-center gap-1 mt-1 text-xs text-red-600">
                          <Building2 className="h-3 w-3" />
                          <span className="font-medium">{assignmentsWithoutClassroom} assignacions sense aula</span>
                        </div>
                      ) : null
                    })()}
                  </div>
                  {selectedGroup && (
                    <div className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {studentGroups.find(g => g.id === selectedGroup)?.shift === 'mati' 
                        ? 'Matí (9:00 - 14:30)' 
                        : 'Tarda (15:00 - 19:30)'}
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  {/* Weekdays header */}
                  <div className="grid grid-cols-5 gap-1 mb-4">
                    {['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres'].map((day, index) => (
                      <div key={day} className="text-center font-semibold text-sm border-r border-gray-200 last:border-r-0 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Morning schedule - only show if group is morning shift */}
                  {studentGroups.find(g => g.id === selectedGroup)?.shift === 'mati' && (
                    <div>
                      <div className="grid grid-cols-5 gap-1 mb-6">
                        {[1, 2, 3, 4, 5].map(day => (
                          <TimeSlotDroppable
                            key={`morning-${day}`}
                            day={day}
                            shift="morning"
                            assignments={getAssignmentsForSlot(day, 'morning')}
                            onAssignmentUpdate={loadAssignments}
                            onZoneChange={(zone) => {
                              setDropZone(zone)
                              dropZoneRef.current = zone
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Afternoon schedule - only show if group is afternoon shift */}
                  {studentGroups.find(g => g.id === selectedGroup)?.shift === 'tarda' && (
                    <div>
                      <div className="grid grid-cols-5 gap-1">
                        {[1, 2, 3, 4, 5].map(day => (
                          <TimeSlotDroppable
                            key={`afternoon-${day}`}
                            day={day}
                            shift="afternoon"
                            assignments={getAssignmentsForSlot(day, 'afternoon')}
                            onAssignmentUpdate={loadAssignments}
                            onZoneChange={(zone) => {
                              setDropZone(zone)
                              dropZoneRef.current = zone
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Right Panel - Classrooms */}
            <Card className="h-[calc(100vh-20rem)]">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Aules Disponibles
                </CardTitle>
                <CardDescription>
                  Arrossega sobre les assignatures
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="mb-4">
                  <Input
                    placeholder="Buscar aula per nom..."
                    value={classroomSearchTerm}
                    onChange={(e) => {
                      setClassroomSearchTerm(e.target.value)
                      // Reset collapsed state when clearing search
                      if (e.target.value === '' && classroomSearchTerm !== '') {
                        const types = new Set<string>()
                        classrooms.forEach(classroom => {
                          types.add(classroom.type || 'Altres')
                        })
                        setCollapsedClassroomTypes(types)
                      }
                    }}
                    className="w-full"
                  />
                </div>
                <ScrollArea className="h-[calc(100vh-32rem)]">
                  <div className="space-y-4 pr-3">
                    {Object.entries(
                      classrooms
                        .filter(classroom => 
                          classroom.name.toLowerCase().includes(classroomSearchTerm.toLowerCase()) ||
                          classroom.code.toLowerCase().includes(classroomSearchTerm.toLowerCase())
                        )
                        .reduce((acc, classroom) => {
                          const type = classroom.type || 'Altres'
                          if (!acc[type]) acc[type] = []
                          acc[type].push(classroom)
                          return acc
                        }, {} as Record<string, Classroom[]>)
                    ).map(([type, rooms]) => {
                      // Auto-expand types that have search results
                      const hasSearchResults = classroomSearchTerm.length > 0 && rooms.length > 0
                      const isCollapsed = hasSearchResults ? false : collapsedClassroomTypes.has(type)
                      
                      return (
                        <div key={type} className="space-y-2">
                          <button
                            onClick={() => {
                              const newCollapsed = new Set(collapsedClassroomTypes)
                              if (isCollapsed) {
                                newCollapsed.delete(type)
                              } else {
                                newCollapsed.add(type)
                              }
                              setCollapsedClassroomTypes(newCollapsed)
                            }}
                            className="flex items-center gap-1 w-full hover:text-foreground transition-colors text-sm font-semibold text-muted-foreground"
                          >
                            {isCollapsed ? (
                              <ChevronRight className="h-3 w-3" />
                            ) : (
                              <ChevronDown className="h-3 w-3" />
                            )}
                            <span>{type}</span>
                            <span className="text-xs ml-auto">({rooms.length})</span>
                          </button>
                          {!isCollapsed && (
                            <div className="space-y-2 ml-4">
                              {rooms.map((classroom) => (
                                <DraggableClassroom key={classroom.id} classroom={classroom} />
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
          {/* Drag Overlay */}
          <DragOverlay>
            {activeId && dragType === 'subject' && (
              <div className="bg-white border rounded-lg shadow-lg p-3 cursor-grabbing pointer-events-none">
                <div className="text-sm font-medium">Arrossegant assignatura...</div>
              </div>
            )}
            {activeId && dragType === 'classroom' && (
              <div className="bg-amber-50 border-amber-200 border rounded-lg shadow-lg p-3 cursor-grabbing pointer-events-none">
                <div className="text-sm font-medium">Arrossegant aula...</div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      )}
      
      {/* Conflict Dialog */}
      {pendingClassroomAssignment && (
        <ClassroomConflictDialog
          open={conflictDialogOpen}
          onOpenChange={setConflictDialogOpen}
          conflicts={currentConflicts}
          selectedClassroom={pendingClassroomAssignment.classroom}
          onAcceptOverlap={handleAcceptOverlap}
          onSelectAlternative={handleSelectAlternative}
          timeSlotId={assignments.find(a => a.id === pendingClassroomAssignment.assignmentId)?.time_slot?.id || ''}
          semesterId={currentSemesterId || ''}
        />
      )}
      
      {/* Weeks Dialog */}
      <AssignmentWeeksDialog
        open={weeksDialogOpen}
        onOpenChange={setWeeksDialogOpen}
        assignment={selectedAssignmentForWeeks}
        onSuccess={loadAssignments}
      />
    </div>
  )
}

// Draggable Classroom Component
function DraggableClassroom({ classroom }: { classroom: Classroom }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `classroom-${classroom.id}`,
    data: { type: 'classroom', classroom }
  })

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: isDragging ? 0.5 : 1,
  }

  const getBuildingBadge = (building: string | null, code?: string) => {
    if (building) {
      if (building.includes('Pujades')) return 'P'
      if (building.includes('Llacuna')) return 'L'
      if (building.includes('Granada')) return 'G'
      return building.charAt(0).toUpperCase()
    }
    if (code) {
      const prefix = code.split('.')[0]
      if (prefix) return prefix.toUpperCase()
    }
    return '?'
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "bg-amber-50 border-amber-200 p-2 rounded-lg border text-xs cursor-grab hover:shadow-sm transition-all",
        isDragging && "cursor-grabbing"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm">{classroom.name}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>{getBuildingBadge(classroom.building, classroom.code)}</span>
          <span>{classroom.capacity} pl</span>
        </div>
      </div>
    </div>
  )
}

// Time Slot Droppable Component with multiple zones
function TimeSlotDroppable({ 
  day, 
  shift, 
  assignments,
  onAssignmentUpdate,
  onZoneChange
}: { 
  day: number
  shift: 'morning' | 'afternoon'
  assignments: Assignment[]
  onAssignmentUpdate?: () => void
  onZoneChange?: (zone: 'full' | 'first' | 'second') => void
}) {
  // Check if a time slot is available
  const isSlotAvailable = (zone: 'full' | 'first' | 'second') => {
    if (assignments.length === 0) return true
    
    // Define time ranges for each zone
    let startTime: string, endTime: string
    if (shift === 'morning') {
      switch (zone) {
        case 'first':
          startTime = '09:00'
          endTime = '11:00'
          break
        case 'second':
          startTime = '11:30'
          endTime = '14:30'
          break
        default: // 'full'
          startTime = '09:00'
          endTime = '14:30'
      }
    } else {
      switch (zone) {
        case 'first':
          startTime = '15:00'
          endTime = '17:00'
          break
        case 'second':
          startTime = '17:30'
          endTime = '19:30'
          break
        default: // 'full'
          startTime = '15:00'
          endTime = '19:30'
      }
    }
    
    // Check if any assignment overlaps with this zone
    const hasOverlap = assignments.some(assignment => {
      const slotStart = assignment.time_slot.start_time
      const slotEnd = assignment.time_slot.end_time
      
      // Check for any overlap
      return !(endTime <= slotStart || startTime >= slotEnd)
    })
    
    return !hasOverlap
  }

  return (
    <div className="bg-gray-50 rounded-lg p-1 h-[260px] relative border-r border-gray-200 last:border-r-0">
      {/* Multiple drop zones */}
      <TimeSlotZone
        day={day}
        shift={shift}
        zone="full"
        isAvailable={isSlotAvailable('full')}
        onZoneChange={onZoneChange}
      />
      <TimeSlotZone
        day={day}
        shift={shift}
        zone="first"
        isAvailable={isSlotAvailable('first')}
        onZoneChange={onZoneChange}
      />
      <TimeSlotZone
        day={day}
        shift={shift}
        zone="second"
        isAvailable={isSlotAvailable('second')}
        onZoneChange={onZoneChange}
      />
      
      {/* Show visual feedback when hovering */}
      {assignments.length === 0 && (
        <div className="absolute inset-1 pointer-events-none">
          <div className="h-1/2 border-b border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400">
            <span>{shift === 'morning' ? '9:00-11:00' : '15:00-17:00'}</span>
          </div>
          <div className="h-1/2 flex items-center justify-center text-xs text-gray-400">
            <span>{shift === 'morning' ? '11:30-14:30' : '17:30-19:30'}</span>
          </div>
        </div>
      )}

      {/* Display assignments on top */}
      {assignments.map((assignment) => {
        if (!assignment.time_slot || !assignment.time_slot.start_time || !assignment.time_slot.end_time) {
          return null
        }
        const startHour = parseInt(assignment.time_slot.start_time.split(':')[0])
        const endHour = parseInt(assignment.time_slot.end_time.split(':')[0])
        const startMinutes = parseInt(assignment.time_slot.start_time.split(':')[1])
        const endMinutes = parseInt(assignment.time_slot.end_time.split(':')[1])
        
        // Calculate position and height based on time
        let top = 0
        let height = 100
        
        if (shift === 'morning') {
          // Morning slot is from 9:00 to 14:30 (5.5 hours)
          const slotStart = 9 * 60 // 9:00 in minutes
          const slotEnd = 14.5 * 60 // 14:30 in minutes
          const totalMinutes = slotEnd - slotStart
          
          const assignmentStart = (startHour * 60 + startMinutes) - slotStart
          const assignmentEnd = (endHour * 60 + endMinutes) - slotStart
          
          top = (assignmentStart / totalMinutes) * 100
          height = ((assignmentEnd - assignmentStart) / totalMinutes) * 100
        } else {
          // Afternoon slot is from 15:00 to 19:30 (4.5 hours)
          const slotStart = 15 * 60 // 15:00 in minutes
          const slotEnd = 19.5 * 60 // 19:30 in minutes
          const totalMinutes = slotEnd - slotStart
          
          const assignmentStart = (startHour * 60 + startMinutes) - slotStart
          const assignmentEnd = (endHour * 60 + endMinutes) - slotStart
          
          top = (assignmentStart / totalMinutes) * 100
          height = ((assignmentEnd - assignmentStart) / totalMinutes) * 100
        }
        
        return (
          <DroppableAssignment
            key={assignment.id}
            assignment={assignment}
            style={{
              position: 'absolute',
              top: `${top}%`,
              height: `${height}%`,
              left: '4px',
              right: '4px'
            }}
            onUpdate={onAssignmentUpdate}
          />
        )
      })}
    </div>
  )
}

// Individual drop zone component
function TimeSlotZone({
  day,
  shift,
  zone,
  isAvailable,
  onZoneChange
}: {
  day: number
  shift: 'morning' | 'afternoon'
  zone: 'full' | 'first' | 'second'
  isAvailable: boolean
  onZoneChange?: (zone: 'full' | 'first' | 'second') => void
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${day}-${shift}-${zone}`,
    disabled: !isAvailable,
    data: { 
      type: 'time-slot', 
      day, 
      shift,
      zone 
    }
  })

  useEffect(() => {
    if (isOver && onZoneChange) {
      console.log(`Dragging over slot: slot-${day}-${shift}-${zone}`, 'Current zone:', zone)
      onZoneChange(zone)
    }
  }, [isOver, zone, onZoneChange, day, shift])

  // Position styles for each zone
  const zoneStyles = {
    full: {
      top: 0,
      height: '100%',
      display: isAvailable ? 'block' : 'none'
    },
    first: {
      top: 0,
      height: '50%',
      display: isAvailable ? 'block' : 'none'
    },
    second: {
      top: '50%',
      height: '50%',
      display: isAvailable ? 'block' : 'none'
    }
  }

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "absolute left-0 right-0 transition-all",
        isOver && isAvailable && "bg-blue-100/50 ring-2 ring-blue-500"
      )}
      style={zoneStyles[zone]}
    />
  )
}

// Droppable Assignment Component
function DroppableAssignment({ 
  assignment, 
  style,
  onUpdate 
}: { 
  assignment: Assignment
  style: React.CSSProperties
  onUpdate?: () => void
}) {
  const supabase = createClient()
  const { setNodeRef, isOver } = useDroppable({
    id: `assignment-${assignment.id}`,
    data: { type: 'assignment', assignmentId: assignment.id }
  })

  const getSubjectColor = (subject: { type: string, year: number, name: string }, studentGroup?: StudentGroup) => {
    // Check if it's a Belles Arts subject based on the student group
    if (studentGroup && (studentGroup.name.startsWith('GB') || studentGroup.name.startsWith('GBA'))) {
      return 'bg-[#5dbb8f]' // Green for Belles Arts
    }
    
    // Check if it's an itinerary subject
    const isItinerarySubject = (name: string) => {
      const itineraryKeywords = [
        // Moda itinerary
        'moda', 'fashion', 'tèxtil', 'textile', 'patronatge', 'confecció',
        // Gràfic itinerary  
        'gràfic', 'graphic', 'tipografia', 'typography', 'editorial', 'packaging',
        // Audiovisual itinerary
        'audiovisual', 'vídeo', 'video', 'animació', 'animation', 'motion', 'cinema'
      ]
      
      const lowerName = name.toLowerCase()
      return itineraryKeywords.some(keyword => lowerName.includes(keyword))
    }
    
    // First and some second year subjects are generic (for Design degree)
    if (subject.year === 1 || (subject.year === 2 && !isItinerarySubject(subject.name))) {
      return 'bg-[#012853]' // Dark blue for generic subjects
    }
    
    // Itinerary subjects - check the name for specific keywords
    const lowerName = subject.name.toLowerCase()
    
    // Moda itinerary
    if (lowerName.includes('moda') || lowerName.includes('tèxtil') || 
        lowerName.includes('fashion') || lowerName.includes('patronatge')) {
      return 'bg-[#ee4f44]' // Red for fashion
    }
    
    // Gràfic itinerary
    if (lowerName.includes('gràfic') || lowerName.includes('tipografia') || 
        lowerName.includes('editorial') || lowerName.includes('packaging')) {
      return 'bg-[#5ea1a8]' // Teal for graphic design
    }
    
    // Audiovisual itinerary
    if (lowerName.includes('audiovisual') || lowerName.includes('vídeo') || 
        lowerName.includes('animació') || lowerName.includes('motion')) {
      return 'bg-[#59585c]' // Dark gray for audiovisual
    }
    
    // Default to generic color if can't determine
    return 'bg-[#012853]'
  }

  const handleRemoveAssignment = async (e: React.MouseEvent) => {
    e.stopPropagation()
    
    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignment.id)
    
    if (error) {
      console.error('Error removing assignment:', error)
    } else {
      onUpdate?.()
    }
  }

  const handleRemoveClassroom = async (e: React.MouseEvent, classroomId: string) => {
    e.stopPropagation()
    
    const { error } = await supabase
      .from('assignment_classrooms')
      .delete()
      .eq('assignment_id', assignment.id)
      .eq('classroom_id', classroomId)
    
    if (error) {
      console.error('Error removing classroom:', error)
    } else {
      onUpdate?.()
    }
  }
  
  const handleEditWeeks = (e: React.MouseEvent) => {
    e.stopPropagation()
    // Find the parent component's setters
    const parentEl = document.querySelector('[data-assignment-page]')
    if (parentEl) {
      const event = new CustomEvent('editAssignmentWeeks', { 
        detail: assignment,
        bubbles: true 
      })
      parentEl.dispatchEvent(event)
    }
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "rounded-md p-2 text-white flex flex-col gap-1 transition-all shadow-sm relative group overflow-hidden",
        getSubjectColor(assignment.subject, assignment.student_group),
        isOver && "ring-2 ring-offset-2 ring-gray-900",
        (!assignment.classroom && (!assignment.classrooms || assignment.classrooms.length === 0)) && "ring-2 ring-red-500 ring-offset-1"
      )}
    >
      <button
        onClick={handleRemoveAssignment}
        className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/20 rounded p-0.5 hover:bg-white/30"
      >
        <X className="h-3 w-3" />
      </button>

      <div className="space-y-1 flex flex-col h-full">
        <div className="font-semibold text-xs line-clamp-2 leading-tight">
          {assignment.subject.name}
        </div>
        
        <div className="text-[11px] opacity-90 flex items-center gap-1">
          <GraduationCap className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">
            {assignment.teacher 
              ? `${assignment.teacher.first_name} ${assignment.teacher.last_name}`
              : "Sense docent assignat"
            }
          </span>
        </div>
        
        {/* Show multiple classrooms or warning if none */}
        {assignment.assignment_classrooms && assignment.assignment_classrooms.length > 0 ? (
          <div className="space-y-1 flex-1">
            {assignment.assignment_classrooms.map((ac) => (
              <div key={ac.classroom.id} className="flex items-center gap-1 text-[11px] bg-white/20 rounded px-1 py-0.5 relative group/classroom">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span className="flex-1 truncate">{ac.classroom.code}</span>
                {!ac.is_full_semester && ac.weeks.length > 0 && (
                  <span className="text-[10px] opacity-80">
                    S.{ac.weeks.length < 4 ? ac.weeks.join(',') : `${ac.weeks[0]}-${ac.weeks[ac.weeks.length-1]}`}
                  </span>
                )}
                <div className="flex items-center gap-0.5 opacity-0 group-hover/classroom:opacity-100 transition-opacity">
                  <button
                    onClick={handleEditWeeks}
                    className="hover:bg-white/30 rounded p-0.5"
                    title="Editar setmanes"
                  >
                    <Calendar className="h-2.5 w-2.5" />
                  </button>
                  <button
                    onClick={(e) => handleRemoveClassroom(e, ac.classroom.id)}
                    className="hover:bg-white/30 rounded p-0.5"
                    title="Eliminar aula"
                  >
                    <X className="h-2.5 w-2.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : assignment.classrooms && assignment.classrooms.length > 0 ? (
          <div className="space-y-1">
            {assignment.classrooms.map((classroom) => (
              <div key={classroom.id} className="flex items-center gap-1 text-[11px] bg-white/20 rounded px-1 py-0.5 relative group/classroom">
                <Building2 className="h-3 w-3 flex-shrink-0" />
                <span>{classroom.code}</span>
                <button
                  onClick={(e) => handleRemoveClassroom(e, classroom.id)}
                  className="ml-auto opacity-0 group-hover/classroom:opacity-100 transition-opacity hover:bg-white/20 rounded p-0.5"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </div>
            ))}
          </div>
        ) : assignment.classroom ? (
          // Fallback for old single classroom (backwards compatibility)
          <div className="flex items-center gap-1 text-[11px] bg-white/20 rounded px-1 py-0.5 relative group/classroom">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span>{assignment.classroom.code}</span>
            <button
              onClick={(e) => handleRemoveClassroom(e, assignment.classroom!.id)}
              className="ml-auto opacity-0 group-hover/classroom:opacity-100 transition-opacity hover:bg-white/20 rounded p-0.5"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-1 text-[11px] bg-red-900/40 rounded px-1 py-0.5 animate-pulse">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="font-semibold">Sense aula!</span>
          </div>
        )}
      </div>
    </div>
  )
}