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
import { Clock, Calendar, Users } from 'lucide-react'

interface ClassroomOccupancyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  data: {
    classroom: any
    occupancy: any
  } | null
}

const daysOfWeek = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres']

const timeSlotToHour = (time: string) => {
  return time.substring(0, 5)
}

export function ClassroomOccupancyDialog({
  open,
  onOpenChange,
  data
}: ClassroomOccupancyDialogProps) {
  const [selectedSemester, setSelectedSemester] = useState('1')

  if (!data || !data.occupancy) return null

  const semesters = data.occupancy.semesters || []
  const classroom = data.classroom

  const renderTimeGrid = (semesterData: any) => {
    if (!semesterData || !semesterData.classroomOccupancy) {
      return <div>No hi ha dades d'ocupació</div>
    }

    const timeSlots = semesterData.classroomOccupancy.timeSlots || []
    
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
                          className="border p-2 bg-blue-50 align-top"
                          rowSpan={cellInfo.rowspan}
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
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Ocupació de l'aula {classroom.code} - {classroom.name}
          </DialogTitle>
          <DialogDescription>
            Visualitza l'ocupació de l'aula per semestre, matí i tarda
          </DialogDescription>
        </DialogHeader>

        <Tabs value={selectedSemester} onValueChange={setSelectedSemester}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="1">Semestre 1</TabsTrigger>
            <TabsTrigger value="2">Semestre 2</TabsTrigger>
          </TabsList>

          {['1', '2'].map(semesterNum => {
            const semesterData = semesters.find(
              (s: any) => s.semesterName === `Semestre ${semesterNum}`
            )
            
            if (!semesterData) {
              return (
                <TabsContent key={semesterNum} value={semesterNum}>
                  <Card>
                    <CardContent className="pt-6">
                      <p className="text-center text-muted-foreground">
                        No hi ha dades per aquest semestre
                      </p>
                    </CardContent>
                  </Card>
                </TabsContent>
              )
            }

            const occupancy = semesterData.classroomOccupancy

            return (
              <TabsContent key={semesterNum} value={semesterNum} className="space-y-4">
                {/* Occupancy Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Ocupació Total
                      </CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{occupancy.totalOccupancy}%</div>
                      <div className="mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-500"
                          style={{ width: `${occupancy.totalOccupancy}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Ocupació Matí
                      </CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{occupancy.morningOccupancy}%</div>
                      <div className="mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            occupancy.morningOccupancy > 75 ? 'bg-red-500' :
                            occupancy.morningOccupancy > 50 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${occupancy.morningOccupancy}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">
                        Ocupació Tarda
                      </CardTitle>
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{occupancy.afternoonOccupancy}%</div>
                      <div className="mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${
                            occupancy.afternoonOccupancy > 75 ? 'bg-red-500' :
                            occupancy.afternoonOccupancy > 50 ? 'bg-yellow-500' :
                            'bg-green-500'
                          }`}
                          style={{ width: `${occupancy.afternoonOccupancy}%` }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Time Grid */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Horari setmanal</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-[400px] w-full">
                      {renderTimeGrid(semesterData)}
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>
            )
          })}
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}