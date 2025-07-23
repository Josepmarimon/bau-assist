'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EquipmentType, EquipmentWithType } from '@/types/equipment.types'
import { EQUIPMENT_CATEGORIES, EQUIPMENT_STATUS } from '@/lib/constants/equipment-types'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useToast } from '@/hooks/use-toast'
import * as Icons from 'lucide-react'
import { cn } from '@/lib/utils'

interface EquipmentSelectorProps {
  classroomId: string
  onEquipmentChange?: () => void
}

export function EquipmentSelector({ classroomId, onEquipmentChange }: EquipmentSelectorProps) {
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [classroomEquipment, setClassroomEquipment] = useState<EquipmentWithType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchData()
  }, [classroomId])

  const fetchData = async () => {
    try {
      const [typesResponse, inventoryResponse] = await Promise.all([
        supabase
          .from('equipment_types')
          .select('*')
          .eq('is_active', true)
          .order('category', { ascending: true })
          .order('name', { ascending: true }),
        supabase
          .from('equipment_inventory')
          .select('*, equipment_type:equipment_types(*)')
          .eq('classroom_id', classroomId)
      ])

      if (typesResponse.error) throw typesResponse.error
      if (inventoryResponse.error) throw inventoryResponse.error

      setEquipmentTypes(typesResponse.data || [])
      setClassroomEquipment(inventoryResponse.data || [])
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No s\'han pogut carregar els tipus d\'equipament.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const isEquipmentSelected = (equipmentTypeId: string) => {
    return classroomEquipment.some(eq => eq.equipment_type_id === equipmentTypeId)
  }

  const getEquipmentQuantity = (equipmentTypeId: string) => {
    const equipment = classroomEquipment.find(eq => eq.equipment_type_id === equipmentTypeId)
    return equipment?.quantity || 1
  }

  const handleEquipmentToggle = async (equipmentType: EquipmentType, checked: boolean) => {
    setSaving(true)
    
    try {
      if (checked) {
        const { error } = await supabase
          .from('equipment_inventory')
          .insert([{
            equipment_type_id: equipmentType.id,
            classroom_id: classroomId,
            quantity: 1,
            status: 'operational'
          }])
        
        if (error && error.code !== '23505') throw error
      } else {
        const { error } = await supabase
          .from('equipment_inventory')
          .delete()
          .match({ 
            equipment_type_id: equipmentType.id,
            classroom_id: classroomId 
          })
        
        if (error) throw error
      }

      await fetchData()
      onEquipmentChange?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No s\'ha pogut actualitzar l\'equipament.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleQuantityChange = async (equipmentTypeId: string, quantity: number) => {
    if (quantity < 1) return
    
    setSaving(true)
    
    try {
      const { error } = await supabase
        .from('equipment_inventory')
        .update({ quantity })
        .match({ 
          equipment_type_id: equipmentTypeId,
          classroom_id: classroomId 
        })
      
      if (error) throw error

      await fetchData()
      onEquipmentChange?.()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: 'No s\'ha pogut actualitzar la quantitat.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const getIconComponent = (iconName?: string) => {
    if (!iconName) return null
    const Icon = Icons[iconName as keyof typeof Icons] as any
    return Icon && typeof Icon === 'function' ? <Icon className="h-4 w-4" /> : null
  }

  const groupedEquipment = equipmentTypes.reduce((acc, type) => {
    // Exclude office category
    if (type.category === 'office') {
      return acc
    }
    if (!acc[type.category]) {
      acc[type.category] = []
    }
    acc[type.category].push(type)
    return acc
  }, {} as Record<string, EquipmentType[]>)

  if (loading) {
    return <div className="text-center py-4">Carregant equipament...</div>
  }

  return (
    <div className="space-y-4">
      <Tabs defaultValue={Object.keys(groupedEquipment)[0]} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4">
          {Object.entries(EQUIPMENT_CATEGORIES)
            .filter(([key]) => key !== 'office')
            .map(([key, category]) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                <div className="flex items-center gap-1">
                  {getIconComponent(category.icon)}
                  <span className="hidden sm:inline">{category.label}</span>
                </div>
              </TabsTrigger>
            ))}
        </TabsList>
        
        {Object.entries(groupedEquipment).map(([category, types]) => (
          <TabsContent key={category} value={category}>
            <Card>
              <CardContent className="pt-4">
                <ScrollArea className="h-[380px] pr-4">
                  <div className="space-y-3">
                    {types.map((type) => {
                      const isSelected = isEquipmentSelected(type.id)
                      const quantity = getEquipmentQuantity(type.id)
                      
                      return (
                        <div
                          key={type.id}
                          className={cn(
                            "flex items-center justify-between p-3 rounded-lg border transition-colors",
                            isSelected ? "bg-accent/50 border-accent" : "hover:bg-accent/20"
                          )}
                        >
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              id={type.id}
                              checked={isSelected}
                              onCheckedChange={(checked) => 
                                handleEquipmentToggle(type, checked as boolean)
                              }
                              disabled={saving}
                            />
                            <Label
                              htmlFor={type.id}
                              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                {getIconComponent(type.icon)}
                                {type.name}
                              </div>
                            </Label>
                          </div>
                          
                          {isSelected && (
                            <div className="flex items-center gap-2">
                              <Label htmlFor={`quantity-${type.id}`} className="text-xs text-muted-foreground">
                                Quantitat:
                              </Label>
                              <Input
                                id={`quantity-${type.id}`}
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => 
                                  handleQuantityChange(type.id, parseInt(e.target.value) || 1)
                                }
                                className="w-16 h-8 text-sm"
                                disabled={saving}
                              />
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  )
}