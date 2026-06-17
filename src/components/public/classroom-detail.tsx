'use client'

import { useState } from 'react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CLASSROOM_TYPE_LABELS } from '@/lib/constants/classroom-types'
import {
  Building2,
  MapPin,
  Users,
  Monitor,
  Package,
  ChevronLeft,
  ChevronRight,
  Info,
  HardDrive,
  AppWindow,
  AlertTriangle,
  CalendarDays
} from 'lucide-react'

interface ClassroomDetailProps {
  classroom: any
  equipment: any[]
  software?: any[]
}

const LICENSE_TYPE_LABELS: Record<string, string> = {
  paid: 'Pagament',
  educational: 'Educatiu',
  free: 'Gratuït',
  open_source: 'Codi obert'
}

const LICENSE_TYPE_COLORS: Record<string, string> = {
  paid: 'bg-red-100 text-red-700',
  educational: 'bg-blue-100 text-blue-700',
  free: 'bg-green-100 text-green-700',
  open_source: 'bg-purple-100 text-purple-700'
}

export function ClassroomDetail({ classroom, equipment, software = [] }: ClassroomDetailProps) {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0)
  const photos = classroom.photos || []

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'Taller': return 'bg-orange-100 text-orange-800'
      case 'Informàtica': return 'bg-blue-100 text-blue-800'
      case 'Polivalent': return 'bg-green-100 text-green-800'
      case 'Projectes': return 'bg-purple-100 text-purple-800'
      case 'Seminari': return 'bg-pink-100 text-pink-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev + 1) % photos.length)
  }

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length)
  }

  const groupEquipmentByCategory = () => {
    const grouped: Record<string, any[]> = {}
    equipment.forEach(item => {
      const category = item.equipment_type?.category || 'Altres'
      if (!grouped[category]) {
        grouped[category] = []
      }
      grouped[category].push(item)
    })
    return grouped
  }

  const equipmentByCategory = groupEquipmentByCategory()

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      audiovisual: 'Audiovisual',
      computing: 'Informàtica',
      furniture: 'Mobiliari',
      climate: 'Climatització',
      office: 'Oficina',
      machinery: 'Màquines de Taller'
    }
    return labels[category] || category
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-6 max-w-2xl space-y-8">

        {/* Nom de l'aula (un sol cop) + tipus */}
        <header className="space-y-2">
          <h1 className="text-3xl font-bold">{classroom.name}</h1>
          <Badge className={`${getTypeColor(classroom.type)} text-sm py-1 px-3`}>
            {CLASSROOM_TYPE_LABELS[classroom.type as keyof typeof CLASSROOM_TYPE_LABELS] || classroom.type}
          </Badge>
        </header>

        {/* Capacitat i ubicació */}
        <div className="grid grid-cols-2 gap-3">
          <Card>
            <CardContent className="flex items-center gap-3 p-4">
              <Users className="h-7 w-7 text-primary shrink-0" />
              <div>
                <p className="text-xs text-muted-foreground">Capacitat</p>
                <p className="text-lg font-semibold">{classroom.capacity}</p>
              </div>
            </CardContent>
          </Card>

          {classroom.building && (
            <Card>
              <CardContent className="flex items-center gap-3 p-4">
                <MapPin className="h-7 w-7 text-primary shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Ubicació</p>
                  <p className="text-base font-semibold leading-tight">
                    {classroom.building}
                    {classroom.floor !== null && `, P${classroom.floor}`}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Calendari d'ocupació (Office 365) */}
        {classroom.office365_calendar_url && (
          <section className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Ocupació de l&apos;aula
            </h2>
            <Card className="overflow-hidden">
              <div className="h-[75vh] min-h-[560px] w-full">
                <iframe
                  src={classroom.office365_calendar_url}
                  title={`Calendari d'ocupació de ${classroom.name}`}
                  className="h-full w-full border-0"
                  loading="lazy"
                />
              </div>
            </Card>
          </section>
        )}

        {/* Software instal·lat */}
        {software.length > 0 && (
          <section className="space-y-3">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <AppWindow className="h-5 w-5" />
              Software instal·lat
            </h2>
            <div className="flex flex-wrap gap-2">
              {software.map((sw: any) => (
                <Badge
                  key={sw.id}
                  variant="secondary"
                  className={`text-sm py-1 px-3 font-normal ${LICENSE_TYPE_COLORS[sw.license_type] || ''}`}
                  title={LICENSE_TYPE_LABELS[sw.license_type] || sw.license_type}
                >
                  {sw.name}
                  {sw.version && <span className="ml-1.5 opacity-70">{sw.version}</span>}
                </Badge>
              ))}
            </div>
          </section>
        )}

        {/* Equipament disponible */}
        {Object.keys(equipmentByCategory).length > 0 && (
          <section className="space-y-4">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5" />
              Equipament disponible
            </h2>

            <div className="space-y-4">
              {Object.entries(equipmentByCategory).map(([category, items]) => (
                <Card key={category}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      {getCategoryLabel(category)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {items.map((item: any) => (
                        <div key={item.id} className="border rounded-lg p-3 bg-secondary/10">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{item.equipment_type?.name}</p>
                              {item.equipment_type?.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {item.equipment_type.description}
                                </p>
                              )}
                              {item.notes && (
                                <p className="text-xs text-muted-foreground mt-1 italic">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                            {item.quantity > 1 && (
                              <Badge variant="default" className="ml-2 shrink-0">
                                {item.quantity}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Equipament informàtic + sistema operatiu */}
        {classroom.type === 'Informàtica' && (classroom.computer_count || classroom.operating_system) && (
          <div className="grid grid-cols-2 gap-3">
            {classroom.computer_count && (
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Monitor className="h-7 w-7 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Ordinadors</p>
                    <p className="text-lg font-semibold">{classroom.computer_count}</p>
                    {classroom.computer_type && (
                      <p className="text-xs text-muted-foreground">{classroom.computer_type}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            {classroom.operating_system && (
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <HardDrive className="h-7 w-7 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Sistema operatiu</p>
                    <p className="text-base font-semibold leading-tight">{classroom.operating_system}</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Dimensions i descripció */}
        {(classroom.width || classroom.depth || classroom.description) && (
          <section className="space-y-3">
            {(classroom.width || classroom.depth) && (
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Building2 className="h-7 w-7 text-primary shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Dimensions</p>
                    <p className="text-base font-semibold">
                      {classroom.width && classroom.depth ? (
                        <>
                          {classroom.width}m × {classroom.depth}m
                          <span className="text-xs text-muted-foreground ml-2">
                            ({(classroom.width * classroom.depth).toFixed(2)}m²)
                          </span>
                        </>
                      ) : classroom.width ? (
                        `Amplada: ${classroom.width}m`
                      ) : (
                        `Profunditat: ${classroom.depth}m`
                      )}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {classroom.description && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Info className="h-4 w-4" />
                    Descripció
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                    {classroom.description}
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        )}

        {/* Fotos */}
        {photos.length > 0 && (
          <Card className="overflow-hidden">
            <div className="relative">
              <div className="aspect-video relative bg-secondary/10">
                <Image
                  src={photos[currentPhotoIndex].url}
                  alt={photos[currentPhotoIndex].caption || classroom.name}
                  fill
                  className="object-cover"
                />
              </div>

              {photos.length > 1 && (
                <>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm"
                    onClick={prevPhoto}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 backdrop-blur-sm"
                    onClick={nextPhoto}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
            </div>

            <CardContent className="pt-4">
              {photos[currentPhotoIndex].caption && (
                <p className="text-center text-sm text-muted-foreground mb-3">
                  {photos[currentPhotoIndex].caption}
                </p>
              )}

              {photos.length > 1 && (
                <div className="flex justify-center gap-1.5">
                  {photos.map((_: any, index: number) => (
                    <button
                      key={index}
                      className={`h-2 w-2 rounded-full transition-all ${
                        index === currentPhotoIndex
                          ? 'bg-primary w-6'
                          : 'bg-muted-foreground/30 hover:bg-muted-foreground/50'
                      }`}
                      onClick={() => setCurrentPhotoIndex(index)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reportar incidència — al final de tot (de moment sense acció) */}
        <div className="pt-6 flex justify-center">
          <Button variant="outline" className="gap-2">
            <AlertTriangle className="h-4 w-4" />
            Reportar incidència
          </Button>
        </div>
      </div>
    </div>
  )
}
