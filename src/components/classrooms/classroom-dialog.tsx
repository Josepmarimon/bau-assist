'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CLASSROOM_TYPES, CLASSROOM_TYPE_LABELS } from '@/lib/constants/classroom-types'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PhotoUpload } from '@/components/ui/photo-upload'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'
import { EquipmentSelector } from '@/components/equipment/equipment-selector'
import { SoftwareSelector } from '@/components/software/software-selector'
import { Switch } from '@/components/ui/switch'

interface Photo {
  url: string
  caption: string
  uploaded_at: string
}

interface ClassroomDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classroom?: any
  onSuccess?: () => void
}

export function ClassroomDialog({ 
  open, 
  onOpenChange, 
  classroom,
  onSuccess 
}: ClassroomDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    building: '',
    floor: 0,
    capacity: 30,
    type: CLASSROOM_TYPES.POLIVALENT as string,
    photos: [] as Photo[],
    is_public: false,
    description: ''
  })
  
  const supabase = createClient()

  useEffect(() => {
    if (classroom) {
      setFormData({
        code: classroom.code || '',
        name: classroom.name || '',
        building: classroom.building || '',
        floor: classroom.floor || 0,
        capacity: classroom.capacity || 30,
        type: classroom.type || CLASSROOM_TYPES.POLIVALENT,
        photos: classroom.photos || [],
        is_public: classroom.is_public || false,
        description: classroom.description || ''
      })
    } else {
      setFormData({
        code: '',
        name: '',
        building: '',
        floor: 0,
        capacity: 30,
        type: CLASSROOM_TYPES.POLIVALENT,
        photos: [],
        is_public: false,
        description: ''
      })
    }
  }, [classroom])

  const handleRefresh = () => {
    // This function is called when equipment is updated
    // We could refresh the classroom data here if needed
    onSuccess?.()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (classroom?.id) {
        // Update existing classroom
        const { error } = await supabase
          .from('classrooms')
          .update({
            code: formData.code,
            name: formData.name,
            building: formData.building,
            floor: formData.floor,
            capacity: formData.capacity,
            type: formData.type,
            photos: formData.photos,
            is_public: formData.is_public,
            description: formData.description,
            updated_at: new Date().toISOString()
          })
          .eq('id', classroom.id)

        if (error) throw error
        toast.success('Aula actualitzada correctament')
      } else {
        // Create new classroom
        const { error } = await supabase
          .from('classrooms')
          .insert({
            code: formData.code,
            name: formData.name,
            building: formData.building,
            floor: formData.floor,
            capacity: formData.capacity,
            type: formData.type,
            photos: formData.photos,
            is_available: true,
            is_public: formData.is_public,
            description: formData.description
          })

        if (error) throw error
        toast.success('Aula creada correctament')
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (error: any) {
      console.error('Error saving classroom:', error)
      toast.error(error.message || 'Error al guardar l\'aula')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {classroom ? 'Editar Aula' : 'Nova Aula'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="info" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="info">Informació</TabsTrigger>
              <TabsTrigger value="equipment">Equipament</TabsTrigger>
              <TabsTrigger value="software">Software 🔧</TabsTrigger>
              <TabsTrigger value="photos">Fotos</TabsTrigger>
            </TabsList>
            
            <TabsContent value="info" className="mt-3 h-[450px] overflow-y-auto px-2">
              <div className="space-y-4">
                {/* Two column grid for compact fields */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Column 1 */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="code">Codi</Label>
                      <Input
                        id="code"
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="building">Edifici</Label>
                      <Input
                        id="building"
                        value={formData.building}
                        onChange={(e) => setFormData({ ...formData, building: e.target.value })}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="capacity">Capacitat</Label>
                      <Input
                        id="capacity"
                        type="number"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })}
                        required
                        min="1"
                      />
                    </div>
                  </div>
                  
                  {/* Column 2 */}
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label htmlFor="name">Nom</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="floor">Planta</Label>
                      <Input
                        id="floor"
                        type="number"
                        value={formData.floor}
                        onChange={(e) => setFormData({ ...formData, floor: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <Label htmlFor="type">Tipus</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value) => setFormData({ ...formData, type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(CLASSROOM_TYPE_LABELS).map(([value, label]) => (
                            <SelectItem key={value} value={value}>
                              {label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                
                {/* Full width fields */}
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_public"
                      checked={formData.is_public}
                      onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                    />
                    <Label htmlFor="is_public" className="font-normal text-sm text-muted-foreground">
                      Fer visible aquesta aula al directori públic
                    </Label>
                  </div>
                  
                  <div className="space-y-1">
                    <Label htmlFor="description">Descripció</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={4}
                      placeholder="Descripció pública de l'aula, les seves característiques i usos recomanats..."
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="equipment" className="mt-3 h-[450px] overflow-y-auto">
              <EquipmentSelector 
                classroomId={classroom?.id || ''} 
                onEquipmentChange={handleRefresh}
              />
            </TabsContent>
            
            <TabsContent value="software" className="mt-3 h-[450px] overflow-y-auto">
              <SoftwareSelector 
                classroomId={classroom?.id || ''} 
                onSoftwareChange={handleRefresh}
              />
            </TabsContent>
            
            <TabsContent value="photos" className="mt-3 h-[450px] overflow-y-auto">
              <PhotoUpload
                photos={formData.photos}
                onPhotosChange={(photos) => setFormData({ ...formData, photos })}
                classroomCode={formData.code || classroom?.code || 'temp'}
              />
            </TabsContent>
          </Tabs>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
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