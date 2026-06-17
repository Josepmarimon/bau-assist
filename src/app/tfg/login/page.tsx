'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Image from 'next/image'
import { motion } from 'framer-motion'
import { Mail, AlertCircle, CheckCircle2, GraduationCap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { requestMagicLink } from './actions'

type Status =
  | { kind: 'idle' }
  | { kind: 'error'; message: string }
  | { kind: 'sent'; email: string }

export default function TfgLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<Status>({ kind: 'idle' })
  const [pending, startTransition] = useTransition()

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) router.replace('/tfg')
    })
  }, [router])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const formData = new FormData()
    formData.set('email', email)

    startTransition(async () => {
      const result = await requestMagicLink(formData)
      if (result.ok) {
        setStatus({ kind: 'sent', email })
      } else {
        setStatus({ kind: 'error', message: result.error })
      }
    })
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image
              src="/imatges/BAU-black-CAT.svg"
              alt="BAU"
              width={160}
              height={50}
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center justify-center gap-2">
            <GraduationCap className="h-6 w-6" />
            Lliurament de TFG
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            Plataforma temporal de pujada del Treball Final de Grau
          </p>
        </div>

        <Card className="shadow-lg border-0">
          {status.kind === 'sent' ? (
            <>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle2 className="h-5 w-5" />
                  Comprova el teu correu
                </CardTitle>
                <CardDescription>
                  Hem enviat un enllaç d&apos;accés a <strong>{status.email}</strong>. Clica
                  l&apos;enllaç per entrar — caduca en 1 hora.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Si no el reps en uns minuts, comprova la carpeta de correu brossa.
                </p>
                <button
                  type="button"
                  onClick={() => setStatus({ kind: 'idle' })}
                  className="text-sm text-primary hover:underline"
                >
                  Provar amb un altre correu
                </button>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader>
                <CardTitle>Accedeix amb el teu correu</CardTitle>
                <CardDescription>
                  Et farem arribar un enllaç d&apos;accés sense contrasenya. Només els correus
                  autoritzats pels coordinadors poden accedir.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Correu electrònic
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                        placeholder="nom.cognom@bau.cat"
                        autoComplete="email"
                        required
                        disabled={pending}
                      />
                    </div>
                  </div>

                  {status.kind === 'error' && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                      <p className="text-sm text-destructive">{status.message}</p>
                    </div>
                  )}

                  <Button type="submit" className="w-full" size="lg" disabled={pending}>
                    {pending ? 'Enviant...' : "Enviar enllaç d'accés"}
                  </Button>
                </form>

                <p className="mt-6 text-xs text-center text-muted-foreground">
                  Dubtes?{' '}
                  <a href="mailto:suport.informatica@bau.cat" className="text-primary hover:underline">
                    suport.informatica@bau.cat
                  </a>
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </motion.div>
    </div>
  )
}
