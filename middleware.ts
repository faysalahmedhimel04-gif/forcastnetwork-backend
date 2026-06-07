import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

/**
 * Supabase session middleware (for any future protected routes or API auth helpers).
 *
 * NOTE on deprecation warning in Next.js 16+ (Turbopack):
 * The root `middleware.ts` convention may show a deprecation warning suggesting "proxy".
 * This is informational. For Supabase SSR, keeping middleware.ts is still the standard pattern.
 * The warning does not break builds or runtime. We can migrate later if needed.
 */
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
