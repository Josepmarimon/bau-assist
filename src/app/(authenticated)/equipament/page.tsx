'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { EquipmentType } from '@/types/equipment.types'
import { EquipmentTypeDialog } from '@/components/equipment/equipment-type-dialog'
import { EQUIPMENT_CATEGORIES } from '@/lib/constants/equipment-types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Plus, Search, Edit, Trash2, Package } from 'lucide-react'
import * as Icons from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function EquipmentPage() {
  const [equipmentTypes, setEquipmentTypes] = useState<EquipmentType[]>([])
  const [filteredTypes, setFilteredTypes] = useState<EquipmentType[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedType, setSelectedType] = useState<EquipmentType | undefined>()
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [typeToDelete, setTypeToDelete] = useState<EquipmentType | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    fetchEquipmentTypes()
  }, [])

  useEffect(() => {
    const filtered = equipmentTypes.filter(type =>
      type.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      type.category.toLowerCase().includes(searchTerm.toLowerCase())
    )
    setFilteredTypes(filtered)
  }, [searchTerm, equipmentTypes])

  const fetchEquipmentTypes = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment_types')
        .select('*')
        .order('category', { ascending: true })
        .order('name', { ascending: true })

      if (error) throw error
      setEquipmentTypes(data || [])
      setFilteredTypes(data || [])
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

  const handleEdit = (type: EquipmentType) => {
    setSelectedType(type)
    setDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!typeToDelete) return

    try {
      const { error } = await supabase
        .from('equipment_types')
        .delete()
        .eq('id', typeToDelete.id)

      if (error) throw error

      toast({
        title: 'Tipus d\'equipament eliminat',
        description: 'El tipus d\'equipament s\'ha eliminat correctament.',
      })

      fetchEquipmentTypes()
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'No s\'ha pogut eliminar el tipus d\'equipament.',
        variant: 'destructive',
      })
    } finally {
      setDeleteDialogOpen(false)
      setTypeToDelete(null)
    }
  }

  const getIconComponent = (iconName?: string) => {
    if (!iconName) return <Package className="h-4 w-4" />
    const Icon = Icons[iconName as keyof typeof Icons] as any
    return Icon && typeof Icon === 'function' && Icon.prototype ? <Icon className="h-4 w-4" /> : <Package className="h-4 w-4" />
  }

  if (loading) {
    return <div className="flex items-center justify-center h-96">Carregant...</div>
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Gestió d'Equipament</h1>
          <p className="text-muted-foreground mt-2">
            Administra els tipus d'equipament disponibles per a les aules
          </p>
        </div>
        <Button
          onClick={() => {
            setSelectedType(undefined)
            setDialogOpen(true)
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nou tipus d'equipament
        </Button>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Cerca per nom, codi o categoria..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Icona</TableHead>
              <TableHead>Codi</TableHead>
              <TableHead>Nom</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Estat</TableHead>
              <TableHead className="text-right">Accions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTypes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No s'han trobat tipus d'equipament
                </TableCell>
              </TableRow>
            ) : (
              filteredTypes.map((type) => (
                <TableRow key={type.id}>
                  <TableCell>
                    <div className="flex items-center justify-center w-8 h-8 rounded-md bg-muted">
                      {getIconComponent(type.icon)}
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">{type.code}</TableCell>
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {EQUIPMENT_CATEGORIES[type.category as keyof typeof EQUIPMENT_CATEGORIES]?.label || type.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={type.is_active ? 'default' : 'secondary'}>
                      {type.is_active ? 'Actiu' : 'Inactiu'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(type)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setTypeToDelete(type)
                          setDeleteDialogOpen(true)
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <EquipmentTypeDialog
        equipmentType={selectedType}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={fetchEquipmentTypes}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Estàs segur?</AlertDialogTitle>
            <AlertDialogDescription>
              Aquesta acció eliminarà el tipus d'equipament "{typeToDelete?.name}".
              Si hi ha aules que utilitzen aquest tipus d'equipament, hauràs d'actualitzar-les manualment.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}