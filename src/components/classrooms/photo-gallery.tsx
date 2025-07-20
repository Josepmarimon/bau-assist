'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, X, Expand } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'

interface Photo {
  url: string
  caption?: string
  uploaded_at?: string
}

interface PhotoGalleryProps {
  photos: Photo[]
  classroomName?: string
}

export function PhotoGallery({ photos, classroomName }: PhotoGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  const handlePrevious = () => {
    if (selectedIndex !== null && selectedIndex > 0) {
      setSelectedIndex(selectedIndex - 1)
    }
  }

  const handleNext = () => {
    if (selectedIndex !== null && selectedIndex < photos.length - 1) {
      setSelectedIndex(selectedIndex + 1)
    }
  }

  if (!photos || photos.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p className="text-sm">No hi ha fotos disponibles</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {photos.map((photo, index) => (
          <div
            key={index}
            className="relative group cursor-pointer"
            onClick={() => setSelectedIndex(index)}
          >
            <div className="aspect-video bg-muted rounded-lg overflow-hidden">
              <img
                src={photo.url}
                alt={photo.caption || `Foto ${index + 1}`}
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
              />
            </div>
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
              <Expand className="h-6 w-6 text-white" />
            </div>
            {photo.caption && (
              <p className="mt-2 text-sm text-muted-foreground truncate">
                {photo.caption}
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox Dialog */}
      <Dialog open={selectedIndex !== null} onOpenChange={() => setSelectedIndex(null)}>
        <DialogContent className="max-w-4xl w-full p-0">
          <div className="relative">
            {selectedIndex !== null && (
              <>
                <img
                  src={photos[selectedIndex].url}
                  alt={photos[selectedIndex].caption || `Foto ${selectedIndex + 1}`}
                  className="w-full h-auto max-h-[80vh] object-contain"
                />
                
                {/* Navigation buttons */}
                {selectedIndex > 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                    onClick={handlePrevious}
                  >
                    <ChevronLeft className="h-6 w-6" />
                  </Button>
                )}
                
                {selectedIndex < photos.length - 1 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                    onClick={handleNext}
                  >
                    <ChevronRight className="h-6 w-6" />
                  </Button>
                )}

                {/* Caption */}
                {photos[selectedIndex].caption && (
                  <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-4">
                    <p className="text-sm">{photos[selectedIndex].caption}</p>
                  </div>
                )}

                {/* Photo counter */}
                <div className="absolute top-4 left-4 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                  {selectedIndex + 1} / {photos.length}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}