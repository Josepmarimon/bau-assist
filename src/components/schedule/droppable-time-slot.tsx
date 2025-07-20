'use client'

import { useDroppable } from '@dnd-kit/core'
import { cn } from '@/lib/utils'

interface DroppableTimeSlotProps {
  id: string
  children?: React.ReactNode
  isActive?: boolean
}

export function DroppableTimeSlot({ id, children, isActive }: DroppableTimeSlotProps) {
  const {
    isOver,
    setNodeRef,
  } = useDroppable({
    id: id,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-r last:border-r-0 relative h-full transition-colors",
        isOver && "bg-blue-50/50 border-blue-300",
        isActive && "bg-yellow-50/30"
      )}
    >
      {children}
    </div>
  )
}