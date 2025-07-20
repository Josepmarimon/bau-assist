'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CLASSROOM_TYPE_LABELS } from '@/lib/constants/classroom-types'
import { 
  ArrowLeft, 
  Building2, 
  MapPin, 
  Users, 
  Monitor,
  Package,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react'

interface ClassroomDetailProps {
  classroom: any
  equipment: any[]
}

export function ClassroomDetail({ classroom, equipment }: ClassroomDetailProps) {
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
      const category = item.equipment_types?.category || 'Altres'
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
      office: 'Oficina'
    }
    return labels[category] || category
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Back button */}
        <Link href="/directori-aules">
          <Button variant="ghost" className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Tornar al directori
          </Button>
        </Link>

        {/* Header with photo gallery */}
        <div className="grid gap-8 lg:grid-cols-2 mb-8">
          {/* Left column - Info */}
          <div>
            <div className="mb-6">
              <h1 className="text-4xl font-bold mb-3">{classroom.name}</h1>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="text-lg py-1 px-3">
                  {classroom.code}
                </Badge>
                <Badge className={`${getTypeColor(classroom.type)} text-sm py-1 px-3`}>
                  {CLASSROOM_TYPE_LABELS[classroom.type] || classroom.type}
                </Badge>
              </div>
            </div>

            {/* Key metrics */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card>
                <CardContent className="flex items-center gap-3 p-4">
                  <Users className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Capacitat</p>
                    <p className="text-xl font-semibold">{classroom.capacity} persones</p>
                  </div>
                </CardContent>
              </Card>

              {classroom.building && (
                <Card>
                  <CardContent className="flex items-center gap-3 p-4">
                    <MapPin className="h-8 w-8 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Ubicació</p>
                      <p className="text-lg font-semibold">
                        {classroom.building}
                        {classroom.floor !== null && `, P${classroom.floor}`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Computer info for computer labs */}
            {classroom.type === 'Informàtica' && classroom.computer_count && (
              <Card className="mb-6">
                <CardContent className="flex items-center gap-3 p-4">
                  <Monitor className="h-8 w-8 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Equipament informàtic</p>
                    <p className="text-xl font-semibold">{classroom.computer_count} ordinadors</p>
                    {classroom.computer_type && (
                      <p className="text-sm text-muted-foreground">{classroom.computer_type}</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            {classroom.description && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Info className="h-5 w-5" />
                    Descripció
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground whitespace-pre-wrap">
                    {classroom.description}
                  </p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right column - Photos */}
          {photos.length > 0 && (
            <div>
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

                {/* Photo caption and indicators */}
                <CardContent className="pt-4">
                  {photos[currentPhotoIndex].caption && (
                    <p className="text-center text-sm text-muted-foreground mb-3">
                      {photos[currentPhotoIndex].caption}
                    </p>
                  )}

                  {photos.length > 1 && (
                    <div className="flex justify-center gap-1.5">
                      {photos.map((_, index) => (
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

              {/* Photo thumbnails */}
              {photos.length > 1 && (
                <div className="grid grid-cols-4 gap-2 mt-4">
                  {photos.map((photo, index) => (
                    <button
                      key={index}
                      className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                        index === currentPhotoIndex 
                          ? 'border-primary shadow-md' 
                          : 'border-transparent hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setCurrentPhotoIndex(index)}
                    >
                      <Image
                        src={photo.url}
                        alt={photo.caption || `Foto ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Equipment section */}
        {Object.keys(equipmentByCategory).length > 0 && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Package className="h-6 w-6" />
              Equipament disponible
            </h2>

            <div className="space-y-6">
              {Object.entries(equipmentByCategory).map(([category, items]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="text-xl">
                      {getCategoryLabel(category)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                      {items.map((item: any) => (
                        <div key={item.id} className="border rounded-lg p-4 bg-secondary/10">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-semibold text-base">{item.equipment_types?.name}</p>
                              {item.equipment_types?.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {item.equipment_types.description}
                                </p>
                              )}
                              {item.notes && (
                                <p className="text-sm text-muted-foreground mt-2 italic">
                                  {item.notes}
                                </p>
                              )}
                            </div>
                            {item.quantity > 1 && (
                              <Badge variant="default" className="ml-2 shrink-0">
                                {item.quantity} unitats
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
          </div>
        )}

        {/* No equipment message */}
        {Object.keys(equipmentByCategory).length === 0 && equipment.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-muted-foreground">
                No hi ha informació d'equipament disponible per aquesta aula
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}