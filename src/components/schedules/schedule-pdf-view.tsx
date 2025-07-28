'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { Printer } from 'lucide-react'
import './schedule-pdf-view.css'

interface Assignment {
  id: string
  subject: {
    name: string
    code: string
    type: string
  }
  teacher: {
    first_name: string
    last_name: string
  } | null
  classrooms: {
    code: string
    name: string
  }[]
  time_slot: {
    day_of_week: number
    start_time: string
    end_time: string
  }
}

interface StudentGroup {
  id: string
  name: string
  year: number
  shift: 'mati' | 'tarda'
  max_students: number
}

interface SchedulePDFViewProps {
  groups: StudentGroup[]
  assignments1: Record<string, Assignment[]>
  assignments2: Record<string, Assignment[]>
  academicYear?: string
}

export function SchedulePDFView({ groups, assignments1, assignments2, academicYear = '2025-2026' }: SchedulePDFViewProps) {
  const handlePrint = () => {
    window.print()
  }

  const getDayAssignments = (assignments: Assignment[], day: number) => {
    return assignments
      .filter(a => a.time_slot && a.time_slot.day_of_week === day)
      .sort((a, b) => a.time_slot.start_time.localeCompare(b.time_slot.start_time))
  }

  const weekDays = ['DILLUNS', 'DIMARTS', 'DIMECRES', 'DIJOUS', 'DIVENDRES']

  // Create time slots structure for the table
  const createTimeSlots = (isAfternoon: boolean = false) => {
    if (isAfternoon) {
      return [
        { time: '15:00', rowSpan: 1, isTutorial: false, isBreak: false, duration: '2h' },
        { time: '17:00', rowSpan: 1, isTutorial: false, isBreak: true, duration: '30m' },
        { time: '17:30', rowSpan: 1, isTutorial: false, isBreak: false, duration: '2h' },
        { time: '19:30', rowSpan: 1, isTutorial: true, isBreak: false, duration: '30m' }
      ]
    }
    
    return [
      { time: '09:00', rowSpan: 1, isTutorial: false, isBreak: false, duration: '2h' },
      { time: '11:00', rowSpan: 1, isTutorial: false, isBreak: true, duration: '30m' },
      { time: '11:30', rowSpan: 1, isTutorial: false, isBreak: false, duration: '2h' },
      { time: '13:30', rowSpan: 1, isTutorial: false, isBreak: false, duration: '1h' },
      { time: '14:30', rowSpan: 1, isTutorial: true, isBreak: false, duration: '30m' }
    ]
  }

  // Calculate which row an assignment should appear in
  const getAssignmentRow = (assignment: Assignment, isAfternoon: boolean = false) => {
    const startTime = assignment.time_slot.start_time.slice(0, 5)
    
    if (isAfternoon) {
      const timeToRow: Record<string, number> = {
        '15:00': 0,
        '17:00': 1,
        '17:30': 2,
        '19:30': 3
      }
      return timeToRow[startTime] ?? -1
    }
    
    const timeToRow: Record<string, number> = {
      '09:00': 0,
      '11:00': 1,
      '11:30': 2,
      '13:30': 3,
      '14:30': 4
    }
    return timeToRow[startTime] ?? -1
  }

  // Calculate how many rows an assignment spans
  const getRowSpan = (assignment: Assignment, isAfternoon: boolean = false) => {
    const start = assignment.time_slot.start_time.slice(0, 5)
    const end = assignment.time_slot.end_time.slice(0, 5)
    
    if (isAfternoon) {
      const timeMap: Record<string, number> = {
        '15:00': 0,
        '17:00': 1,
        '17:30': 2,
        '19:30': 3,
        '20:30': 4
      }
      
      const startRow = timeMap[start] ?? 0
      const endRow = timeMap[end] ?? startRow + 1
      
      return Math.max(1, endRow - startRow)
    }
    
    const timeMap: Record<string, number> = {
      '09:00': 0,
      '11:00': 1,
      '11:30': 2,
      '13:30': 3,
      '14:30': 4,
      '15:30': 5
    }
    
    const startRow = timeMap[start] ?? 0
    const endRow = timeMap[end] ?? startRow + 1
    
    return Math.max(1, endRow - startRow)
  }

  const renderScheduleTable = (assignments: Assignment[], semester: number, shift: 'mati' | 'tarda') => {
    const isAfternoon = shift === 'tarda'
    const timeSlots = createTimeSlots(isAfternoon)
    
    return (
      <div className="semester-wrapper">
        <div className="semester-title">
          {semester === 1 ? '1r SEMESTRE' : '2n SEMESTRE'}
        </div>
        <table className="schedule-table">
          <thead>
            <tr>
              <th className="time-column"></th>
              {weekDays.map(day => (
                <th key={day} className="day-column">{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(() => {
              const renderedCells = new Set<string>()
              
              return timeSlots.map((slot, rowIndex) => {
                const isTutorial = slot.isTutorial
                const isBreak = slot.isBreak
                const isBeforeTutorial = rowIndex === timeSlots.length - 2
                
                const durationClass = `time-slot-${slot.duration}`
                
                const rowClassName = [
                  durationClass,
                  isTutorial && 'tutorial-row',
                  isBreak && 'break-row',
                  isBeforeTutorial && 'before-tutorial-row'
                ].filter(Boolean).join(' ')
                
                return (
                  <tr key={`${semester}-${slot.time}`} className={rowClassName}>
                    <td className="time-cell">{slot.time}</td>
                    {[1, 2, 3, 4, 5].map(day => {
                      const cellKey = `${day}-${rowIndex}`
                      
                      // Skip if this cell was already rendered as part of a rowspan
                      if (renderedCells.has(cellKey)) {
                        return null
                      }
                      
                      const dayAssignments = getDayAssignments(assignments, day)
                      
                      if (isTutorial) {
                        // Find tutorial assignment
                        const tutorialTime = isAfternoon ? '19:30' : '14:30'
                        const tutorialAssignment = dayAssignments.find(a => 
                          a.time_slot.start_time.slice(0, 5) === tutorialTime
                        )
                        return (
                          <td key={day} className="tutorial-cell">
                            <div className="tutorial-content">
                              Tutories<br/>
                              {tutorialAssignment?.classrooms[0]?.code || ''}
                            </div>
                          </td>
                        )
                      }
                      
                      // Find assignment for this time slot
                      const assignment = dayAssignments.find(a => {
                        const assignmentRow = getAssignmentRow(a, isAfternoon)
                        return assignmentRow === rowIndex
                      })

                      if (!assignment) {
                        return <td key={day} className="empty-cell"></td>
                      }

                      const rowSpan = getRowSpan(assignment, isAfternoon)
                      
                      // Mark cells as rendered for rowspan
                      for (let i = 0; i < rowSpan; i++) {
                        renderedCells.add(`${day}-${rowIndex + i}`)
                      }

                      return (
                        <td key={day} rowSpan={rowSpan} className="subject-cell">
                          <div className="subject-content">
                            <div className="subject-name">{assignment.subject.name}</div>
                            {assignment.teacher && (
                              <div className="teacher-name">
                                {assignment.teacher.first_name} {assignment.teacher.last_name}
                              </div>
                            )}
                            <div className="classroom-code">
                              {assignment.classrooms.map(c => c.code).join(' + ')}
                            </div>
                          </div>
                        </td>
                      )
                    })}
                  </tr>
                )
              })
            })()}
          </tbody>
        </table>
      </div>
    )
  }

  // Get course type from group name
  const getCourseType = (groupName: string) => {
    if (groupName.startsWith('GR')) {
      return 'Grau en Disseny'
    } else if (groupName.startsWith('GBA')) {
      return 'Grau en Belles Arts'
    }
    return ''
  }

  return (
    <>
      <div className="print:hidden mb-4">
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="h-4 w-4" />
          Imprimir / Desar com a PDF
        </Button>
      </div>

      <div className="schedule-pdf-container">
        {groups.map((group, groupIndex) => (
          <div key={groupIndex} className="schedule-page">
            {/* Header */}
            <div className="schedule-header">
              <div>
                <h1 className="schedule-title">CURS {academicYear}</h1>
                <p className="course-subtitle">{getCourseType(group.name)} - {group.name}</p>
              </div>
              <div className="schedule-badges">
                <span className="schedule-badge">{group.year}</span>
                <span className="schedule-badge">{group.name}</span>
              </div>
            </div>

            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              {/* First semester */}
              {renderScheduleTable(assignments1[group.name] || [], 1, group.shift)}
              
              {/* Space between semesters */}
              <div className="semester-separator"></div>
              
              {/* Second semester */}
              {renderScheduleTable(assignments2[group.name] || [], 2, group.shift)}
            </div>
          </div>
        ))}
      </div>
    </>
  )
}