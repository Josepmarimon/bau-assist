// Export CSV per a WordPress (WP All Import).
//
// Una fila per cada submission amb status 'submitted' o 'reviewed'.
// Capçaleres = nom WP esperat:
//   - post_title, post_status, post_date, post_author_email
//   - tax_input[tfg]  (assigna la taxonomia tfg)
//   - {meta_key d'ACF}  (un per cada camp del Field Group)
//
// Per fitxers: l'URL signada de Supabase Storage (vàlida 7 dies). WP All Import
// la descarrega, la puja al Media Library, i n'usa l'ID com a meta value.
// Galleries: URLs separades per ' | '.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isTfgAdmin } from '@/lib/tfg/auth'
import type { TfgFile, TfgSubmission } from '@/lib/tfg/types'

const SIGNED_URL_TTL = 60 * 60 * 24 * 7 // 7 dies

// ACF tenia un meta_key amb dos punts al final. El mantenim a l'export per
// fer la migració 1:1 amb el WP existent.
const ACF_META_KEY_FORMAT_MEMORIA = 'format_de_memoria_del_projecte:'

// Columnes (ordre estable). Si el meta_key d'ACF difereix del nom de columna a
// Postgres, ho indiquem amb [pgColumn, metaKey].
type ColSpec = string | [string, string]

const COLUMNS: ColSpec[] = [
  // WP post fields
  'id',
  ['titol', 'post_title'],
  ['correu_electrponic', 'post_author_email'],
  ['submitted_at', 'post_date'],
  // Taxonomia
  ['__tax_tfg__', 'tax_input[tfg]'],
  ['__post_status__', 'post_status'],

  // ACF meta_keys (un a un, tal com a ACF inclosos els typos)
  'autor',
  'afegir_un_altre_autora',
  'autora',
  'correu_electrponic',
  'titol',
  'any',
  'itinerari_matriculat',
  'tribunal_assignat',
  'tipologia_de_projecte',
  'abstract_en_catala',
  'abstract_espanyol',
  'abstract_angles',
  'imatge_representativa',
  'tens_gif_animats',
  'galeria_gif_animat',
  'imatges_projecte',
  ['format_de_memoria_del_projecte', ACF_META_KEY_FORMAT_MEMORIA],
  'enllac_a_larxiu_onedrive_google_drive_dropbox',
  'memoria',
  'enllac_a_la_memoria_en_format_web',
  'pdf_de_la_memoria',
  'te_informacio_addicional',
  'documentacio_addicional',
  'enllac_a_la_documentacio_onedrive',
  'url_projecte',
  'el_projecte_te_video',
  'on_estan_els_teus_videos',
  'video_del_projecte',
  'video_de_vimeo',
  'el_video_te_password',
  'contrasenya_del_video_1',
  'el_projecte_te_segon_video',
  'video_2_projecte',
  'video_2_projecte_copia',
  'el_video_te_password_2',
  'contrasenya_del_video_2',
  'el_projecte_te_segon_video_3',
  'video_3_projecte',
  'video_3_projecte_vimeo',
  'el_video_te_password_3',
  'contrasenya_del_video_3',
  'te_arxius_addicionals',
  'fitxers_executables',
]

export async function GET(request: Request) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  if (!(await isTfgAdmin(supabase))) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const url = new URL(request.url)
  const includeReviewed = url.searchParams.get('include_reviewed') !== 'false'
  const statuses = includeReviewed ? ['submitted', 'reviewed'] : ['submitted']

  const { data: submissions, error } = await supabase
    .from('tfg_submissions')
    .select('*')
    .in('status', statuses)
    .order('submitted_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Construeix una taula de URLs signades per a tots els fitxers d'aquest export.
  const allPaths: string[] = []
  for (const s of submissions ?? []) {
    for (const f of collectFiles(s as TfgSubmission)) {
      allPaths.push(f.path)
    }
  }

  const signedMap = await batchSignUrls(supabase, allPaths, SIGNED_URL_TTL)

  const headerRow = COLUMNS.map((c) => (Array.isArray(c) ? c[1] : c))
  const lines: string[] = [headerRow.map(csvEscape).join(',')]

  for (const s of (submissions ?? []) as TfgSubmission[]) {
    const cells = COLUMNS.map((c) => {
      const pgCol = Array.isArray(c) ? c[0] : c
      return cellValue(s, pgCol, signedMap)
    })
    lines.push(cells.map(csvEscape).join(','))
  }

  const csv = lines.join('\n')

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="tfg-export-${new Date()
        .toISOString()
        .slice(0, 10)}.csv"`,
    },
  })
}

function cellValue(
  s: TfgSubmission,
  pgCol: string,
  signedMap: Map<string, string>
): string {
  if (pgCol === '__tax_tfg__') return 'tfg'
  if (pgCol === '__post_status__') return 'publish'

  const v = (s as unknown as Record<string, unknown>)[pgCol]
  if (v === null || v === undefined) return ''

  // Arrays text[] → separats per " | " (multi-checkbox d'ACF)
  if (Array.isArray(v) && v.every((x) => typeof x === 'string')) {
    return (v as string[]).join(' | ')
  }

  // Single file (jsonb {path,name,...})
  if (isFile(v)) {
    return signedMap.get(v.path) ?? ''
  }

  // Gallery / array de fitxers
  if (Array.isArray(v) && v.every(isFile)) {
    return (v as TfgFile[]).map((f) => signedMap.get(f.path) ?? '').filter(Boolean).join(' | ')
  }

  if (typeof v === 'boolean') return v ? '1' : '0'

  return String(v)
}

function isFile(v: unknown): v is TfgFile {
  return (
    typeof v === 'object' &&
    v !== null &&
    'path' in v &&
    typeof (v as { path: unknown }).path === 'string'
  )
}

function collectFiles(s: TfgSubmission): TfgFile[] {
  const out: TfgFile[] = []
  const fileFields: (keyof TfgSubmission)[] = [
    'imatge_representativa',
    'memoria',
    'pdf_de_la_memoria',
    'documentacio_addicional',
  ]
  const galleryFields: (keyof TfgSubmission)[] = [
    'galeria_gif_animat',
    'imatges_projecte',
    'fitxers_executables',
  ]
  for (const k of fileFields) {
    const v = s[k]
    if (isFile(v)) out.push(v)
  }
  for (const k of galleryFields) {
    const v = s[k]
    if (Array.isArray(v)) {
      for (const f of v) if (isFile(f)) out.push(f)
    }
  }
  return out
}

type SupabaseClient = Awaited<ReturnType<typeof createClient>>

async function batchSignUrls(
  supabase: SupabaseClient,
  paths: string[],
  ttl: number
): Promise<Map<string, string>> {
  const map = new Map<string, string>()
  if (paths.length === 0) return map

  // createSignedUrls accepta array de paths
  const { data, error } = await supabase.storage
    .from('tfg-files')
    .createSignedUrls(paths, ttl)

  if (error || !data) return map

  for (const item of data) {
    if (item.signedUrl && item.path) {
      map.set(item.path, item.signedUrl)
    }
  }
  return map
}

function csvEscape(value: string): string {
  if (value === '' || value === null || value === undefined) return ''
  const needsQuotes = /[",\n\r]/.test(value)
  if (!needsQuotes) return value
  return `"${value.replace(/"/g, '""')}"`
}
