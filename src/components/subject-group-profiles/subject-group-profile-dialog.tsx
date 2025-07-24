"use client"

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Checkbox } from "@/components/ui/checkbox"
import { createClient } from '@/lib/supabase/client'
import { useToast } from "@/hooks/use-toast"
import { Loader2, X, ChevronsUpDown, Check, Calendar, MapPin, Clock } from 'lucide-react'
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
import type { 
  SubjectGroupProfile, 
  SubjectGroupProfileWithRelations,
  SubjectGroupProfileFormData 
} from '@/types/subject-group-profiles.types'
import type { Database } from '@/types/database.types'

type StudentGroup = Database['public']['Tables']['student_groups']['Row'] & {
  is_subject_group?: boolean
  code?: string
}
// Define types directly since they might not exist in Database types
type Software = {
  id: string
  name: string
  version?: string
  category: string | null
  license_type: string | null
}
type EquipmentType = {
  id: string
  name: string
  description: string | null
  category: string | null
  icon_name: string | null
}

const formSchema = z.object({
  name: z.string().min(1, 'El nom és obligatori'),
  description: z.string().optional(),
  subject_id: z.string(),
  member_group_ids: z.array(z.string()).min(1, 'Has de seleccionar almenys un grup'),
  software_requirements: z.array(z.object({
    software_id: z.string(),
    is_required: z.boolean()
  })),
  equipment_requirements: z.array(z.object({
    equipment_type_id: z.string(),
    quantity_required: z.number().min(1),
    is_required: z.boolean()
  }))
})

interface SubjectGroupProfileDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  subjectId: string
  profile?: SubjectGroupProfileWithRelations
  onSuccess?: () => void
}

export function SubjectGroupProfileDialog({
  open,
  onOpenChange,
  subjectId,
  profile,
  onSuccess
}: SubjectGroupProfileDialogProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [studentGroups, setStudentGroups] = useState<StudentGroup[]>([])
  const [availableSoftware, setAvailableSoftware] = useState<Software[]>([])
  const [availableEquipment, setAvailableEquipment] = useState<EquipmentType[]>([])
  const [profileAssignments, setProfileAssignments] = useState<any[]>([])
  const { toast } = useToast()
  const supabase = createClient()

  const form = useForm<SubjectGroupProfileFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      subject_id: subjectId,
      member_group_ids: [],
      software_requirements: [],
      equipment_requirements: []
    }
  })

  useEffect(() => {
    if (open) {
      loadData()
      if (profile?.id) {
        loadProfileAssignments(profile.id)
      }
    }
  }, [open, profile?.id])

  useEffect(() => {
    if (profile) {
      form.reset({
        name: profile.name,
        description: profile.description || '',
        member_group_ids: profile.members?.map(m => m.subject_group_id) || [],
        software_requirements: profile.software?.map(s => ({
          software_id: s.software_id,
          is_required: s.is_required
        })) || [],
        equipment_requirements: profile.equipment?.map(e => ({
          equipment_type_id: e.equipment_type_id,
          quantity_required: e.quantity_required || 1,
          is_required: e.is_required
        })) || []
      })
      // Load assignments when profile changes
      if (profile.id) {
        loadProfileAssignments(profile.id)
      }
    } else {
      // Clear assignments when no profile
      setProfileAssignments([])
    }
  }, [profile, form])

  const loadProfileAssignments = async (profileId: string) => {
    try {
      const { data: assignments, error } = await supabase
        .from('profile_classroom_assignments')
        .select(`
          id,
          classroom_id,
          semester_id,
          time_slot_id,
          is_full_semester,
          week_range_type,
          classrooms (
            id,
            code,
            name,
            building,
            floor
          ),
          semesters (
            id,
            name,
            academic_years (
              name
            )
          ),
          time_slots (
            day_of_week,
            start_time,
            end_time,
            slot_type
          ),
          profile_assignment_weeks (
            week_number
          )
        `)
        .eq('profile_id', profileId)
        .order('time_slots(day_of_week)')

      if (error) {
        console.error('Error loading profile assignments:', error)
      } else if (assignments) {
        // Process assignments to include weeks array
        const processedAssignments = assignments.map((assignment: any) => ({
          ...assignment,
          weeks: assignment.profile_assignment_weeks?.map((w: any) => w.week_number) || []
        }))
        setProfileAssignments(processedAssignments)
      }
    } catch (error) {
      console.error('Error loading profile assignments:', error)
    }
  }

  const loadData = async () => {
    try {
      // Carregar els grups virtuals/especialitzats de l'assignatura
      const { data: subjectGroups, error: sgError } = await supabase
        .from('subject_groups')
        .select('id, group_code')
        .eq('subject_id', subjectId)

      if (sgError) {
        console.error('Error loading subject groups:', sgError)
      } else if (subjectGroups && subjectGroups.length > 0) {
        // Convertir els subject_groups en un format similar a student_groups per mostrar-los
        const virtualGroups = subjectGroups.map(sg => ({
          id: sg.id, // Utilitzem l'ID del subject_group
          name: sg.group_code,
          code: sg.group_code,
          year: parseInt(sg.group_code.match(/\d+/)?.[0] || '0'),
          shift: (sg.group_code.includes('m') || sg.group_code.includes('M') ? 'MORNING' : 'AFTERNOON') as 'MORNING' | 'AFTERNOON',
          max_students: 30, // Valor per defecte
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          // Afegir un flag per indicar que és un grup virtual
          is_subject_group: true
        }))
        
        setStudentGroups(virtualGroups)
      } else {
        setStudentGroups([])
      }

      // Carregar software disponible
      const { data: software, error: softwareError } = await supabase
        .from('software')
        .select('*')
        .order('name')

      if (softwareError) {
        console.error('Error loading software:', softwareError)
      } else if (software) {
        setAvailableSoftware(software)
      }

      // Carregar tipus d'equipament disponible
      const { data: equipment, error: equipmentError } = await supabase
        .from('equipment_types')
        .select('*')
        .eq('is_active', true)
        .order('category')
        .order('name')

      if (equipmentError) {
        console.error('Error loading equipment types:', equipmentError)
      } else if (equipment) {
        setAvailableEquipment(equipment)
      }
    } catch (error) {
      console.error('Error loading data:', error)
    }
  }

  const onSubmit = async (values: SubjectGroupProfileFormData) => {
    setIsLoading(true)
    try {
      if (profile) {
        // Actualitzar perfil existent
        await updateProfile(values)
      } else {
        // Crear nou perfil
        await createProfile(values)
      }

      toast({
        title: profile ? "Perfil actualitzat" : "Perfil creat",
        description: `El perfil de grup ${values.name} s'ha ${profile ? 'actualitzat' : 'creat'} correctament.`
      })

      onSuccess?.()
      onOpenChange(false)
      form.reset()
    } catch (error) {
      console.error('Error saving profile:', error)
      toast({
        title: "Error",
        description: "No s'ha pogut guardar el perfil de grup.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const createProfile = async (values: SubjectGroupProfileFormData) => {
    // Crear el perfil
    const { data: newProfile, error: profileError } = await supabase
      .from('subject_group_profiles')
      .insert({
        subject_id: subjectId,
        name: values.name,
        description: values.description
      })
      .select()
      .single()

    if (profileError) throw profileError

    // Afegir membres (ara són subject_group_ids)
    if (values.member_group_ids.length > 0) {
      const { error: membersError } = await supabase
        .from('subject_group_profile_members')
        .insert(
          values.member_group_ids.map(groupId => ({
            profile_id: newProfile.id,
            subject_group_id: groupId
          }))
        )

      if (membersError) throw membersError
    }

    // Afegir requisits de software
    if (values.software_requirements.length > 0) {
      const { error: softwareError } = await supabase
        .from('subject_group_profile_software')
        .insert(
          values.software_requirements.map(req => ({
            profile_id: newProfile.id,
            software_id: req.software_id,
            is_required: req.is_required
          }))
        )

      if (softwareError) throw softwareError
    }

    // Afegir requisits d'equipament
    if (values.equipment_requirements.length > 0) {
      const { error: equipmentError } = await supabase
        .from('subject_group_profile_equipment')
        .insert(
          values.equipment_requirements.map(req => ({
            profile_id: newProfile.id,
            equipment_type_id: req.equipment_type_id,
            quantity_required: req.quantity_required,
            is_required: req.is_required
          }))
        )

      if (equipmentError) throw equipmentError
    }
  }

  const updateProfile = async (values: SubjectGroupProfileFormData) => {
    if (!profile) return

    // Actualitzar el perfil
    const { error: profileError } = await supabase
      .from('subject_group_profiles')
      .update({
        name: values.name,
        description: values.description
      })
      .eq('id', profile.id)

    if (profileError) throw profileError

    // Actualitzar membres
    // Primer eliminar tots els membres existents
    await supabase
      .from('subject_group_profile_members')
      .delete()
      .eq('profile_id', profile.id)

    // Després afegir els nous
    if (values.member_group_ids.length > 0) {
      const { error: membersError } = await supabase
        .from('subject_group_profile_members')
        .insert(
          values.member_group_ids.map(groupId => ({
            profile_id: profile.id,
            subject_group_id: groupId
          }))
        )

      if (membersError) throw membersError
    }

    // Actualitzar requisits de software
    // Primer eliminar tots els requisits existents
    await supabase
      .from('subject_group_profile_software')
      .delete()
      .eq('profile_id', profile.id)

    // Després afegir els nous
    if (values.software_requirements.length > 0) {
      const { error: softwareError } = await supabase
        .from('subject_group_profile_software')
        .insert(
          values.software_requirements.map(req => ({
            profile_id: profile.id,
            software_id: req.software_id,
            is_required: req.is_required
          }))
        )

      if (softwareError) throw softwareError
    }

    // Actualitzar requisits d'equipament
    // Primer eliminar tots els requisits existents
    await supabase
      .from('subject_group_profile_equipment')
      .delete()
      .eq('profile_id', profile.id)

    // Després afegir els nous
    if (values.equipment_requirements.length > 0) {
      const { error: equipmentError } = await supabase
        .from('subject_group_profile_equipment')
        .insert(
          values.equipment_requirements.map(req => ({
            profile_id: profile.id,
            equipment_type_id: req.equipment_type_id,
            quantity_required: req.quantity_required,
            is_required: req.is_required
          }))
        )

      if (equipmentError) throw equipmentError
    }
  }



  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {profile ? 'Editar' : 'Crear'} Perfil de Grup
          </DialogTitle>
          <DialogDescription>
            Agrupa els grups de classe segons la seva orientació i defineix els seus requisits de software.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 max-h-[calc(85vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pr-4">
                {/* Left Column */}
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nom del perfil</FormLabel>
                        <FormControl>
                          <Input placeholder="p.ex. Disseny Gràfic" {...field} />
                        </FormControl>
                        <FormDescription>
                          Un nom descriptiu per a aquest perfil de grup
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
                        <FormLabel>Descripció</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descripció opcional del perfil..."
                            className="resize-none"
                            rows={3}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                  control={form.control}
                  name="member_group_ids"
                  render={({ field }) => {
                    const [open, setOpen] = useState(false)
                    
                    return (
                      <FormItem>
                        <FormLabel>Grups de classe</FormLabel>
                        <FormDescription>
                          Selecciona els grups que pertanyen a aquest perfil
                        </FormDescription>
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-full justify-between"
                              >
                                {field.value.length > 0 ? (
                                  <div className="flex gap-1 flex-wrap">
                                    {field.value.map(id => {
                                      const group = studentGroups.find(g => g.id === id)
                                      return group ? (
                                        <Badge key={id} variant="secondary" className="mr-1">
                                          {group.code || group.name}
                                          <span
                                            className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer inline-flex"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.stopPropagation()
                                                field.onChange(field.value.filter(v => v !== id))
                                              }
                                            }}
                                            onMouseDown={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                            }}
                                            onClick={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              field.onChange(field.value.filter(v => v !== id))
                                            }}
                                          >
                                            <X className="h-3 w-3" />
                                          </span>
                                        </Badge>
                                      ) : null
                                    })}
                                  </div>
                                ) : (
                                  "Selecciona grups..."
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Cerca grups..." />
                              <CommandEmpty>No s'han trobat grups.</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                {studentGroups.map((group) => (
                                  <CommandItem
                                    key={group.id}
                                    onSelect={() => {
                                      const newValue = field.value.includes(group.id)
                                        ? field.value.filter(id => id !== group.id)
                                        : [...field.value, group.id]
                                      field.onChange(newValue)
                                    }}
                                  >
                                    <Check
                                      className={`mr-2 h-4 w-4 ${
                                        field.value.includes(group.id) ? "opacity-100" : "opacity-0"
                                      }`}
                                    />
                                    {group.code || group.name} - {group.name}
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
                  {/* Profile Classroom Assignments */}
                  {profile && profileAssignments.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Assignacions d'aula i horari
                      </h3>
                      <div className="space-y-2">
                        {profileAssignments.map((assignment) => {
                          const DAYS = ["", "Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres"]
                          const dayName = DAYS[assignment.time_slots?.day_of_week || 0]
                          
                          return (
                            <div
                              key={assignment.id}
                              className="flex items-start gap-3 p-3 border rounded-lg bg-muted/30"
                            >
                              <div className="flex-1 space-y-1">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                  <Clock className="h-3.5 w-3.5" />
                                  {dayName} {assignment.time_slots?.slot_type === 'mati' ? 'Matí' : 'Tarda'}
                                  {assignment.time_slots && (
                                    <span className="text-muted-foreground">
                                      ({assignment.time_slots.start_time.substring(0, 5)} - {assignment.time_slots.end_time.substring(0, 5)})
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-3.5 w-3.5" />
                                  {assignment.classrooms?.code} - {assignment.classrooms?.name}
                                  <span className="text-muted-foreground">
                                    (Edifici {assignment.classrooms?.building}, Planta {assignment.classrooms?.floor})
                                  </span>
                                </div>
                                {!assignment.is_full_semester && assignment.weeks.length > 0 && (
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    Setmanes: {assignment.weeks.sort((a: number, b: number) => a - b).join(', ')}
                                  </div>
                                )}
                                {assignment.semesters && (
                                  <div className="text-xs text-muted-foreground">
                                    {assignment.semesters.academic_years?.name} - {assignment.semesters.name}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <FormField
                  control={form.control}
                  name="software_requirements"
                  render={({ field }) => {
                    const [open, setOpen] = useState(false)
                    
                    return (
                      <FormItem>
                        <FormLabel>Requisits de software</FormLabel>
                        <FormDescription>
                          Selecciona el software necessari per a aquest perfil
                        </FormDescription>
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-full justify-between"
                              >
                                {field.value.length > 0 ? (
                                  <div className="flex gap-1 flex-wrap">
                                    {field.value.map(req => {
                                      const software = availableSoftware.find(s => s.id === req.software_id)
                                      return software ? (
                                        <Badge key={req.software_id} variant="secondary" className="mr-1">
                                          {software.name}
                                          {software.version && (
                                            <span className="ml-1 text-xs opacity-70">v{software.version}</span>
                                          )}
                                          <span
                                            className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer inline-flex"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.stopPropagation()
                                                field.onChange(field.value.filter(r => r.software_id !== req.software_id))
                                              }
                                            }}
                                            onMouseDown={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                            }}
                                            onClick={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              field.onChange(field.value.filter(r => r.software_id !== req.software_id))
                                            }}
                                          >
                                            <X className="h-3 w-3" />
                                          </span>
                                        </Badge>
                                      ) : null
                                    })}
                                  </div>
                                ) : (
                                  "Selecciona software..."
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Cerca software..." />
                              <CommandEmpty>No s'ha trobat software.</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                {availableSoftware.map((software) => {
                                  const isSelected = field.value.some(req => req.software_id === software.id)
                                  return (
                                    <CommandItem
                                      key={software.id}
                                      onSelect={() => {
                                        const newValue = isSelected
                                          ? field.value.filter(req => req.software_id !== software.id)
                                          : [...field.value, { software_id: software.id, is_required: true }]
                                        field.onChange(newValue)
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          isSelected ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      <div className="flex-1">
                                        {software.name}
                                        {software.version && (
                                          <span className="ml-2 text-xs text-muted-foreground">
                                            v{software.version}
                                          </span>
                                        )}
                                      </div>
                                    </CommandItem>
                                  )
                                })}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />

                <FormField
                  control={form.control}
                  name="equipment_requirements"
                  render={({ field }) => {
                    const [open, setOpen] = useState(false)
                    
                    return (
                      <FormItem>
                        <FormLabel>Recursos/Equipament</FormLabel>
                        <FormDescription>
                          Selecciona l'equipament necessari per a aquest perfil
                        </FormDescription>
                        <Popover open={open} onOpenChange={setOpen}>
                          <PopoverTrigger asChild>
                            <FormControl>
                              <Button
                                variant="outline"
                                role="combobox"
                                aria-expanded={open}
                                className="w-full justify-between"
                              >
                                {field.value.length > 0 ? (
                                  <div className="flex gap-1 flex-wrap">
                                    {field.value.map(req => {
                                      const equipment = availableEquipment.find(e => e.id === req.equipment_type_id)
                                      return equipment ? (
                                        <Badge key={req.equipment_type_id} variant="secondary" className="mr-1">
                                          {equipment.name}
                                          {req.quantity_required > 1 && (
                                            <span className="ml-1 text-xs opacity-70">x{req.quantity_required}</span>
                                          )}
                                          <span
                                            className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer inline-flex"
                                            onKeyDown={(e) => {
                                              if (e.key === "Enter") {
                                                e.stopPropagation()
                                                field.onChange(field.value.filter(r => r.equipment_type_id !== req.equipment_type_id))
                                              }
                                            }}
                                            onMouseDown={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                            }}
                                            onClick={(e) => {
                                              e.preventDefault()
                                              e.stopPropagation()
                                              field.onChange(field.value.filter(r => r.equipment_type_id !== req.equipment_type_id))
                                            }}
                                          >
                                            <X className="h-3 w-3" />
                                          </span>
                                        </Badge>
                                      ) : null
                                    })}
                                  </div>
                                ) : (
                                  "Selecciona equipament..."
                                )}
                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                              </Button>
                            </FormControl>
                          </PopoverTrigger>
                          <PopoverContent className="w-full p-0">
                            <Command>
                              <CommandInput placeholder="Cerca equipament..." />
                              <CommandEmpty>No s'ha trobat equipament.</CommandEmpty>
                              <CommandGroup className="max-h-64 overflow-auto">
                                {availableEquipment.map((equipment) => {
                                  const isSelected = field.value.some(req => req.equipment_type_id === equipment.id)
                                  return (
                                    <CommandItem
                                      key={equipment.id}
                                      onSelect={() => {
                                        const newValue = isSelected
                                          ? field.value.filter(req => req.equipment_type_id !== equipment.id)
                                          : [...field.value, { 
                                              equipment_type_id: equipment.id, 
                                              quantity_required: 1,
                                              is_required: true 
                                            }]
                                        field.onChange(newValue)
                                      }}
                                    >
                                      <Check
                                        className={`mr-2 h-4 w-4 ${
                                          isSelected ? "opacity-100" : "opacity-0"
                                        }`}
                                      />
                                      <div className="flex-1">
                                        <div className="font-medium">{equipment.name}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {equipment.category}
                                        </div>
                                      </div>
                                    </CommandItem>
                                  )
                                })}
                              </CommandGroup>
                            </Command>
                          </PopoverContent>
                        </Popover>
                        <FormMessage />
                      </FormItem>
                    )
                  }}
                />
                </div>
              </div>
            </ScrollArea>

            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel·lar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {profile ? 'Actualitzar' : 'Crear'} Perfil
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}