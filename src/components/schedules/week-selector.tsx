"use client"

import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface WeekSelectorProps {
  isFullSemester: boolean
  selectedWeeks: number[]
  onFullSemesterChange: (value: boolean) => void
  onWeeksChange: (weeks: number[]) => void
  totalWeeks?: number
}

export function WeekSelector({
  isFullSemester,
  selectedWeeks,
  onFullSemesterChange,
  onWeeksChange,
  totalWeeks = 15
}: WeekSelectorProps) {
  const handleWeekToggle = (week: number) => {
    if (selectedWeeks.includes(week)) {
      onWeeksChange(selectedWeeks.filter((w) => w !== week))
    } else {
      onWeeksChange([...selectedWeeks, week].sort((a, b) => a - b))
    }
  }

  const handleSelectAll = () => {
    onWeeksChange(Array.from({ length: totalWeeks }, (_, i) => i + 1))
  }

  const handleClearAll = () => {
    onWeeksChange([])
  }

  const formatWeekRanges = (weeks: number[]): string => {
    if (weeks.length === 0) return ""
    
    const sortedWeeks = [...weeks].sort((a, b) => a - b)
    const ranges: string[] = []
    let start = sortedWeeks[0]
    let end = sortedWeeks[0]
    
    for (let i = 1; i <= sortedWeeks.length; i++) {
      if (i === sortedWeeks.length || sortedWeeks[i] !== end + 1) {
        if (start === end) {
          ranges.push(`${start}`)
        } else {
          ranges.push(`${start}-${end}`)
        }
        if (i < sortedWeeks.length) {
          start = sortedWeeks[i]
          end = sortedWeeks[i]
        }
      } else {
        end = sortedWeeks[i]
      }
    }
    
    return ranges.join(', ')
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Switch
            checked={!isFullSemester}
            onCheckedChange={(checked) => {
              onFullSemesterChange(!checked)
              if (!checked) {
                onWeeksChange([])
              }
            }}
          />
          <Label className="text-sm font-normal">
            Només setmanes específiques
          </Label>
        </div>
      </div>
      
      {!isFullSemester && (
        <div className="space-y-3">
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: totalWeeks }, (_, i) => i + 1).map((week) => (
              <div
                key={week}
                className={cn(
                  "flex items-center justify-center p-2 border rounded-md cursor-pointer transition-colors",
                  selectedWeeks.includes(week)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "hover:bg-accent hover:text-accent-foreground"
                )}
                onClick={() => handleWeekToggle(week)}
              >
                <span className="text-sm font-medium">{week}</span>
              </div>
            ))}
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {selectedWeeks.length > 0 && (
                <span className="text-sm text-muted-foreground">
                  Setmanes: {formatWeekRanges(selectedWeeks)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSelectAll}
                disabled={selectedWeeks.length === totalWeeks}
              >
                Seleccionar tot
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                disabled={selectedWeeks.length === 0}
              >
                Esborrar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}