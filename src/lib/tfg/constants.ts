// Selects hardcoded extrets del Field Group ACF (group_64351aea8e4c5).
// Els tribunals NO són aquí — viuen a la taula tfg_tribunals (editables des del backoffice).

export const ITINERARIS = [
  'Disseny Gràfic',
  'Disseny Espais',
  'Disseny Audiovisual',
  'Disseny Moda',
] as const

export const TIPOLOGIES_PROJECTE = [
  'Disseny crític',
  'Disseny especulatiu',
  'Experimentació processual',
  'Experimentació material',
  'Experimentació tècnica',
  'Gènere',
  'Identitat',
  'Memòria',
  'Arxiu',
  'Transformació social',
  'Salut',
] as const

export const FORMATS_MEMORIA = [
  'Format PDF',
  'Enllaç al Drive (Onedrive, google drive, dropbox)',
  'Format WEB',
] as const

export const PLATAFORMES_VIDEO = ['Youtube', 'Vimeo'] as const

// Mides màximes (en bytes) — sincronitzades amb el límit del bucket Storage.
export const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 MB
export const MAX_IMAGE_SIZE = 20 * 1024 * 1024 // 20 MB per imatge individual

export const ACCEPT_IMAGE = 'image/jpeg,image/png,image/webp,image/avif'
export const ACCEPT_GIF = 'image/gif'
export const ACCEPT_PDF = 'application/pdf'
export const ACCEPT_ANY = '*'
