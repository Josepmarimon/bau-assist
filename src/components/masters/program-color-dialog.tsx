'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Program = Database['public']['Tables']['programs']['Row']

interface ProgramColorDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  program: Program | null
  onSuccess: () => void
}

const PRESET_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Emerald
  '#8B5CF6', // Violet
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#14B8A6', // Teal
  '#F97316', // Orange
  '#A855F7', // Purple
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#6366F1', // Indigo
  '#F43F5E', // Rose
  '#0EA5E9', // Sky
  '#FACC15', // Yellow
  '#22C55E', // Green
]

export function ProgramColorDialog({ 
  open, 
  onOpenChange, 
  program,
  onSuccess 
}: ProgramColorDialogProps) {
  const [selectedColor, setSelectedColor] = useState(program?.color || '#3B82F6')
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!program) return

    setLoading(true)

    try {
      const { data, error } = await supabase
        .from('programs')
        .update({ 
          color: selectedColor,
          updated_at: new Date().toISOString()
        })
        .eq('id', program.id)
        .select()
        .single()

      if (error) {
        console.error('Error updating color:', error.message || 'Unknown error')
        throw error
      }

      toast({
        title: 'Color actualitzat',
        description: `El color del programa ${program.name} s'ha actualitzat correctament`
      })

      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error updating color:', error?.message || error?.toString() || 'Unknown error')
      toast({
        title: 'Error',
        description: error?.message || 'No s\'ha pogut actualitzar el color',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  if (!program) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Editar color del programa</DialogTitle>
            <DialogDescription>
              Selecciona un color per a {program.name}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label>Color actual</Label>
              <div className="flex items-center gap-2">
                <div 
                  className="w-10 h-10 rounded-md border"
                  style={{ backgroundColor: selectedColor }}
                />
                <span className="text-sm font-mono">{selectedColor}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Colors predefinits</Label>
              <div className="grid grid-cols-8 gap-2">
                {PRESET_COLORS.map(color => (
                  <button
                    key={color}
                    type="button"
                    className={`w-10 h-10 rounded-md border-2 transition-all ${
                      selectedColor === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                    }`}
                    style={{ backgroundColor: color }}
                    onClick={() => setSelectedColor(color)}
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="custom-color">Color personalitzat</Label>
              <div className="flex gap-2">
                <input
                  id="custom-color"
                  type="color"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="h-10 w-20"
                />
                <input
                  type="text"
                  value={selectedColor}
                  onChange={(e) => setSelectedColor(e.target.value)}
                  className="flex-1 h-10 px-3 border rounded-md font-mono text-sm"
                  pattern="^#[0-9A-Fa-f]{6}$"
                  placeholder="#000000"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Vista prèvia</Label>
              <div 
                className="p-3 rounded-md text-white font-medium"
                style={{ backgroundColor: selectedColor }}
              >
                {program.name}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel·lar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardant...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}