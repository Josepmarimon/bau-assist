'use client'

import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { cn } from '@/lib/utils'
import { Users, Building2, GraduationCap, GripVertical } from 'lucide-react'

interface DraggableAssignmentProps {
  id: string
  subject: { name: string; code: string } | null
  teacher: { first_name: string; last_name: string } | null
  student_group: { name: string } | null
  classroom: { name: string; building: { code: string } } | null
  color: string
  style?: React.CSSProperties
}

export function DraggableAssignment({
  id,
  subject,
  teacher,
  student_group,
  classroom,
  color,
  style
}: DraggableAssignmentProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    isDragging,
  } = useDraggable({
    id: id,
  })

  const dragStyle = transform ? {
    transform: CSS.Translate.toString(transform),
  } : undefined

  return (
    <div
      ref={setNodeRef}
      style={{
        ...style,
        ...dragStyle,
      }}
      className={cn(
        "absolute left-1 right-1 p-2 rounded-lg border pointer-events-auto cursor-move hover:shadow-lg transition-all",
        color,
        isDragging && "opacity-50 z-50 shadow-2xl"
      )}
    >
      <div className="text-xs space-y-1">
        <div className="flex items-start justify-between gap-1">
          <div className="font-semibold truncate flex-1">
            {subject?.code || 'No Subject'}
          </div>
          <div 
            {...listeners}
            {...attributes}
            className="cursor-grab active:cursor-grabbing p-0.5 -m-0.5 hover:bg-black/10 rounded"
          >
            <GripVertical className="h-3 w-3" />
          </div>
        </div>
        {student_group && (
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span className="truncate">{student_group.name}</span>
          </div>
        )}
        {classroom && (
          <div className="flex items-center gap-1">
            <Building2 className="h-3 w-3" />
            <span>{classroom.name}</span>
          </div>
        )}
        {teacher && (
          <div className="flex items-center gap-1">
            <GraduationCap className="h-3 w-3" />
            <span className="truncate">
              {teacher.first_name} {teacher.last_name}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}