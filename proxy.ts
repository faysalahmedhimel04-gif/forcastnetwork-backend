import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/session'
import { applyCorsHeaders, getAllowedOrigin } from '@/lib/cors'

/**
 * Next.js Proxy (root level) for Supabase session handling in the backend API.
 *
 * For this backend, most authentication is done via explicit `Authorization: Bearer <token>`
 * headers on API routes (see lib/auth.ts + getAuthenticatedUser). This proxy mainly provides
 * the standard Supabase cookie session refresh behavior for any future cookie-based flows.
 *
 * We migrated from the deprecated `middleware.ts` → `proxy.ts` (Next.js 16+).
 * Internal session logic: lib/supabase/session.ts
 *
 * We also handle CORS here so the frontend (on a different Vercel domain) can call the API.
 */
export async function proxy(request: NextRequest) {
  const origin = getAllowedOrigin(request.headers.get('origin'))

  // Handle preflight requests for API routes (important for cross-origin POST/PATCH etc.)
  if (request.method === 'OPTIONS' && request.nextUrl.pathname.startsWith('/api/')) {
    const response = new NextResponse(null, { status: 204 })
    return applyCorsHeaders(response, request.headers.get('origin'))
  }

  try {
    const response = await updateSession(request)
    if (request.nextUrl.pathname.startsWith('/api/')) {
      applyCorsHeaders(response, request.headers.get('origin'))
    }
    return response
  } catch (error) {
    // Safety net: never let proxy throw and produce MIDDLEWARE_INVOCATION_FAILED 500s.
    console.error('[Proxy] Session update error (continuing):', error)
    const response = NextResponse.next()
    if (request.nextUrl.pathname.startsWith('/api/')) {
      applyCorsHeaders(response, request.headers.get('origin'))
    }
    return response
  }
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
