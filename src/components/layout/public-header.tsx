import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { LogIn, Home, Calendar, Building2 } from 'lucide-react'

export function PublicHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-20 items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/imatges/BAU-black-CAT.svg"
            alt="BAU - Centre Universitari d'Arts i Disseny"
            width={180}
            height={62}
            className="dark:invert"
            priority
          />
        </Link>
        
        <nav className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <Home className="h-4 w-4 mr-2" />
              Inici
            </Button>
          </Link>
          <Link href="/horaris">
            <Button variant="ghost" size="sm">
              <Calendar className="h-4 w-4 mr-2" />
              Horaris
            </Button>
          </Link>
          <Link href="/directori-aules">
            <Button variant="ghost" size="sm">
              <Building2 className="h-4 w-4 mr-2" />
              Aules
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="default" size="sm">
              <LogIn className="h-4 w-4 mr-2" />
              Accés Personal
            </Button>
          </Link>
        </nav>
      </div>
    </header>
  )
}