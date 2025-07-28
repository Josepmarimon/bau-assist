'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
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
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Checkbox } from '@/components/ui/checkbox'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface Software {
  id?: string
  name: string
  version?: string
  category: string
  license_type: string
  operating_systems?: string[]
  license_model?: string
  license_quantity?: number
  license_cost?: number
  last_renewal_date?: string
  expiry_date?: string
  renewal_reminder_days?: number
  provider_name?: string
  provider_email?: string
  provider_phone?: string
  notes?: string
  license_url?: string
}

interface SoftwareDialogProps {
  software?: Software
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function SoftwareDialog({ 
  software, 
  open, 
  onOpenChange,
  onSuccess 
}: SoftwareDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()
  const [formData, setFormData] = useState<Software>({
    name: '',
    version: '',
    category: '',
    license_type: '',
    operating_systems: [],
    license_model: 'installed',
    license_quantity: 1,
    license_cost: undefined,
    last_renewal_date: '',
    expiry_date: '',
    renewal_reminder_days: 30,
    provider_name: '',
    provider_email: '',
    provider_phone: '',
    notes: '',
    license_url: ''
  })

  // Helper function to format date for input
  const formatDateForInput = (dateString: string | undefined) => {
    if (!dateString) return ''
    const date = new Date(dateString)
    return date.toISOString().split('T')[0]
  }

  // Update form data when software prop changes
  useEffect(() => {
    if (software) {
      setFormData({
        name: software.name || '',
        version: software.version || '',
        category: software.category || '',
        license_type: software.license_type || '',
        operating_systems: software.operating_systems || [],
        license_model: software.license_model || 'installed',
        license_quantity: software.license_quantity || 1,
        license_cost: software.license_cost || undefined,
        last_renewal_date: formatDateForInput(software.last_renewal_date),
        expiry_date: formatDateForInput(software.expiry_date),
        renewal_reminder_days: software.renewal_reminder_days || 30,
        provider_name: software.provider_name || '',
        provider_email: software.provider_email || '',
        provider_phone: software.provider_phone || '',
        notes: software.notes || '',
        license_url: software.license_url || ''
      })
    } else {
      // Reset form when creating new software
      setFormData({
        name: '',
        version: '',
        category: '',
        license_type: '',
        operating_systems: [],
        license_model: 'installed',
        license_quantity: 1,
        license_cost: undefined,
        last_renewal_date: '',
        expiry_date: '',
        renewal_reminder_days: 30,
        provider_name: '',
        provider_email: '',
        provider_phone: '',
        notes: '',
        license_url: ''
      })
    }
  }, [software])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validate required fields
      if (!formData.name || !formData.category || !formData.license_type) {
        toast.error('Si us plau, omple tots els camps obligatoris')
        setIsLoading(false)
        return
      }

      // Prepare data with only existing columns
      const baseData = {
        name: formData.name.trim(),
        version: formData.version?.trim() || null,
        category: formData.category,
        license_type: formData.license_type,
        operating_systems: formData.operating_systems || []
      }
      
      console.log('Base data to save:', baseData)

      // Check if migration is applied by testing if we can update with new fields
      let migrationApplied = false
      try {
        // Test if new columns exist by trying a small query
        const { error: testError } = await supabase
          .from('software')
          .select('expiry_date')
          .limit(1)
        
        migrationApplied = !testError
      } catch {
        migrationApplied = false
      }

      // Add new fields only if migration is applied
      const dataToSave = migrationApplied ? {
        ...baseData,
        license_model: formData.license_model,
        license_quantity: formData.license_quantity,
        license_cost: formData.license_cost || null,
        last_renewal_date: formData.last_renewal_date || null,
        expiry_date: formData.expiry_date || null,
        renewal_reminder_days: formData.renewal_reminder_days,
        provider_name: formData.provider_name || null,
        provider_email: formData.provider_email || null,
        provider_phone: formData.provider_phone || null,
        notes: formData.notes || null,
        license_url: formData.license_url || null
      } : baseData

      if (software?.id) {
        // Update existing software
        const updateData = migrationApplied ? {
          ...dataToSave,
          updated_at: new Date().toISOString()
        } : dataToSave

        console.log('Updating software with data:', updateData)
        
        const { data, error } = await supabase
          .from('software')
          .update(updateData)
          .eq('id', software.id)
          .select()

        console.log('Update response:', { data, error })
        
        if (error) throw error
        toast.success('Programari actualitzat correctament')
      } else {
        // Create new software
        console.log('Creating software with data:', dataToSave)
        
        const { data, error } = await supabase
          .from('software')
          .insert(dataToSave)
          .select()

        console.log('Insert response:', { data, error })
        
        if (error) throw error
        toast.success('Programari afegit correctament')
      }

      if (!migrationApplied) {
        toast.info('Algunes funcionalitats avançades no estan disponibles fins que s\'apliqui la migració de la base de dades.')
      }
      
      onOpenChange(false)
      onSuccess?.()
    } catch (error: any) {
      console.error('Error saving software:', error)
      
      // Better error handling
      let errorMessage = 'Error en guardar el programari'
      
      if (error?.message) {
        errorMessage = error.message
      } else if (error?.error_description) {
        errorMessage = error.error_description
      } else if (error?.code) {
        errorMessage = `Error: ${error.code}`
      } else if (typeof error === 'string') {
        errorMessage = error
      }
      
      toast.error(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {software ? 'Editar' : 'Afegir'} Programari
            </DialogTitle>
            <DialogDescription>
              {software 
                ? 'Modifica la informació del programari' 
                : 'Afegeix un nou programari al sistema'}
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="basic" className="py-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basic">Informació Bàsica</TabsTrigger>
              <TabsTrigger value="license">Llicència</TabsTrigger>
              <TabsTrigger value="provider">Proveïdor</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom del programari *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="version">Versió</Label>
                  <Input
                    id="version"
                    value={formData.version || ''}
                    onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) => setFormData({ ...formData, category: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General</SelectItem>
                      <SelectItem value="3d_modeling">Modelat 3D</SelectItem>
                      <SelectItem value="design">Disseny</SelectItem>
                      <SelectItem value="programming">Programació</SelectItem>
                      <SelectItem value="web_development">Desenvolupament Web</SelectItem>
                      <SelectItem value="cad">CAD</SelectItem>
                      <SelectItem value="audio">Àudio</SelectItem>
                      <SelectItem value="render">Render</SelectItem>
                      <SelectItem value="patronatge">Patronatge</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Sistemes operatius compatibles</Label>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="windows"
                      checked={formData.operating_systems?.includes('Windows')}
                      onCheckedChange={(checked) => {
                        const os = formData.operating_systems || []
                        if (checked) {
                          setFormData({ ...formData, operating_systems: [...os, 'Windows'] })
                        } else {
                          setFormData({ ...formData, operating_systems: os.filter(o => o !== 'Windows') })
                        }
                      }}
                    />
                    <Label htmlFor="windows" className="font-normal">Windows</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="macos"
                      checked={formData.operating_systems?.includes('macOS')}
                      onCheckedChange={(checked) => {
                        const os = formData.operating_systems || []
                        if (checked) {
                          setFormData({ ...formData, operating_systems: [...os, 'macOS'] })
                        } else {
                          setFormData({ ...formData, operating_systems: os.filter(o => o !== 'macOS') })
                        }
                      }}
                    />
                    <Label htmlFor="macos" className="font-normal">macOS</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="linux"
                      checked={formData.operating_systems?.includes('Linux')}
                      onCheckedChange={(checked) => {
                        const os = formData.operating_systems || []
                        if (checked) {
                          setFormData({ ...formData, operating_systems: [...os, 'Linux'] })
                        } else {
                          setFormData({ ...formData, operating_systems: os.filter(o => o !== 'Linux') })
                        }
                      }}
                    />
                    <Label htmlFor="linux" className="font-normal">Linux</Label>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Notes addicionals sobre el programari..."
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="license" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="license_type">Tipus de llicència *</Label>
                  <Select
                    value={formData.license_type}
                    onValueChange={(value) => setFormData({ ...formData, license_type: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el tipus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="free">Gratuïta</SelectItem>
                      <SelectItem value="paid">De pagament</SelectItem>
                      <SelectItem value="educational">Educativa</SelectItem>
                      <SelectItem value="subscription">Subscripció</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license_model">Model de llicència</Label>
                  <Select
                    value={formData.license_model}
                    onValueChange={(value) => setFormData({ ...formData, license_model: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona el model" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="installed">Instal·lada</SelectItem>
                      <SelectItem value="floating">Flotant</SelectItem>
                      <SelectItem value="pay_per_use">Pagament per ús</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="license_url">URL per descarregar llicències</Label>
                <Input
                  id="license_url"
                  type="url"
                  value={formData.license_url || ''}
                  onChange={(e) => setFormData({ ...formData, license_url: e.target.value })}
                  placeholder="https://exemple.com/llicencies"
                />
                <p className="text-sm text-muted-foreground">
                  Enllaç per descarregar o gestionar les llicències
                </p>
              </div>

              {formData.license_type !== 'free' && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="license_quantity">Quantitat de llicències</Label>
                      <Input
                        id="license_quantity"
                        type="number"
                        min="1"
                        value={formData.license_quantity || 1}
                        onChange={(e) => setFormData({ ...formData, license_quantity: parseInt(e.target.value) || 1 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="license_cost">Cost per llicència (€)</Label>
                      <Input
                        id="license_cost"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.license_cost || ''}
                        onChange={(e) => setFormData({ ...formData, license_cost: parseFloat(e.target.value) || undefined })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="last_renewal_date">Data última renovació</Label>
                      <Input
                        id="last_renewal_date"
                        type="date"
                        value={formData.last_renewal_date || ''}
                        onChange={(e) => setFormData({ ...formData, last_renewal_date: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="expiry_date">Data de venciment</Label>
                      <Input
                        id="expiry_date"
                        type="date"
                        value={formData.expiry_date || ''}
                        onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="renewal_reminder_days">Dies d'avís abans del venciment</Label>
                    <Input
                      id="renewal_reminder_days"
                      type="number"
                      min="1"
                      value={formData.renewal_reminder_days || 30}
                      onChange={(e) => setFormData({ ...formData, renewal_reminder_days: parseInt(e.target.value) || 30 })}
                    />
                    <p className="text-sm text-muted-foreground">
                      Rebràs un avís {formData.renewal_reminder_days || 30} dies abans que expiri la llicència
                    </p>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="provider" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="provider_name">Nom del proveïdor</Label>
                <Input
                  id="provider_name"
                  value={formData.provider_name || ''}
                  onChange={(e) => setFormData({ ...formData, provider_name: e.target.value })}
                  placeholder="Empresa proveïdora del programari"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="provider_email">Email de contacte</Label>
                  <Input
                    id="provider_email"
                    type="email"
                    value={formData.provider_email || ''}
                    onChange={(e) => setFormData({ ...formData, provider_email: e.target.value })}
                    placeholder="contacte@proveidor.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="provider_phone">Telèfon de contacte</Label>
                  <Input
                    id="provider_phone"
                    type="tel"
                    value={formData.provider_phone || ''}
                    onChange={(e) => setFormData({ ...formData, provider_phone: e.target.value })}
                    placeholder="+34 900 000 000"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel·lar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Guardant...' : 'Guardar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}