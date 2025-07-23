'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { PhotoGallery } from '@/components/classrooms/photo-gallery'
import { Building2, Users, MapPin, Monitor, Wifi, Clock } from 'lucide-react'
import { CLASSROOM_TYPE_LABELS } from '@/lib/constants/classroom-types'
import { createClient } from '@/lib/supabase/client'
import { EquipmentWithType } from '@/types/equipment.types'
import { EQUIPMENT_CATEGORIES } from '@/lib/constants/equipment-types'
import * as Icons from 'lucide-react'

interface ClassroomDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  classroom?: any
}

export function ClassroomDetailsDialog({ 
  open, 
  onOpenChange, 
  classroom
}: ClassroomDetailsDialogProps) {
  const [equipment, setEquipment] = useState<EquipmentWithType[]>([])
  const [loadingEquipment, setLoadingEquipment] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    if (classroom && open) {
      fetchEquipment()
    }
  }, [classroom, open])

  const fetchEquipment = async () => {
    if (!classroom) return
    
    setLoadingEquipment(true)
    try {
      const { data, error } = await supabase
        .from('equipment_inventory')
        .select('*, equipment_type:equipment_types(*)')
        .eq('classroom_id', classroom.id)
        .order('equipment_type(category)', { ascending: true })

      if (error) throw error
      setEquipment(data || [])
    } catch (error) {
      console.error('Error fetching equipment:', error)
    } finally {
      setLoadingEquipment(false)
    }
  }

  if (!classroom) return null

  const formatBuildingName = (building: string | null): string => {
    if (!building) return '-'
    if (building === 'G') return 'Edifici Granada'
    return building
  }

  const getIconComponent = (iconName?: string) => {
    if (!iconName) return null
    const Icon = Icons[iconName as keyof typeof Icons]
    return Icon ? <Icon className="h-4 w-4" /> : <Wifi className="h-4 w-4" />
  }

  const groupedEquipment = equipment.reduce((acc, item) => {
    const category = item.equipment_type?.category || 'other'
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(item)
    return acc
  }, {} as Record<string, EquipmentWithType[]>)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {classroom.name}
          </DialogTitle>
          <DialogDescription>
            Codi: {classroom.code}
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="info" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">Informació</TabsTrigger>
            <TabsTrigger value="photos">Fotos</TabsTrigger>
            <TabsTrigger value="equipment">Equipament</TabsTrigger>
          </TabsList>
          
          <TabsContent value="info" className="mt-6">
            <div className="grid gap-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Edifici</p>
                      <p className="text-sm text-muted-foreground">
                        {formatBuildingName(classroom.building)}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Planta</p>
                      <p className="text-sm text-muted-foreground">
                        {classroom.floor !== null ? `Planta ${classroom.floor}` : '-'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Users className="h-5 w-5 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="text-sm font-medium">Capacitat</p>
                      <p className="text-sm text-muted-foreground">
                        {classroom.capacity} persones
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-sm font-medium mb-2">Tipus d'aula</p>
                    <Badge variant={classroom.type === 'informatica' ? 'default' : 'secondary'}>
                      {CLASSROOM_TYPE_LABELS[classroom.type as keyof typeof CLASSROOM_TYPE_LABELS] || classroom.type}
                    </Badge>
                  </div>
                  
                  <div>
                    <p className="text-sm font-medium mb-2">Estat</p>
                    <Badge variant={classroom.is_available ? 'default' : 'destructive'}>
                      {classroom.is_available ? 'Disponible' : 'No disponible'}
                    </Badge>
                  </div>
                  
                  {(classroom.type === 'informatica' || classroom.type === 'Informàtica') && classroom.operating_system && (
                    <div className="flex items-start gap-3">
                      <Monitor className="h-5 w-5 text-muted-foreground mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">Sistema Operatiu</p>
                        <p className="text-sm text-muted-foreground">
                          {classroom.operating_system}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Timestamps */}
              <div className="border-t pt-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>
                    Creat: {new Date(classroom.created_at).toLocaleDateString('ca-ES')}
                  </span>
                  {classroom.updated_at && (
                    <span>
                      • Actualitzat: {new Date(classroom.updated_at).toLocaleDateString('ca-ES')}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="photos" className="mt-6">
            <PhotoGallery 
              photos={classroom.photos || []} 
              classroomName={classroom.name}
            />
          </TabsContent>
          
          <TabsContent value="equipment" className="mt-6">
            <div className="space-y-4">
              {loadingEquipment ? (
                <p className="text-muted-foreground text-center py-8">
                  Carregant equipament...
                </p>
              ) : equipment.length > 0 ? (
                <div className="space-y-6">
                  {Object.entries(groupedEquipment).map(([category, items]) => (
                    <div key={category} className="space-y-3">
                      <h3 className="font-medium text-sm text-muted-foreground flex items-center gap-2">
                        {getIconComponent(EQUIPMENT_CATEGORIES[category as keyof typeof EQUIPMENT_CATEGORIES]?.icon)}
                        {EQUIPMENT_CATEGORIES[category as keyof typeof EQUIPMENT_CATEGORIES]?.label || category}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {items.map((item) => (
                          <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                            <div className="flex items-center gap-3">
                              {getIconComponent(item.equipment_type?.icon)}
                              <div>
                                <p className="font-medium text-sm">{item.equipment_type?.name}</p>
                                {item.quantity > 1 && (
                                  <p className="text-xs text-muted-foreground">
                                    Quantitat: {item.quantity}
                                  </p>
                                )}
                              </div>
                            </div>
                            {item.status !== 'operational' && (
                              <Badge variant={item.status === 'maintenance' ? 'secondary' : 'destructive'} className="text-xs">
                                {item.status === 'maintenance' ? 'Manteniment' : 'Avariat'}
                              </Badge>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  No hi ha equipament registrat
                </p>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}