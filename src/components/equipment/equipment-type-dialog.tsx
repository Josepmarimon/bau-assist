'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { createClient } from '@/lib/supabase/client'
import { EquipmentType, EquipmentCategory } from '@/types/equipment.types'
import { EQUIPMENT_CATEGORIES, EQUIPMENT_ICONS } from '@/lib/constants/equipment-types'
import * as Icons from 'lucide-react'

const formSchema = z.object({
  code: z.string().min(1, 'El codi és obligatori').max(50),
  name: z.string().min(1, 'El nom és obligatori').max(200),
  category: z.enum(['audiovisual', 'computing', 'furniture', 'climate', 'office'] as const),
  icon: z.string().optional(),
  description: z.string().optional(),
})

type FormData = z.infer<typeof formSchema>

interface EquipmentTypeDialogProps {
  equipmentType?: EquipmentType
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function EquipmentTypeDialog({
  equipmentType,
  open,
  onOpenChange,
  onSuccess,
}: EquipmentTypeDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()
  const supabase = createClient()

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      code: equipmentType?.code || '',
      name: equipmentType?.name || '',
      category: equipmentType?.category || 'audiovisual',
      icon: equipmentType?.icon || '',
      description: equipmentType?.description || '',
    },
  })

  const onSubmit = async (data: FormData) => {
    setIsLoading(true)

    try {
      if (equipmentType) {
        const { error } = await supabase
          .from('equipment_types')
          .update({
            ...data,
            updated_at: new Date().toISOString(),
          })
          .eq('id', equipmentType.id)

        if (error) throw error

        toast({
          title: 'Tipus d\'equipament actualitzat',
          description: 'El tipus d\'equipament s\'ha actualitzat correctament.',
        })
      } else {
        const { error } = await supabase
          .from('equipment_types')
          .insert([data])

        if (error) throw error

        toast({
          title: 'Tipus d\'equipament creat',
          description: 'El nou tipus d\'equipament s\'ha creat correctament.',
        })
      }

      onSuccess?.()
      onOpenChange(false)
      form.reset()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'S\'ha produït un error.',
        variant: 'destructive',
      })
    } finally {
      setIsLoading(false)
    }
  }

  const getIconComponent = (iconName: string) => {
    const Icon = Icons[iconName as keyof typeof Icons] as any
    return Icon && typeof Icon === 'function' ? <Icon className="h-4 w-4" /> : null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {equipmentType ? 'Editar' : 'Nou'} tipus d'equipament
          </DialogTitle>
          <DialogDescription>
            {equipmentType
              ? 'Modifica les dades del tipus d\'equipament.'
              : 'Crea un nou tipus d\'equipament per a les aules.'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Codi</FormLabel>
                  <FormControl>
                    <Input placeholder="smarttv" {...field} />
                  </FormControl>
                  <FormDescription>
                    Codi únic per identificar el tipus d'equipament
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom</FormLabel>
                  <FormControl>
                    <Input placeholder="SmartTV" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(EQUIPMENT_CATEGORIES).map(([key, value]) => (
                        <SelectItem key={key} value={key}>
                          <div className="flex items-center gap-2">
                            {getIconComponent(value.icon)}
                            {value.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="icon"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Icona (opcional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona una icona" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(EQUIPMENT_ICONS).map(([key, iconName]) => (
                        <SelectItem key={key} value={iconName}>
                          <div className="flex items-center gap-2">
                            {getIconComponent(iconName)}
                            {key}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Icona per representar aquest tipus d'equipament
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripció (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descripció del tipus d'equipament..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel·lar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Guardant...' : 'Guardar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}