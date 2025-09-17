'use client'

import { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Clock, Calendar, Users, RefreshCw } from 'lucide-react'
import { ClassroomAssignmentDialog } from '@/components/subjects/classroom-assignment-dialog'
import { NewAssignmentDialog } from '@/components/classrooms/new-assignment-dialog'
import { Button } from '@/components/ui/button'

interface ClassroomOccupancyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: {
    classroom: any
    occupancy: any
  } | null
  onRefresh?: () => void
}

const daysOfWeek = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']

const timeSlotToHour = (time: string) => {
  return time.substring(0, 5)
}

export function ClassroomOccupancyDialog({
  open,
  onOpenChange,
  data,
  onRefresh
}: ClassroomOccupancyDialogProps) {
  if (!data || !data.occupancy) return null

  const semesters = data.occupancy.semesters || []
  const classroom = data.classroom
  
  // Use the first available semester as default
  const [selectedSemester, setSelectedSemester] = useState(
    semesters.length > 0 ? semesters[0].semesterId : ''
  )
  
  // State for showing assignment dialog
  const [assignmentDialogOpen, setAssignmentDialogOpen] = useState(false)
  const [selectedSubjectGroup, setSelectedSubjectGroup] = useState<any>(null)

  // State for time slot selection (click and drag)
  const [isSelecting, setIsSelecting] = useState(false)
  const [selectionStart, setSelectionStart] = useState<{day: number, time: string} | null>(null)
  const [selectionEnd, setSelectionEnd] = useState<{day: number, time: string} | null>(null)
  const [selectedTimeSlots, setSelectedTimeSlots] = useState<Set<string>>(new Set())

  // State for new assignment dialog
  const [newAssignmentDialogOpen, setNewAssignmentDialogOpen] = useState(false)
  const [newAssignmentData, setNewAssignmentData] = useState<{
    day: number
    startTime: string
    endTime: string
    classroomId: string
  } | null>(null)

  // Helper functions for time slot selection
  const getCellKey = (day: number, time: string) => `${day}-${time}`

  const handleMouseDown = (day: number, time: string) => {
    setIsSelecting(true)
    setSelectionStart({ day, time })
    setSelectionEnd({ day, time })
    setSelectedTimeSlots(new Set([getCellKey(day, time)]))
  }

  const handleMouseEnter = (day: number, time: string) => {
    if (!isSelecting || !selectionStart) return

    // Only allow selection in the same day
    if (day !== selectionStart.day) return

    setSelectionEnd({ day, time })

    // Update selected time slots
    const sortedTimes = Array.from(new Set([...Array(12)].map((_, i) => {
      const hour = 9 + i
      return `${hour.toString().padStart(2, '0')}:00:00`
    }))).sort()

    const startIndex = sortedTimes.indexOf(selectionStart.time)
    const endIndex = sortedTimes.indexOf(time)

    if (startIndex !== -1 && endIndex !== -1) {
      const start = Math.min(startIndex, endIndex)
      const end = Math.max(startIndex, endIndex)
      const selected = new Set<string>()

      for (let i = start; i <= end; i++) {
        selected.add(getCellKey(day, sortedTimes[i]))
      }

      setSelectedTimeSlots(selected)
    }
  }

  const handleMouseUp = () => {
    if (isSelecting && selectionStart && selectionEnd) {
      // Create new assignment with selected time range
      const sortedTimes = Array.from(new Set([...Array(12)].map((_, i) => {
        const hour = 9 + i
        return `${hour.toString().padStart(2, '0')}:00:00`
      }))).sort()

      const startIndex = sortedTimes.indexOf(selectionStart.time)
      const endIndex = sortedTimes.indexOf(selectionEnd.time)

      if (startIndex !== -1 && endIndex !== -1) {
        const start = Math.min(startIndex, endIndex)
        const end = Math.max(startIndex, endIndex)

        const startTime = sortedTimes[start]
        const endTime = sortedTimes[end + 1] || `${20}:00:00` // Next hour or 20:00

        setNewAssignmentData({
          day: selectionStart.day,
          startTime,
          endTime,
          classroomId: classroom.id
        })
        setNewAssignmentDialogOpen(true)
      }
    }

    setIsSelecting(false)
    setSelectionStart(null)
    setSelectionEnd(null)
    setSelectedTimeSlots(new Set())
  }

  const isTimeSlotSelected = (day: number, time: string) => {
    return selectedTimeSlots.has(getCellKey(day, time))
  }

  const renderTimeGrid = (semesterData: any) => {
    console.log('Rendering semester data:', semesterData)
    if (!semesterData || !semesterData.classroomOccupancy) {
      return <div>No hi ha dades d'ocupació</div>
    }

    const timeSlots = semesterData.classroomOccupancy.timeSlots || []
    console.log('Time slots for semester:', timeSlots.length)
    
    // Group consecutive slots with same assignment
    const groupedSlots: { [key: number]: any[] } = {}
    
    for (let day = 1; day <= 5; day++) {
      groupedSlots[day] = []
      const daySlots = timeSlots
        .filter((slot: any) => slot.dayOfWeek === day)
        .sort((a: any, b: any) => a.startTime.localeCompare(b.startTime))
      
      let currentGroup: any = null
      
      daySlots.forEach((slot: any, index: number) => {
        if (!slot.isOccupied) {
          // Push any existing group
          if (currentGroup) {
            groupedSlots[day].push(currentGroup)
            currentGroup = null
          }
          return
        }
        
        // Check if this slot continues the current group
        const sameAssignment = currentGroup && 
          currentGroup.assignment.subjectName === slot.assignment.subjectName &&
          currentGroup.assignment.groupCode === slot.assignment.groupCode &&
          currentGroup.assignment.teacherName === slot.assignment.teacherName
        
        const isConsecutive = currentGroup && 
          currentGroup.endTime === slot.startTime
        
        if (sameAssignment && isConsecutive) {
          // Extend the current group
          currentGroup.endTime = slot.endTime
        } else {
          // Push any existing group and start a new one
          if (currentGroup) {
            groupedSlots[day].push(currentGroup)
          }
          currentGroup = {
            startTime: slot.startTime,
            endTime: slot.endTime,
            assignment: slot.assignment
          }
        }
      })
      
      // Push the last group if exists
      if (currentGroup) {
        groupedSlots[day].push(currentGroup)
      }
    }

    // Get all unique times for the grid
    const allTimes = new Set<string>()
    for (let hour = 9; hour <= 20; hour++) {
      allTimes.add(`${hour.toString().padStart(2, '0')}:00:00`)
    }
    const sortedTimes = Array.from(allTimes).sort()

    // Create a map to track which cells are part of merged groups
    const mergedCells: { [key: string]: { rowspan: number, content: any } | null } = {}
    
    for (let day = 1; day <= 5; day++) {
      groupedSlots[day].forEach((group: any) => {
        const startHour = parseInt(group.startTime.split(':')[0])
        const endHour = parseInt(group.endTime.split(':')[0])
        const rowspan = endHour - startHour
        
        // Mark the starting cell
        mergedCells[`${day}-${group.startTime}`] = {
          rowspan: rowspan,
          content: group.assignment
        }
        
        // Mark cells that should be skipped
        for (let h = startHour + 1; h < endHour; h++) {
          const time = `${h.toString().padStart(2, '0')}:00:00`
          mergedCells[`${day}-${time}`] = null
        }
      })
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full border-separate table-fixed" style={{ borderSpacing: '4px 0' }}>
          <colgroup>
            <col style={{ width: '80px' }} />
            <col style={{ width: 'calc((100% - 80px) / 5)' }} />
            <col style={{ width: 'calc((100% - 80px) / 5)' }} />
            <col style={{ width: 'calc((100% - 80px) / 5)' }} />
            <col style={{ width: 'calc((100% - 80px) / 5)' }} />
            <col style={{ width: 'calc((100% - 80px) / 5)' }} />
          </colgroup>
          <thead>
            <tr>
              <th className="border px-2 py-1 bg-muted text-sm">Hora</th>
              {[1, 2, 3, 4, 5].map(day => (
                <th key={day} className="border px-2 py-1 bg-muted text-sm">
                  {daysOfWeek[day - 1]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTimes.map(time => {
              return (
                <tr key={time}>
                  <td className="border px-2 py-1 font-medium text-xs">
                    {timeSlotToHour(time)}
                  </td>
                  {[1, 2, 3, 4, 5].map(day => {
                    const cellKey = `${day}-${time}`
                    const cellInfo = mergedCells[cellKey]
                    
                    // Skip cell if it's part of a merged group
                    if (cellInfo === null) {
                      return null
                    }
                    
                    // Render merged cell
                    if (cellInfo) {
                      return (
                        <td 
                          key={day} 
                          className="border px-2 py-1 bg-blue-50 align-top cursor-pointer hover:bg-blue-100 transition-colors"
                          rowSpan={cellInfo.rowspan}
                          onClick={() => {
                            // Open assignment dialog with the subject group info
                            setSelectedSubjectGroup({
                              id: cellInfo.content.subjectGroupId,
                              subject_id: cellInfo.content.subjectId,
                              subject: {
                                name: cellInfo.content.subjectName
                              },
                              group_code: cellInfo.content.groupCode
                            })
                            setAssignmentDialogOpen(true)
                          }}
                        >
                          <div className="space-y-0.5">
                            <div className="font-medium text-xs leading-tight">
                              {cellInfo.content.subjectName}
                            </div>
                            <div className="text-xs text-muted-foreground leading-tight">
                              {cellInfo.content.teacherName}
                            </div>
                            {cellInfo.content.groupCode && (
                              <Badge variant="outline" className="text-xs px-1 py-0 h-4">
                                {cellInfo.content.groupCode}
                              </Badge>
                            )}
                          </div>
                        </td>
                      )
                    }

                    // Empty cell - clickable to add new assignment
                    const isSelected = isTimeSlotSelected(day, time)
                    return (
                      <td
                        key={day}
                        className={`border px-2 py-1 cursor-pointer transition-colors h-12 min-h-[48px] select-none ${
                          isSelected
                            ? 'bg-blue-200 border-blue-400'
                            : 'hover:bg-gray-50'
                        }`}
                        onMouseDown={() => handleMouseDown(day, time)}
                        onMouseEnter={() => handleMouseEnter(day, time)}
                        onMouseUp={handleMouseUp}
                      >
                        <div className="flex items-center justify-center h-full opacity-30 hover:opacity-60 transition-opacity">
                          <span className="text-xs text-muted-foreground">+</span>
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh]">
        <DialogHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <DialogTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-4 w-4" />
                Ocupació de l'aula {classroom.name}
              </DialogTitle>
              <DialogDescription className="text-xs mt-1">
                Visualitza l'ocupació de l'aula per semestre, matí i tarda
              </DialogDescription>
            </div>
            {onRefresh && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefresh}
                className="ml-4"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Actualitzar
              </Button>
            )}
          </div>
        </DialogHeader>

        <Tabs value={selectedSemester} onValueChange={setSelectedSemester}>
          <TabsList className={`grid w-full grid-cols-${Math.min(semesters.length, 4)}`}>
            {semesters.map((semester: any) => (
              <TabsTrigger key={semester.semesterId} value={semester.semesterId}>
                {semester.semesterName}
              </TabsTrigger>
            ))}
          </TabsList>

          {semesters.map((semesterData: any) => {
            const occupancy = semesterData.classroomOccupancy

            return (
              <TabsContent key={semesterData.semesterId} value={semesterData.semesterId} className="space-y-4">
                {/* Time Grid */}
                <Card>
                  <CardHeader className="py-2">
                    <CardTitle className="text-sm">Horari setmanal</CardTitle>
                  </CardHeader>
                  <CardContent className="p-2">
                    <ScrollArea className="h-[400px] w-full">
                      {renderTimeGrid(semesterData)}
                    </ScrollArea>
                  </CardContent>
                </Card>
                
                {/* Compact Occupancy Stats */}
                <Card>
                  <CardContent className="py-2">
                    <div className="flex items-center justify-around gap-6">
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Total</p>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500"
                                style={{ width: `${occupancy.totalOccupancy}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{occupancy.totalOccupancy}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Matí</p>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${
                                  occupancy.morningOccupancy > 75 ? 'bg-red-500' :
                                  occupancy.morningOccupancy > 50 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${occupancy.morningOccupancy}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{occupancy.morningOccupancy}%</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <div className="space-y-1">
                          <p className="text-xs text-muted-foreground">Tarda</p>
                          <div className="flex items-center gap-2">
                            <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full ${
                                  occupancy.afternoonOccupancy > 75 ? 'bg-red-500' :
                                  occupancy.afternoonOccupancy > 50 ? 'bg-yellow-500' :
                                  'bg-green-500'
                                }`}
                                style={{ width: `${occupancy.afternoonOccupancy}%` }}
                              />
                            </div>
                            <span className="text-sm font-medium">{occupancy.afternoonOccupancy}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            )
          })}
        </Tabs>
      </DialogContent>
      
      {/* Assignment Dialog */}
      {selectedSubjectGroup && (
        <ClassroomAssignmentDialog
          open={assignmentDialogOpen}
          onOpenChange={setAssignmentDialogOpen}
          subjectGroup={selectedSubjectGroup}
          semesterId={selectedSemester}
          onSuccess={() => {
            // Refresh the occupancy data after successful assignment
            if (onRefresh) {
              onRefresh()
            }
          }}
        />
      )}

      {/* New Assignment Dialog */}
      <NewAssignmentDialog
        open={newAssignmentDialogOpen}
        onOpenChange={setNewAssignmentDialogOpen}
        assignmentData={newAssignmentData}
        semesterId={selectedSemester}
        onSuccess={() => {
          // Refresh the occupancy data after successful assignment
          if (onRefresh) {
            onRefresh()
          }
        }}
      />
    </Dialog>
  )
}