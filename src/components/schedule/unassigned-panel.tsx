'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { DraggableAssignment } from './draggable-assignment'
import { Package2 } from 'lucide-react'
import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

interface UnassignedAssignment {
  id: string
  subject: { name: string; code: string }
  teacher: { first_name: string; last_name: string }
  student_group: { name: string }
  classroom: { name: string; building: { code: string } }
}

interface UnassignedPanelProps {
  assignments: UnassignedAssignment[]
}

const UNASSIGNED_COLORS = [
  'bg-gray-100 text-gray-700 border-gray-200',
  'bg-slate-100 text-slate-700 border-slate-200',
]

export function UnassignedPanel({ assignments }: UnassignedPanelProps) {
  const {
    isOver,
    setNodeRef,
  } = useDroppable({
    id: 'unassigned-drop',
  })

  return (
    <Card className={cn("h-full transition-colors", isOver && "ring-2 ring-primary")}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Package2 className="h-4 w-4" />
          Assignacions Pendents
        </CardTitle>
      </CardHeader>
      <CardContent ref={setNodeRef}>
        <ScrollArea className="h-[600px] pr-4">
          {assignments.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              <Package2 className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No hi ha assignacions pendents</p>
            </div>
          ) : (
            <div className="space-y-3">
              {assignments.map((assignment, index) => (
                <div key={assignment.id} className="relative h-20">
                  <DraggableAssignment
                    id={assignment.id}
                    subject={assignment.subject}
                    teacher={assignment.teacher}
                    student_group={assignment.student_group}
                    classroom={assignment.classroom}
                    color={UNASSIGNED_COLORS[index % UNASSIGNED_COLORS.length]}
                    style={{
                      position: 'relative',
                      top: 0,
                      height: 'auto',
                      left: 0,
                      right: 0,
                    }}
                  />
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}