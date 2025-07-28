'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import type { Database } from '@/types/database.types'

type Program = Database['public']['Tables']['programs']['Row']
type ProgramType = Database['public']['Enums']['program_type']

interface ProgramFormDialogProps {
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

export function ProgramFormDialog({ open, onOpenChange, program, onSuccess }: ProgramFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'grau' as ProgramType,
    duration_years: 1,
    credits: 0,
    coordinator_name: '',
    coordinator_email: '',
    description: '',
    color: '#3B82F6',
    active: true
  })
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    if (program) {
      setFormData({
        code: program.code,
        name: program.name,
        type: program.type,
        duration_years: program.duration_years || 1,
        credits: program.credits || 0,
        coordinator_name: program.coordinator_name || '',
        coordinator_email: program.coordinator_email || '',
        description: program.description || '',
        color: program.color || '#3B82F6',
        active: program.active
      })
    } else {
      setFormData({
        code: '',
        name: '',
        type: 'grau',
        duration_years: 1,
        credits: 0,
        coordinator_name: '',
        coordinator_email: '',
        description: '',
        color: '#3B82F6',
        active: true
      })
    }
  }, [program])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Check authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      console.log('Current user:', user)
      if (authError) {
        console.error('Auth error:', authError)
        throw new Error('No estàs autenticat')
      }
      if (program) {
        // Update existing program
        const updateData = {
          ...formData,
          updated_at: new Date().toISOString()
        }
        console.log('Updating program with data:', JSON.stringify(updateData, null, 2))
        console.log('Program ID:', program.id)
        
        const { data, error } = await supabase
          .from('programs')
          .update(updateData)
          .eq('id', program.id)
          .select()

        console.log('Update result:', { data, error })
        
        if (error) {
          console.error('Supabase error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          throw error
        }

        toast({
          title: 'Programa actualitzat',
          description: 'El programa s\'ha actualitzat correctament'
        })
      } else {
        // Create new program
        console.log('Creating program with data:', JSON.stringify(formData, null, 2))
        
        const { data, error } = await supabase
          .from('programs')
          .insert([formData])
          .select()

        console.log('Insert result:', { data, error })
        
        if (error) {
          console.error('Supabase error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          })
          throw error
        }

        toast({
          title: 'Programa creat',
          description: 'El programa s\'ha creat correctament'
        })
      }

      onSuccess()
    } catch (error: any) {
      console.error('Full error object:', error)
      console.error('Error type:', typeof error)
      console.error('Error constructor:', error?.constructor?.name)
      console.error('Error message:', error?.message)
      console.error('Error string:', error?.toString())
      console.error('Error JSON:', JSON.stringify(error))
      
      let errorMessage = 'No s\'ha pogut guardar el programa'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.details) {
        errorMessage = error.details
      } else if (error?.hint) {
        errorMessage = error.hint
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const programTypeLabels = {
    grau: 'Grau',
    master: 'Màster',
    postgrau: 'Postgrau'
  }

  const getDefaultDuration = (type: ProgramType) => {
    switch (type) {
      case 'grau': return 4
      case 'master': return 1
      case 'postgrau': return 1
    }
  }

  const getDefaultCredits = (type: ProgramType) => {
    switch (type) {
      case 'grau': return 240
      case 'master': return 60
      case 'postgrau': return 30
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {program ? 'Editar programa' : 'Afegir nou programa'}
            </DialogTitle>
            <DialogDescription>
              {program ? 'Modifica les dades del programa acadèmic' : 'Crea un nou programa acadèmic'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Codi</Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="Ex: MFA, GD, PGD"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Tipus de programa</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: ProgramType) => {
                    setFormData({ 
                      ...formData, 
                      type: value,
                      duration_years: getDefaultDuration(value),
                      credits: getDefaultCredits(value)
                    })
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(programTypeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nom del programa</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Màster en Arts Visuals"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration_years">Durada (anys)</Label>
                <Input
                  id="duration_years"
                  type="number"
                  min="1"
                  max="6"
                  value={formData.duration_years}
                  onChange={(e) => setFormData({ ...formData, duration_years: parseInt(e.target.value) || 1 })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="credits">Crèdits ECTS</Label>
                <Input
                  id="credits"
                  type="number"
                  min="0"
                  value={formData.credits}
                  onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) || 0 })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="coordinator_name">Nom del coordinador/a</Label>
                <Input
                  id="coordinator_name"
                  value={formData.coordinator_name}
                  onChange={(e) => setFormData({ ...formData, coordinator_name: e.target.value })}
                  placeholder="Ex: Joan Garcia"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="coordinator_email">Email del coordinador/a</Label>
                <Input
                  id="coordinator_email"
                  type="email"
                  value={formData.coordinator_email}
                  onChange={(e) => setFormData({ ...formData, coordinator_email: e.target.value })}
                  placeholder="Ex: joan.garcia@bau.cat"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripció</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descripció del programa..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Color del programa</Label>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-10 h-10 rounded-md border"
                    style={{ backgroundColor: formData.color }}
                  />
                  <Input
                    type="text"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-32 font-mono text-sm"
                    pattern="^#[0-9A-Fa-f]{6}$"
                    placeholder="#000000"
                  />
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="h-10 w-10 cursor-pointer"
                  />
                </div>
                <div className="grid grid-cols-8 gap-2">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      className={`w-full h-8 rounded-md border-2 transition-all ${
                        formData.color === color ? 'border-gray-900 scale-110' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                      onClick={() => setFormData({ ...formData, color })}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active" className="cursor-pointer">
                Programa actiu
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel·lar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Guardant...' : program ? 'Actualitzar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}