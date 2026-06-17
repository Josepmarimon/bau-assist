'use client'

import { useState, useRef } from 'react'
import { Upload, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'
import type { TfgFile } from '@/lib/tfg/types'

type Mode = 'single' | 'gallery'

type Props = {
  mode: Mode
  bucket?: string
  submissionId: string
  userId: string
  fieldName: string
  accept?: string
  maxSize?: number
  value: TfgFile | TfgFile[] | null
  onChange: (value: TfgFile | TfgFile[] | null) => void
  label?: string
  description?: string
}

export function FileUpload({
  mode,
  bucket = 'tfg-files',
  submissionId,
  userId,
  fieldName,
  accept,
  maxSize = 100 * 1024 * 1024,
  value,
  onChange,
  label,
  description,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  const files: TfgFile[] = value
    ? Array.isArray(value)
      ? value
      : [value]
    : []

  async function handleUpload(selected: FileList | null) {
    if (!selected || selected.length === 0) return
    setError(null)
    setUploading(true)

    try {
      const newFiles: TfgFile[] = []

      for (const file of Array.from(selected)) {
        if (file.size > maxSize) {
          setError(
            `«${file.name}» supera el límit de ${Math.round(maxSize / 1024 / 1024)}MB.`
          )
          continue
        }

        const ext = file.name.split('.').pop() ?? 'bin'
        const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
        const path = `${userId}/${submissionId}/${fieldName}/${Date.now()}-${safeName}`

        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(path, file, { contentType: file.type, upsert: false })

        if (uploadError) {
          setError(`Error pujant «${file.name}»: ${uploadError.message}`)
          continue
        }

        newFiles.push({
          path,
          name: file.name,
          mime: file.type,
          size: file.size,
        })
      }

      if (newFiles.length === 0) return

      if (mode === 'single') {
        if (files[0]) {
          await supabase.storage.from(bucket).remove([files[0].path])
        }
        onChange(newFiles[0])
      } else {
        onChange([...files, ...newFiles])
      }
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  async function handleRemove(file: TfgFile) {
    await supabase.storage.from(bucket).remove([file.path])

    if (mode === 'single') {
      onChange(null)
    } else {
      onChange(files.filter((f) => f.path !== file.path))
    }
  }

  const isImage = (f: TfgFile) => f.mime.startsWith('image/')

  return (
    <div className="space-y-2">
      {label && <p className="text-sm font-medium">{label}</p>}
      {description && <p className="text-xs text-muted-foreground">{description}</p>}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={mode === 'gallery'}
        onChange={(e) => handleUpload(e.target.files)}
        className="hidden"
      />

      {files.length > 0 && (
        <ul className="space-y-1.5">
          {files.map((f) => (
            <li
              key={f.path}
              className="flex items-center gap-2 rounded border bg-background p-2 text-sm"
            >
              {isImage(f) ? (
                <ImageIcon className="h-4 w-4 text-muted-foreground shrink-0" />
              ) : (
                <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
              )}
              <span className="flex-1 truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground">
                {(f.size / 1024 / 1024).toFixed(1)}MB
              </span>
              <button
                type="button"
                onClick={() => handleRemove(f)}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Eliminar"
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => inputRef.current?.click()}
        disabled={uploading || (mode === 'single' && files.length > 0)}
      >
        {uploading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Pujant...
          </>
        ) : (
          <>
            <Upload className="h-4 w-4 mr-2" />
            {mode === 'single'
              ? files.length > 0
                ? 'Substituir'
                : 'Pujar fitxer'
              : 'Afegir fitxers'}
          </>
        )}
      </Button>

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
