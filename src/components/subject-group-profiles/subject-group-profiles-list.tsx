"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { createClient } from '@/lib/supabase/client'
import { useToast } from "@/hooks/use-toast"
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Users, 
  Package,
  AlertCircle,
  Wrench 
} from 'lucide-react'
import type { SubjectGroupProfileWithRelations } from '@/types/subject-group-profiles.types'
import { SubjectGroupProfileDialog } from './subject-group-profile-dialog'
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

interface SubjectGroupProfilesListProps {
  subjectId: string
}

export function SubjectGroupProfilesList({ subjectId }: SubjectGroupProfilesListProps) {
  const [profiles, setProfiles] = useState<SubjectGroupProfileWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedProfile, setSelectedProfile] = useState<SubjectGroupProfileWithRelations | undefined>()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [profileToDelete, setProfileToDelete] = useState<SubjectGroupProfileWithRelations | null>(null)
  const { toast } = useToast()
  const supabase = createClient()

  useEffect(() => {
    loadProfiles()
  }, [subjectId])

  const loadProfiles = async () => {
    try {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('subject_group_profiles')
        .select(`
          *,
          members:subject_group_profile_members(
            *,
            subject_group:subject_groups(*)
          ),
          software:subject_group_profile_software(
            *,
            software:software(*)
          ),
          equipment:subject_group_profile_equipment(
            *,
            equipment_type:equipment_types(*)
          )
        `)
        .eq('subject_id', subjectId)
        .order('name')

      if (error) throw error
      setProfiles(data || [])
    } catch (error) {
      console.error('Error loading profiles:', error)
      toast({
        title: "Error",
        description: "No s'han pogut carregar els perfils de grup.",
        variant: "destructive"
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCreateProfile = () => {
    setSelectedProfile(undefined)
    setIsDialogOpen(true)
  }

  const handleEditProfile = (profile: SubjectGroupProfileWithRelations) => {
    setSelectedProfile(profile)
    setIsDialogOpen(true)
  }

  const handleDeleteProfile = async () => {
    if (!profileToDelete) return

    try {
      const { error } = await supabase
        .from('subject_group_profiles')
        .delete()
        .eq('id', profileToDelete.id)

      if (error) throw error

      toast({
        title: "Perfil eliminat",
        description: `El perfil ${profileToDelete.name} s'ha eliminat correctament.`
      })

      await loadProfiles()
    } catch (error) {
      console.error('Error deleting profile:', error)
      toast({
        title: "Error",
        description: "No s'ha pogut eliminar el perfil.",
        variant: "destructive"
      })
    } finally {
      setProfileToDelete(null)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Carregant perfils...</div>
      </div>
    )
  }

  if (profiles.length === 0) {
    return (
      <>
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              No hi ha perfils de grup
            </h3>
            <p className="text-muted-foreground mb-4">
              Crea perfils per agrupar els grups de classe segons la seva orientació
            </p>
            <Button onClick={handleCreateProfile}>
              <Plus className="mr-2 h-4 w-4" />
              Crear Perfil
            </Button>
          </CardContent>
        </Card>

        <SubjectGroupProfileDialog
          open={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          subjectId={subjectId}
          profile={selectedProfile}
          onSuccess={loadProfiles}
        />
      </>
    )
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Perfils de Grup</h3>
          <Button onClick={handleCreateProfile} size="sm">
            <Plus className="mr-2 h-4 w-4" />
            Nou Perfil
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {profiles.map((profile) => (
            <Card key={profile.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-base">{profile.name}</CardTitle>
                    {profile.description && (
                      <CardDescription className="mt-1">
                        {profile.description}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditProfile(profile)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setProfileToDelete(profile)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Grups:</span>
                    <div className="flex flex-wrap gap-1">
                      {profile.members?.map((member) => (
                        <Badge key={member.id} variant="secondary">
                          {member.subject_group?.group_code}
                        </Badge>
                      )) || <span className="text-muted-foreground">Cap</span>}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Package className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Software:</span>
                    <span>{profile.software?.length || 0} programes</span>
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <Wrench className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">Equipament:</span>
                    <span>{profile.equipment?.length || 0} tipus</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <SubjectGroupProfileDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        subjectId={subjectId}
        profile={selectedProfile}
        onSuccess={loadProfiles}
      />

      <AlertDialog open={!!profileToDelete} onOpenChange={() => setProfileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar perfil de grup?</AlertDialogTitle>
            <AlertDialogDescription>
              Estàs segur que vols eliminar el perfil "{profileToDelete?.name}"? 
              Aquesta acció no es pot desfer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel·lar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteProfile} className="bg-destructive text-destructive-foreground">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}