import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

// Map old English routes to new Catalan routes
const routeRedirects: Record<string, string> = {
  '/subjects': '/assignatures',
  '/teachers': '/professors',
  '/classrooms': '/aules',
  '/schedule': '/horari',
  '/settings': '/configuracio',
  '/software': '/programari',
  '/student-groups': '/grups-estudiants',
  '/classroom-assignments': '/assignacions-aules',
  '/software-assignments': '/assignacions-programari',
  '/course-assignments': '/assignacions-docencia',
  '/schedule-import': '/importar-horari'
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  
  // Check if the current path needs to be redirected
  if (routeRedirects[pathname]) {
    const url = request.nextUrl.clone()
    url.pathname = routeRedirects[pathname]
    return NextResponse.redirect(url, { status: 301 })
  }
  
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images - .svg, .png, .jpg, .jpeg, .gif, .webp
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}