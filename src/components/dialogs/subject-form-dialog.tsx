"use client"

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { X, Plus } from "lucide-react"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { cn } from "@/lib/utils"

interface Software {
  id: string
  name: string
  category: string
  license_type: string
}

interface EquipmentType {
  id: string
  name: string
  category: string
  description?: string
}

interface SubjectFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  subject?: {
    id: string
    code: string
    name: string
    credits: number
    year: number
    semester: string
    type?: string
    department?: string
    degree?: string
  }
  graus: { id: string; nom: string }[]
}

export function SubjectFormDialog({ open, onOpenChange, onSuccess, subject, graus }: SubjectFormDialogProps) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    credits: "",
    year: "",
    semester: "",
    type: "Obligatòria",
    department: "",
    degree: ""
  })
  
  // Software state
  const [availableSoftware, setAvailableSoftware] = useState<Software[]>([])
  const [selectedSoftware, setSelectedSoftware] = useState<string[]>([])
  const [softwareSearchOpen, setSoftwareSearchOpen] = useState(false)
  const [softwareSearchValue, setSoftwareSearchValue] = useState("")
  
  // Equipment state
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentType[]>([])
  const [selectedEquipment, setSelectedEquipment] = useState<{ equipment_type_id: string; quantity_required: number }[]>([])
  const [equipmentSearchOpen, setEquipmentSearchOpen] = useState(false)
  const [equipmentSearchValue, setEquipmentSearchValue] = useState("")

  useEffect(() => {
    if (subject) {
      setFormData({
        code: subject.code,
        name: subject.name,
        credits: subject.credits.toString(),
        year: subject.year.toString(),
        semester: subject.semester,
        type: subject.type || "Obligatòria",
        department: subject.department || "",
        degree: subject.degree || ""
      })
      loadSubjectSoftware(subject.id)
      loadSubjectEquipment(subject.id)
    } else {
      setFormData({
        code: "",
        name: "",
        credits: "",
        year: "",
        semester: "",
        type: "Obligatòria",
        department: "",
        degree: ""
      })
      setSelectedSoftware([])
      setSelectedEquipment([])
    }
  }, [subject])

  useEffect(() => {
    if (open) {
      loadAvailableSoftware()
      loadAvailableEquipment()
    }
  }, [open])

  const loadAvailableSoftware = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('software')
        .select('id, name, category, license_type')
        .order('name')

      if (error) throw error
      setAvailableSoftware(data || [])
    } catch (error) {
      console.error('Error loading software:', error)
      toast.error('Error al carregar el software disponible')
    }
  }

  const loadSubjectSoftware = async (subjectId: string) => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('subject_software')
        .select('software_id')
        .eq('subject_id', subjectId)

      if (error) throw error
      setSelectedSoftware(data?.map(item => item.software_id) || [])
    } catch (error) {
      console.error('Error loading subject software:', error)
    }
  }

  const loadAvailableEquipment = async () => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('equipment_types')
        .select('id, name, category, description')
        .eq('is_active', true)
        .order('category')
        .order('name')

      if (error) throw error
      setAvailableEquipment(data || [])
    } catch (error) {
      console.error('Error loading equipment:', error)
      toast.error('Error al carregar l\'equipament disponible')
    }
  }

  const loadSubjectEquipment = async (subjectId: string) => {
    const supabase = createClient()
    try {
      const { data, error } = await supabase
        .from('subject_equipment')
        .select('equipment_type_id, quantity_required')
        .eq('subject_id', subjectId)

      if (error) throw error
      setSelectedEquipment(data || [])
    } catch (error) {
      console.error('Error loading subject equipment:', error)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const supabase = createClient()
      
      const subjectData = {
        code: formData.code,
        name: formData.name,
        credits: parseFloat(formData.credits),
        year: parseInt(formData.year),
        semester: formData.semester,
        type: formData.type,
        department: formData.department || null,
        degree: formData.degree || null,
        active: true
      }

      let subjectId = subject?.id

      if (subject) {
        // Update existing subject
        const { error } = await supabase
          .from("subjects")
          .update(subjectData)
          .eq("id", subject.id)

        if (error) throw error
      } else {
        // Create new subject
        const { data, error } = await supabase
          .from("subjects")
          .insert(subjectData)
          .select()
          .single()

        if (error) throw error
        subjectId = data.id
      }

      // Update software requirements
      if (subjectId) {
        // First, delete existing software requirements
        await supabase
          .from('subject_software')
          .delete()
          .eq('subject_id', subjectId)

        // Then, insert new software requirements
        if (selectedSoftware.length > 0) {
          // Get current academic year (you might want to make this dynamic)
          const currentYear = new Date().getFullYear()
          const academicYear = `${currentYear}-${currentYear + 1}`
          
          const softwareRequirements = selectedSoftware.map(softwareId => ({
            subject_id: subjectId,
            software_id: softwareId,
            academic_year: academicYear,
            is_required: true
          }))

          const { error: softwareError } = await supabase
            .from('subject_software')
            .insert(softwareRequirements)

          if (softwareError) throw softwareError
        }

        // First, delete existing equipment requirements
        await supabase
          .from('subject_equipment')
          .delete()
          .eq('subject_id', subjectId)

        // Then, insert new equipment requirements
        if (selectedEquipment.length > 0) {
          const equipmentRequirements = selectedEquipment.map(eq => ({
            subject_id: subjectId,
            equipment_type_id: eq.equipment_type_id,
            quantity_required: eq.quantity_required,
            is_required: true
          }))

          const { error: equipmentError } = await supabase
            .from('subject_equipment')
            .insert(equipmentRequirements)

          if (equipmentError) throw equipmentError
        }
      }

      toast.success(subject ? "Assignatura actualitzada correctament" : "Assignatura creada correctament")
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || "Error al guardar l'assignatura")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{subject ? "Editar Assignatura" : "Nova Assignatura"}</DialogTitle>
            <DialogDescription>
              {subject ? "Modifica els detalls de l'assignatura" : "Introdueix els detalls de la nova assignatura"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="code" className="text-right">
                Codi
              </Label>
              <Input
                id="code"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Nom
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="credits" className="text-right">
                Crèdits
              </Label>
              <Input
                id="credits"
                type="number"
                step="0.1"
                value={formData.credits}
                onChange={(e) => setFormData({ ...formData, credits: e.target.value })}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="year" className="text-right">
                Curs
              </Label>
              <Select value={formData.year} onValueChange={(value) => setFormData({ ...formData, year: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona un curs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="4">4</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="semester" className="text-right">
                Semestre
              </Label>
              <Select value={formData.semester} onValueChange={(value) => setFormData({ ...formData, semester: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona un semestre" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1r">1r semestre</SelectItem>
                  <SelectItem value="2n">2n semestre</SelectItem>
                  <SelectItem value="1r i 2n">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="type" className="text-right">
                Tipus
              </Label>
              <Select value={formData.type} onValueChange={(value) => setFormData({ ...formData, type: value })}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecciona un tipus" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Obligatòria">Obligatòria</SelectItem>
                  <SelectItem value="Optativa">Optativa</SelectItem>
                  <SelectItem value="Formació bàsica">Formació bàsica</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="department" className="text-right">
                Departament
              </Label>
              <Input
                id="department"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                className="col-span-3"
                placeholder="Opcional"
              />
            </div>
            
            {/* Software Requirements Section */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right mt-2">
                Software necessari
              </Label>
              <div className="col-span-3 space-y-2">
                {/* Selected Software */}
                <div className="flex flex-wrap gap-2">
                  {selectedSoftware.map((softwareId) => {
                    const software = availableSoftware.find(s => s.id === softwareId)
                    if (!software) return null
                    return (
                      <Badge key={softwareId} variant="secondary" className="flex items-center gap-1">
                        <span>{software.name}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedSoftware(prev => prev.filter(id => id !== softwareId))}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
                
                {/* Software Search */}
                <Popover open={softwareSearchOpen} onOpenChange={setSoftwareSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={softwareSearchOpen}
                      className="w-full justify-start"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Afegir software
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Buscar software..." 
                        value={softwareSearchValue}
                        onValueChange={setSoftwareSearchValue}
                      />
                      <CommandEmpty>No s'ha trobat cap software.</CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-y-auto">
                        {availableSoftware
                          .filter(software => !selectedSoftware.includes(software.id))
                          .map((software) => (
                            <CommandItem
                              key={software.id}
                              value={software.name}
                              onSelect={() => {
                                setSelectedSoftware(prev => [...prev, software.id])
                                setSoftwareSearchOpen(false)
                                setSoftwareSearchValue("")
                              }}
                            >
                              <div className="flex flex-col">
                                <span>{software.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {software.category} • {software.license_type}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            
            {/* Equipment Requirements Section */}
            <div className="grid grid-cols-4 items-start gap-4">
              <Label className="text-right mt-2">
                Equipament necessari
              </Label>
              <div className="col-span-3 space-y-2">
                {/* Selected Equipment */}
                <div className="flex flex-wrap gap-2">
                  {selectedEquipment.map((equipment) => {
                    const equipmentType = availableEquipment.find(e => e.id === equipment.equipment_type_id)
                    if (!equipmentType) return null
                    return (
                      <Badge key={equipment.equipment_type_id} variant="secondary" className="flex items-center gap-1">
                        <span>{equipmentType.name}</span>
                        {equipment.quantity_required > 1 && (
                          <span className="text-xs opacity-70 ml-1">x{equipment.quantity_required}</span>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedEquipment(prev => prev.filter(e => e.equipment_type_id !== equipment.equipment_type_id))}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
                
                {/* Equipment Search */}
                <Popover open={equipmentSearchOpen} onOpenChange={setEquipmentSearchOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      aria-expanded={equipmentSearchOpen}
                      className="w-full justify-start"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Afegir equipament
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[400px] p-0">
                    <Command>
                      <CommandInput 
                        placeholder="Buscar equipament..." 
                        value={equipmentSearchValue}
                        onValueChange={setEquipmentSearchValue}
                      />
                      <CommandEmpty>No s'ha trobat cap equipament.</CommandEmpty>
                      <CommandGroup className="max-h-[300px] overflow-y-auto">
                        {availableEquipment
                          .filter(equipment => !selectedEquipment.some(e => e.equipment_type_id === equipment.id))
                          .map((equipment) => (
                            <CommandItem
                              key={equipment.id}
                              value={equipment.name}
                              onSelect={() => {
                                setSelectedEquipment(prev => [...prev, { 
                                  equipment_type_id: equipment.id, 
                                  quantity_required: 1 
                                }])
                                setEquipmentSearchOpen(false)
                                setEquipmentSearchValue("")
                              }}
                            >
                              <div className="flex flex-col">
                                <span>{equipment.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  {equipment.category}
                                  {equipment.description && ` • ${equipment.description}`}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel·lar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardant..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}