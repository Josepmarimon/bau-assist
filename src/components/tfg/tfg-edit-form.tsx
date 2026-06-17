'use client'

import { useState, useEffect, useRef, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Trash2,
  ArrowLeft,
} from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { FileUpload } from './file-upload'
import { saveDraftFields, submitTfg, deleteDraft } from '@/lib/tfg/actions'
import {
  ITINERARIS,
  TIPOLOGIES_PROJECTE,
  FORMATS_MEMORIA,
  PLATAFORMES_VIDEO,
  ACCEPT_IMAGE,
  ACCEPT_GIF,
  ACCEPT_PDF,
  MAX_IMAGE_SIZE,
  MAX_FILE_SIZE,
} from '@/lib/tfg/constants'
import type { TfgEditableFields, TfgFile, TfgSubmission } from '@/lib/tfg/types'

type Tribunal = { id: string; name: string; itinerari: string | null; display_order: number }

type Props = {
  submission: TfgSubmission
  tribunals: Tribunal[]
  userId: string
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

const AUTO_SAVE_DEBOUNCE_MS = 1500

export function TfgEditForm({ submission, tribunals, userId }: Props) {
  const router = useRouter()
  const [submitting, startSubmitTransition] = useTransition()
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [data, setData] = useState<TfgEditableFields>(stripSystem(submission))
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const [saveError, setSaveError] = useState<string | null>(null)
  const pendingTimerRef = useRef<NodeJS.Timeout | null>(null)
  const inFlightRef = useRef(false)
  const nextPatchRef = useRef<Partial<TfgEditableFields> | null>(null)
  const readOnly = submission.status !== 'draft'

  // Debounced auto-save
  useEffect(() => {
    return () => {
      if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    }
  }, [])

  function update<K extends keyof TfgEditableFields>(key: K, value: TfgEditableFields[K]) {
    if (readOnly) return
    setData((d) => ({ ...d, [key]: value }))
    queueSave({ [key]: value } as Partial<TfgEditableFields>)
  }

  function queueSave(patch: Partial<TfgEditableFields>) {
    nextPatchRef.current = { ...(nextPatchRef.current ?? {}), ...patch }
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    pendingTimerRef.current = setTimeout(flushSave, AUTO_SAVE_DEBOUNCE_MS)
  }

  async function flushSave() {
    if (inFlightRef.current) {
      // Reschedule if another save is in flight
      pendingTimerRef.current = setTimeout(flushSave, 500)
      return
    }
    const patch = nextPatchRef.current
    if (!patch || Object.keys(patch).length === 0) return

    nextPatchRef.current = null
    inFlightRef.current = true
    setSaveState('saving')
    setSaveError(null)

    const result = await saveDraftFields(submission.id, patch)

    inFlightRef.current = false
    if (result.ok) {
      setSaveState('saved')
      setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 1500)
      // Flush any patches queued during the in-flight call
      if (nextPatchRef.current) flushSave()
    } else {
      setSaveState('error')
      setSaveError(result.error)
    }
  }

  function handleSubmit() {
    setSubmitError(null)
    // Forçar flush abans de submit
    if (pendingTimerRef.current) clearTimeout(pendingTimerRef.current)
    startSubmitTransition(async () => {
      // Sync amb últims canvis
      if (nextPatchRef.current) {
        const finalPatch = nextPatchRef.current
        nextPatchRef.current = null
        await saveDraftFields(submission.id, finalPatch)
      }
      const result = await submitTfg(submission.id)
      if (result.ok) {
        router.push('/tfg')
        router.refresh()
      } else {
        setSubmitError(humanizeError(result.error))
      }
    })
  }

  function handleDelete() {
    if (!confirm("Segur que vols esborrar aquest esborrany? L'acció no es pot desfer.")) return
    deleteDraft(submission.id)
  }

  const filteredTribunals = data.itinerari_matriculat
    ? tribunals.filter((t) => !t.itinerari || t.itinerari === data.itinerari_matriculat)
    : tribunals

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Header */}
      <header className="flex items-center justify-between mb-6">
        <Link href="/tfg" className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-4 w-4" /> Els meus TFGs
        </Link>
        <SaveIndicator state={saveState} error={saveError} />
      </header>

      <h1 className="text-2xl font-bold mb-1">
        {data.titol || 'Esborrany sense títol'}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">
        {readOnly
          ? 'Aquest TFG ja està enviat i no es pot editar.'
          : 'Els canvis es desen automàticament. Pots tancar i tornar més endavant.'}
      </p>

      <fieldset disabled={readOnly} className="space-y-4">
        <Accordion type="multiple" defaultValue={['autoria', 'projecte']} className="space-y-2">
          {/* AUTORIA --------------------------------------------------- */}
          <Section value="autoria" title="1. Autoria">
            <Field label="Autor/a *">
              <Input
                value={data.autor ?? ''}
                onChange={(e) => update('autor', e.target.value || null)}
              />
            </Field>

            <ToggleField
              label="Afegir un altre autor/a?"
              checked={data.afegir_un_altre_autora}
              onChange={(v) => update('afegir_un_altre_autora', v)}
            />

            {data.afegir_un_altre_autora && (
              <Field label="Segon/a autor/a">
                <Input
                  value={data.autora ?? ''}
                  onChange={(e) => update('autora', e.target.value || null)}
                />
              </Field>
            )}

            <Field label="Correu electrònic *">
              <Input
                type="email"
                value={data.correu_electrponic ?? ''}
                onChange={(e) => update('correu_electrponic', e.target.value || null)}
              />
            </Field>
          </Section>

          {/* PROJECTE -------------------------------------------------- */}
          <Section value="projecte" title="2. Dades del projecte">
            <Field label="Títol del projecte *">
              <Input
                value={data.titol ?? ''}
                onChange={(e) => update('titol', e.target.value || null)}
              />
            </Field>

            <Field label="Any de presentació *">
              <Input
                type="number"
                min={2020}
                max={2099}
                value={data.any ?? ''}
                onChange={(e) =>
                  update('any', e.target.value ? Number(e.target.value) : null)
                }
              />
            </Field>

            <Field label="Itinerari *">
              <Select
                value={data.itinerari_matriculat ?? undefined}
                onValueChange={(v) => update('itinerari_matriculat', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un itinerari" />
                </SelectTrigger>
                <SelectContent>
                  {ITINERARIS.map((i) => (
                    <SelectItem key={i} value={i}>
                      {i}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Tribunal assignat *">
              <Select
                value={data.tribunal_assignat ?? undefined}
                onValueChange={(v) => update('tribunal_assignat', v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tribunal" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTribunals.map((t) => (
                    <SelectItem key={t.id} value={t.name}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Sel·lecciona el tribunal que t&apos;han assignat. La llista es filtra segons l&apos;itinerari.
              </p>
            </Field>

            <Field label="Tipologia de projecte">
              <CheckboxGroup
                options={[...TIPOLOGIES_PROJECTE]}
                values={data.tipologia_de_projecte}
                onChange={(values) => update('tipologia_de_projecte', values)}
              />
            </Field>
          </Section>

          {/* ABSTRACTS ------------------------------------------------- */}
          <Section value="abstracts" title="3. Abstracts">
            <Field label="Abstract en Català *">
              <Textarea
                rows={4}
                value={data.abstract_en_catala ?? ''}
                onChange={(e) => update('abstract_en_catala', e.target.value || null)}
              />
            </Field>
            <Field label="Abstract en Espanyol *">
              <Textarea
                rows={4}
                value={data.abstract_espanyol ?? ''}
                onChange={(e) => update('abstract_espanyol', e.target.value || null)}
              />
            </Field>
            <Field label="Abstract en Anglès *">
              <Textarea
                rows={4}
                value={data.abstract_angles ?? ''}
                onChange={(e) => update('abstract_angles', e.target.value || null)}
              />
            </Field>
          </Section>

          {/* IMATGES --------------------------------------------------- */}
          <Section value="imatges" title="4. Imatges">
            <FileUpload
              mode="single"
              submissionId={submission.id}
              userId={userId}
              fieldName="imatge_representativa"
              accept={ACCEPT_IMAGE}
              maxSize={MAX_IMAGE_SIZE}
              label="Imatge representativa *"
              description="Imatge principal del projecte (JPG, PNG, WebP)."
              value={data.imatge_representativa}
              onChange={(v) => update('imatge_representativa', v as TfgFile | null)}
            />

            <FileUpload
              mode="gallery"
              submissionId={submission.id}
              userId={userId}
              fieldName="imatges_projecte"
              accept={ACCEPT_IMAGE}
              maxSize={MAX_IMAGE_SIZE}
              label="Galeria d'imatges del projecte"
              description="Pots pujar diverses imatges."
              value={data.imatges_projecte}
              onChange={(v) => update('imatges_projecte', v as TfgFile[])}
            />

            <ToggleField
              label="Tens GIFs animats?"
              checked={data.tens_gif_animats}
              onChange={(v) => update('tens_gif_animats', v)}
            />

            {data.tens_gif_animats && (
              <FileUpload
                mode="gallery"
                submissionId={submission.id}
                userId={userId}
                fieldName="galeria_gif_animat"
                accept={ACCEPT_GIF}
                maxSize={MAX_IMAGE_SIZE}
                label="Galeria de GIFs animats"
                value={data.galeria_gif_animat}
                onChange={(v) => update('galeria_gif_animat', v as TfgFile[])}
              />
            )}
          </Section>

          {/* MEMÒRIA --------------------------------------------------- */}
          <Section value="memoria" title="5. Memòria del projecte">
            <Field label="Format de la memòria *">
              <CheckboxGroup
                options={[...FORMATS_MEMORIA]}
                values={data.format_de_memoria_del_projecte}
                onChange={(values) => update('format_de_memoria_del_projecte', values)}
              />
            </Field>

            {data.format_de_memoria_del_projecte.includes('Format PDF') && (
              <FileUpload
                mode="single"
                submissionId={submission.id}
                userId={userId}
                fieldName="memoria"
                accept={ACCEPT_PDF}
                maxSize={MAX_FILE_SIZE}
                label="Memòria en PDF"
                value={data.memoria}
                onChange={(v) => update('memoria', v as TfgFile | null)}
              />
            )}

            {data.format_de_memoria_del_projecte.includes(
              'Enllaç al Drive (Onedrive, google drive, dropbox)'
            ) && (
              <Field label="Enllaç a OneDrive / Google Drive / Dropbox">
                <Input
                  type="url"
                  placeholder="https://..."
                  value={data.enllac_a_larxiu_onedrive_google_drive_dropbox ?? ''}
                  onChange={(e) =>
                    update(
                      'enllac_a_larxiu_onedrive_google_drive_dropbox',
                      e.target.value || null
                    )
                  }
                />
              </Field>
            )}

            {data.format_de_memoria_del_projecte.includes('Format WEB') && (
              <>
                <Field label="Enllaç a la memòria en format web">
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={data.enllac_a_la_memoria_en_format_web ?? ''}
                    onChange={(e) =>
                      update('enllac_a_la_memoria_en_format_web', e.target.value || null)
                    }
                  />
                </Field>
                <FileUpload
                  mode="single"
                  submissionId={submission.id}
                  userId={userId}
                  fieldName="pdf_de_la_memoria"
                  accept={ACCEPT_PDF}
                  maxSize={MAX_FILE_SIZE}
                  label="PDF d'arxiu de la memòria web"
                  description="Si en un futur s'esborra la memòria de la web, aquest PDF queda com a arxiu."
                  value={data.pdf_de_la_memoria}
                  onChange={(v) => update('pdf_de_la_memoria', v as TfgFile | null)}
                />
              </>
            )}

            <Field label="URL del projecte (opcional)">
              <Input
                type="url"
                placeholder="https://..."
                value={data.url_projecte ?? ''}
                onChange={(e) => update('url_projecte', e.target.value || null)}
              />
            </Field>

            <ToggleField
              label="La memòria té informació addicional?"
              checked={data.te_informacio_addicional}
              onChange={(v) => update('te_informacio_addicional', v)}
            />

            {data.te_informacio_addicional && (
              <>
                <FileUpload
                  mode="single"
                  submissionId={submission.id}
                  userId={userId}
                  fieldName="documentacio_addicional"
                  maxSize={MAX_FILE_SIZE}
                  label="Documentació addicional"
                  value={data.documentacio_addicional}
                  onChange={(v) => update('documentacio_addicional', v as TfgFile | null)}
                />
                <Field label="O bé, enllaç a la documentació al OneDrive">
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={data.enllac_a_la_documentacio_onedrive ?? ''}
                    onChange={(e) =>
                      update('enllac_a_la_documentacio_onedrive', e.target.value || null)
                    }
                  />
                </Field>
              </>
            )}
          </Section>

          {/* VIDEOS ---------------------------------------------------- */}
          <Section value="videos" title="6. Vídeos">
            <ToggleField
              label="El projecte té vídeo?"
              checked={data.el_projecte_te_video}
              onChange={(v) => update('el_projecte_te_video', v)}
            />

            {data.el_projecte_te_video && (
              <>
                <Field label="On estan els teus vídeos?">
                  <Select
                    value={data.on_estan_els_teus_videos ?? undefined}
                    onValueChange={(v) => update('on_estan_els_teus_videos', v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una plataforma" />
                    </SelectTrigger>
                    <SelectContent>
                      {PLATAFORMES_VIDEO.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <VideoBlock
                  label="Vídeo 1"
                  plataforma={data.on_estan_els_teus_videos}
                  ytUrl={data.video_del_projecte}
                  vimUrl={data.video_de_vimeo}
                  hasPassword={data.el_video_te_password}
                  password={data.contrasenya_del_video_1}
                  onYt={(v) => update('video_del_projecte', v)}
                  onVim={(v) => update('video_de_vimeo', v)}
                  onPassToggle={(v) => update('el_video_te_password', v)}
                  onPassword={(v) => update('contrasenya_del_video_1', v)}
                />

                <ToggleField
                  label="El projecte té un segon vídeo?"
                  checked={data.el_projecte_te_segon_video}
                  onChange={(v) => update('el_projecte_te_segon_video', v)}
                />

                {data.el_projecte_te_segon_video && (
                  <>
                    <VideoBlock
                      label="Vídeo 2"
                      plataforma={data.on_estan_els_teus_videos}
                      ytUrl={data.video_2_projecte}
                      vimUrl={data.video_2_projecte_copia}
                      hasPassword={data.el_video_te_password_2}
                      password={data.contrasenya_del_video_2}
                      onYt={(v) => update('video_2_projecte', v)}
                      onVim={(v) => update('video_2_projecte_copia', v)}
                      onPassToggle={(v) => update('el_video_te_password_2', v)}
                      onPassword={(v) => update('contrasenya_del_video_2', v)}
                    />

                    <ToggleField
                      label="El projecte té un tercer vídeo?"
                      checked={data.el_projecte_te_segon_video_3}
                      onChange={(v) => update('el_projecte_te_segon_video_3', v)}
                    />

                    {data.el_projecte_te_segon_video_3 && (
                      <VideoBlock
                        label="Vídeo 3"
                        plataforma={data.on_estan_els_teus_videos}
                        ytUrl={data.video_3_projecte}
                        vimUrl={data.video_3_projecte_vimeo}
                        hasPassword={data.el_video_te_password_3}
                        password={data.contrasenya_del_video_3}
                        onYt={(v) => update('video_3_projecte', v)}
                        onVim={(v) => update('video_3_projecte_vimeo', v)}
                        onPassToggle={(v) => update('el_video_te_password_3', v)}
                        onPassword={(v) => update('contrasenya_del_video_3', v)}
                      />
                    )}
                  </>
                )}
              </>
            )}
          </Section>

          {/* EXECUTABLES ----------------------------------------------- */}
          <Section value="executables" title="7. Fitxers addicionals">
            <ToggleField
              label="Té fitxers executables o altres?"
              checked={data.te_arxius_addicionals}
              onChange={(v) => update('te_arxius_addicionals', v)}
            />

            {data.te_arxius_addicionals && (
              <FileUpload
                mode="gallery"
                submissionId={submission.id}
                userId={userId}
                fieldName="fitxers_executables"
                maxSize={MAX_FILE_SIZE}
                label="Fitxers executables / altres"
                value={data.fitxers_executables}
                onChange={(v) => update('fitxers_executables', v as TfgFile[])}
              />
            )}
          </Section>
        </Accordion>
      </fieldset>

      {/* SUBMIT BAR */}
      {!readOnly && (
        <div className="mt-8 pt-6 border-t flex flex-wrap items-center justify-between gap-3">
          <Button type="button" variant="ghost" onClick={handleDelete} className="text-destructive">
            <Trash2 className="h-4 w-4 mr-1" />
            Esborrar esborrany
          </Button>
          <Button type="button" size="lg" onClick={handleSubmit} disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviant...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Enviar definitivament
              </>
            )}
          </Button>
        </div>
      )}

      {submitError && (
        <div className="mt-3 p-3 rounded bg-destructive/10 border border-destructive/20 text-sm text-destructive flex gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{submitError}</p>
        </div>
      )}
    </div>
  )
}

function Section({
  value,
  title,
  children,
}: {
  value: string
  title: string
  children: React.ReactNode
}) {
  return (
    <AccordionItem value={value} className="bg-white border rounded-lg px-4">
      <AccordionTrigger className="text-base font-semibold">{title}</AccordionTrigger>
      <AccordionContent className="space-y-4 pt-2 pb-4">{children}</AccordionContent>
    </AccordionItem>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
    </div>
  )
}

function ToggleField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <Label className="text-sm">{label}</Label>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  )
}

function CheckboxGroup({
  options,
  values,
  onChange,
}: {
  options: string[]
  values: string[]
  onChange: (v: string[]) => void
}) {
  function toggle(opt: string) {
    onChange(values.includes(opt) ? values.filter((v) => v !== opt) : [...values, opt])
  }
  return (
    <div className="space-y-2">
      {options.map((opt) => (
        <div key={opt} className="flex items-center gap-2">
          <Checkbox
            id={`cb-${opt}`}
            checked={values.includes(opt)}
            onCheckedChange={() => toggle(opt)}
          />
          <Label htmlFor={`cb-${opt}`} className="text-sm font-normal">
            {opt}
          </Label>
        </div>
      ))}
    </div>
  )
}

function VideoBlock(props: {
  label: string
  plataforma: string | null
  ytUrl: string | null
  vimUrl: string | null
  hasPassword: boolean
  password: string | null
  onYt: (v: string | null) => void
  onVim: (v: string | null) => void
  onPassToggle: (v: boolean) => void
  onPassword: (v: string | null) => void
}) {
  return (
    <div className="rounded border p-3 space-y-3 bg-slate-50/50">
      <p className="text-sm font-medium">{props.label}</p>
      {props.plataforma === 'Youtube' && (
        <Field label="URL de YouTube">
          <Input
            type="url"
            placeholder="https://youtube.com/..."
            value={props.ytUrl ?? ''}
            onChange={(e) => props.onYt(e.target.value || null)}
          />
        </Field>
      )}
      {props.plataforma === 'Vimeo' && (
        <Field label="URL de Vimeo">
          <Input
            type="url"
            placeholder="https://vimeo.com/..."
            value={props.vimUrl ?? ''}
            onChange={(e) => props.onVim(e.target.value || null)}
          />
        </Field>
      )}

      <ToggleField
        label="El vídeo té contrasenya?"
        checked={props.hasPassword}
        onChange={props.onPassToggle}
      />

      {props.hasPassword && (
        <Field label="Contrasenya">
          <Input
            type="text"
            value={props.password ?? ''}
            onChange={(e) => props.onPassword(e.target.value || null)}
          />
        </Field>
      )}
    </div>
  )
}

function SaveIndicator({ state, error }: { state: SaveState; error: string | null }) {
  if (state === 'saving') {
    return (
      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
        <Loader2 className="h-3 w-3 animate-spin" /> Desant...
      </span>
    )
  }
  if (state === 'saved') {
    return (
      <span className="text-xs text-emerald-700 inline-flex items-center gap-1">
        <CheckCircle2 className="h-3 w-3" /> Desat
      </span>
    )
  }
  if (state === 'error') {
    return (
      <span className="text-xs text-destructive inline-flex items-center gap-1" title={error ?? ''}>
        <AlertCircle className="h-3 w-3" /> Error en desar
      </span>
    )
  }
  return null
}

function stripSystem(s: TfgSubmission): TfgEditableFields {
  const {
    id: _id,
    user_id: _user_id,
    status: _status,
    created_at: _created_at,
    updated_at: _updated_at,
    submitted_at: _submitted_at,
    ...rest
  } = s
  return rest
}

function humanizeError(msg: string): string {
  if (msg.includes('submitted_requires_required_fields')) {
    return 'Falten camps obligatoris per poder enviar definitivament. Revisa l\'autor, títol, abstracts, imatge representativa, tribunal, itinerari, any i format de memòria.'
  }
  return msg
}
