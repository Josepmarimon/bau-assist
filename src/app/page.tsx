import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Building2, LogIn } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-secondary/20">
      <div className="container max-w-4xl px-4">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <Image
              src="/imatges/BAU-black-CAT.svg"
              alt="BAU - Centre Universitari d'Arts i Disseny"
              width={200}
              height={70}
              className="dark:invert"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold mb-2">BAU Assist</h1>
          <p className="text-xl text-muted-foreground">
            Sistema de gestió acadèmica
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Public Access Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Accés Públic
              </CardTitle>
              <CardDescription>
                Consulta informació sobre les nostres instal·lacions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/directori-aules" className="block">
                <Button className="w-full" variant="default">
                  Directori d'Aules
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground text-center">
                Explora els nostres espais d'aprenentatge
              </p>
            </CardContent>
          </Card>

          {/* Staff Access Card */}
          <Card className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LogIn className="h-5 w-5" />
                Accés Personal
              </CardTitle>
              <CardDescription>
                Per a professors i personal administratiu
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Link href="/login" className="block">
                <Button className="w-full" variant="outline">
                  Iniciar Sessió
                </Button>
              </Link>
              <p className="text-sm text-muted-foreground text-center">
                Gestió d'horaris i recursos
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}