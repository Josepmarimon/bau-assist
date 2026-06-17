// Type definitions per a la taula tfg_submissions.
// Els noms repliquen els meta_key d'ACF (incloent els errors ortogràfics)
// per facilitar la migració cap a WordPress.

export type TfgFile = {
  path: string         // path dins el bucket tfg-files
  name: string         // nom original del fitxer
  mime: string
  size: number
}

export type TfgStatus = 'draft' | 'submitted' | 'reviewed'

export interface TfgSubmission {
  id: string
  user_id: string
  status: TfgStatus
  created_at: string
  updated_at: string
  submitted_at: string | null

  // Autoria
  autor: string | null
  afegir_un_altre_autora: boolean
  autora: string | null
  correu_electrponic: string | null

  // Projecte
  titol: string | null
  any: number | null
  itinerari_matriculat: string | null
  tribunal_assignat: string | null
  tipologia_de_projecte: string[]

  // Abstracts
  abstract_en_catala: string | null
  abstract_espanyol: string | null
  abstract_angles: string | null

  // Imatges
  imatge_representativa: TfgFile | null
  tens_gif_animats: boolean
  galeria_gif_animat: TfgFile[]
  imatges_projecte: TfgFile[]

  // Memòria
  format_de_memoria_del_projecte: string[]
  enllac_a_larxiu_onedrive_google_drive_dropbox: string | null
  memoria: TfgFile | null
  enllac_a_la_memoria_en_format_web: string | null
  pdf_de_la_memoria: TfgFile | null
  te_informacio_addicional: boolean
  documentacio_addicional: TfgFile | null
  enllac_a_la_documentacio_onedrive: string | null
  url_projecte: string | null

  // Vídeos
  el_projecte_te_video: boolean
  on_estan_els_teus_videos: string | null
  video_del_projecte: string | null
  video_de_vimeo: string | null
  el_video_te_password: boolean
  contrasenya_del_video_1: string | null
  el_projecte_te_segon_video: boolean
  video_2_projecte: string | null
  video_2_projecte_copia: string | null
  el_video_te_password_2: boolean
  contrasenya_del_video_2: string | null
  el_projecte_te_segon_video_3: boolean
  video_3_projecte: string | null
  video_3_projecte_vimeo: string | null
  el_video_te_password_3: boolean
  contrasenya_del_video_3: string | null

  // Extres
  te_arxius_addicionals: boolean
  fitxers_executables: TfgFile[]
}

// Camps editables des del formulari (exclou metadades de sistema).
export type TfgEditableFields = Omit<
  TfgSubmission,
  'id' | 'user_id' | 'status' | 'created_at' | 'updated_at' | 'submitted_at'
>
