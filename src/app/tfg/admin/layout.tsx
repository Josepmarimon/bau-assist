import { ReactNode } from 'react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isTfgAdmin } from '@/lib/tfg/auth'
import { ShieldCheck, ArrowLeft } from 'lucide-react'

export default async function TfgAdminLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/tfg/login')
  if (!(await isTfgAdmin(supabase))) redirect('/tfg')

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/tfg"
              className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <ArrowLeft className="h-4 w-4" /> Tornar
            </Link>
            <h1 className="font-semibold inline-flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-amber-700" />
              TFG · Backoffice
            </h1>
          </div>
          <nav className="flex items-center gap-1 text-sm">
            <NavLink href="/tfg/admin">Lliuraments</NavLink>
            <NavLink href="/tfg/admin/tribunals">Tribunals</NavLink>
            <NavLink href="/tfg/admin/access">Accés</NavLink>
            <NavLink href="/tfg/admin/export">Export</NavLink>
          </nav>
        </div>
      </header>
      {children}
    </div>
  )
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded hover:bg-slate-100 transition-colors"
    >
      {children}
    </Link>
  )
}
