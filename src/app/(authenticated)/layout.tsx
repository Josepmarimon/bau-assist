'use client'

import { ModernSidebar } from '@/components/layout/modern-sidebar'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        redirect('/login')
      } else {
        setIsAuthenticated(true)
      }
    }
    checkAuth()
  }, [supabase])

  if (isAuthenticated === null) {
    return null // or a loading spinner
  }

  return (
    <div className="flex h-screen bg-background">
      <ModernSidebar onCollapsedChange={setIsCollapsed} />
      <main className={cn(
        "flex-1 overflow-y-auto transition-all duration-300",
        isCollapsed ? "md:ml-0" : "md:ml-0"
      )}>
        <div className="container mx-auto p-6 md:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}