'use client'

import { useState } from 'react'
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
    for (let hour = 8; hour <= 20; hour++) {
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
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 bg-muted">Hora</th>
              {[1, 2, 3, 4, 5].map(day => (
                <th key={day} className="border p-2 bg-muted">
                  {daysOfWeek[day - 1]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedTimes.map(time => {
              return (
                <tr key={time}>
                  <td className="border p-2 font-medium text-sm">
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
                          className="border p-2 bg-blue-50 align-top cursor-pointer hover:bg-blue-100 transition-colors"
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
                          <div className="space-y-1">
                            <div className="font-medium text-xs">
                              {cellInfo.content.subjectName}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {cellInfo.content.teacherName}
                            </div>
                            {cellInfo.content.groupCode && (
                              <Badge variant="outline" className="text-xs">
                                {cellInfo.content.groupCode}
                              </Badge>
                            )}
                          </div>
                        </td>
                      )
                    }
                    
                    // Empty cell
                    return <td key={day} className="border p-2"></td>
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
        <DialogHeader className="flex items-center justify-between">
          <div>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Ocupació de l'aula {classroom.code} - {classroom.name}
            </DialogTitle>
            <DialogDescription>
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
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Horari setmanal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] w-full">
                      {renderTimeGrid(semesterData)}
                    </ScrollArea>
                  </CardContent>
                </Card>
                
                {/* Compact Occupancy Stats */}
                <Card>
                  <CardContent className="pt-4 pb-3">
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
    </Dialog>
  )
}