import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // During build, preview, or if env vars missing/misconfigured in Vercel,
  // skip Supabase initialization to prevent crashes at the proxy edge.
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase Session] Missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY, skipping session update')
    return supabaseResponse
  }

  // Critical format validation. Common user error: pasting the /rest/v1/ URL or a key as the URL.
  // Must be the base project URL: https://<ref>.supabase.co
  if (!supabaseUrl.startsWith('http') || supabaseUrl.includes('/rest/v1')) {
    console.error('[Supabase Session] Invalid NEXT_PUBLIC_SUPABASE_URL. It must be the base URL e.g. https://xyzcompany.supabase.co (no trailing slash, no /rest/v1/)')
    return supabaseResponse
  }

  if (!supabaseUrl.includes('supabase.co') && !supabaseUrl.includes('supabase.in')) {
    console.error('[Supabase Session] NEXT_PUBLIC_SUPABASE_URL does not look like a valid Supabase URL')
    return supabaseResponse
  }

  try {
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
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

    // For this backend (token-based auth via Authorization: Bearer from frontend),
    // the cookie-based getUser is mostly not needed. We still run a guarded version
    // for compatibility with Supabase SSR patterns.
    await supabase.auth.getUser()
  } catch (err) {
    // Never let the proxy throw — this used to produce MIDDLEWARE_INVOCATION_FAILED 500s
    console.error('[Supabase Session] createServerClient or getUser threw:', err)
    return supabaseResponse
  }

  // (Optional future protected API logic can go here; current routes validate Bearer token themselves)
  return supabaseResponse
}
