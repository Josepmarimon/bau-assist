'use client'

import { useState, useCallback } from 'react'
import { Upload, X, Image as ImageIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Photo {
  url: string
  caption: string
  uploaded_at: string
}

interface PhotoUploadProps {
  photos: Photo[]
  onPhotosChange: (photos: Photo[]) => void
  classroomCode: string
}

export function PhotoUpload({ photos, onPhotosChange, classroomCode }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [captions, setCaptions] = useState<Record<string, string>>({})
  const supabase = createClient()

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true)
      
      if (!event.target.files || event.target.files.length === 0) {
        return
      }

      const files = Array.from(event.target.files)
      const uploadedPhotos: Photo[] = []

      for (const file of files) {
        // Validate file type
        if (!file.type.startsWith('image/')) {
          toast.error(`${file.name} no és una imatge vàlida`)
          continue
        }

        // Validate file size (5MB)
        if (file.size > 5 * 1024 * 1024) {
          toast.error(`${file.name} és massa gran (màxim 5MB)`)
          continue
        }

        // Generate unique filename
        const fileExt = file.name.split('.').pop()
        const fileName = `${classroomCode}_${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`
        const filePath = `classrooms/${classroomCode}/${fileName}`

        // Upload to Supabase Storage
        const { error: uploadError, data } = await supabase.storage
          .from('classroom-photos')
          .upload(filePath, file)

        if (uploadError) {
          console.error('Upload error:', uploadError)
          toast.error(`Error al pujar ${file.name}`)
          continue
        }

        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('classroom-photos')
          .getPublicUrl(filePath)

        uploadedPhotos.push({
          url: publicUrl,
          caption: '',
          uploaded_at: new Date().toISOString()
        })
      }

      if (uploadedPhotos.length > 0) {
        onPhotosChange([...photos, ...uploadedPhotos])
        toast.success(`${uploadedPhotos.length} foto(s) pujada(es) correctament`)
      }
    } catch (error) {
      console.error('Error uploading photos:', error)
      toast.error('Error al pujar les fotos')
    } finally {
      setUploading(false)
    }
  }, [photos, onPhotosChange, classroomCode, supabase])

  const handleRemovePhoto = useCallback(async (index: number) => {
    const photo = photos[index]
    
    // Extract file path from URL
    const urlParts = photo.url.split('/storage/v1/object/public/classroom-photos/')
    if (urlParts.length > 1) {
      const filePath = urlParts[1]
      
      // Delete from storage
      const { error } = await supabase.storage
        .from('classroom-photos')
        .remove([filePath])
      
      if (error) {
        console.error('Error deleting photo:', error)
        toast.error('Error al eliminar la foto')
        return
      }
    }

    // Remove from state
    const newPhotos = photos.filter((_, i) => i !== index)
    onPhotosChange(newPhotos)
    
    // Clean up caption
    const newCaptions = { ...captions }
    delete newCaptions[photo.url]
    setCaptions(newCaptions)
    
    toast.success('Foto eliminada correctament')
  }, [photos, onPhotosChange, captions, supabase])

  const handleCaptionChange = useCallback((url: string, caption: string) => {
    setCaptions(prev => ({ ...prev, [url]: caption }))
    
    // Update the photo caption in the array
    const updatedPhotos = photos.map(photo => 
      photo.url === url ? { ...photo, caption } : photo
    )
    onPhotosChange(updatedPhotos)
  }, [photos, onPhotosChange])

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="photo-upload">Fotos de l'aula</Label>
        <div className="mt-2">
          <Input
            id="photo-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            disabled={uploading}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('photo-upload')?.click()}
            disabled={uploading}
            className="w-full"
          >
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? 'Pujant...' : 'Pujar fotos'}
          </Button>
        </div>
      </div>

      {photos.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          {photos.map((photo, index) => (
            <div key={photo.url} className="relative group">
              <div className="aspect-video bg-muted rounded-lg overflow-hidden">
                <img
                  src={photo.url}
                  alt={`Foto ${index + 1}`}
                  className="w-full h-full object-cover"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => handleRemovePhoto(index)}
              >
                <X className="h-4 w-4" />
              </Button>
              <div className="mt-2">
                <Input
                  type="text"
                  placeholder="Afegir descripció..."
                  value={photo.caption || captions[photo.url] || ''}
                  onChange={(e) => handleCaptionChange(photo.url, e.target.value)}
                  className="text-sm"
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {photos.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          <ImageIcon className="h-12 w-12 mx-auto mb-2" />
          <p className="text-sm">No hi ha fotos pujades</p>
        </div>
      )}
    </div>
  )
}