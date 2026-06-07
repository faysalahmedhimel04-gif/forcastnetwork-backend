import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Example: Protect certain API routes
  // You can customize this based on your needs
  const protectedApiRoutes = ['/api/forecasts', '/api/comments', '/api/follows', '/api/profiles']
  const isProtectedApi = protectedApiRoutes.some((route) =>
    request.nextUrl.pathname.startsWith(route)
  )

  // For API routes, we rely more on token validation in the route handler itself
  // Middleware here can add headers or basic checks
  if (isProtectedApi && !user && request.nextUrl.pathname.startsWith('/api/')) {
    // For API, we let the route handler decide based on Bearer token
    // This middleware can be used for additional logging or headers
  }

  return supabaseResponse
}
