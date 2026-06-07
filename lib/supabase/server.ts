import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Safe Supabase server client factory for the backend.
 *
 * Prevents runtime crashes (and build/prerender issues) when Supabase env vars
 * are not present or are invalid (common during first Vercel deploy before vars are added).
 *
 * If vars are missing/invalid, returns a dummy client whose query chains and auth calls
 * safely no-op. API routes already have try/catch + error responses, so public endpoints
 * (leaderboard, forecasts list, markets) will return empty results gracefully instead of 500.
 *
 * In production: set the three vars in Vercel Project Settings (Production + Preview).
 */

function createDummyClient() {
  const noOp = () => Promise.resolve({ data: [], error: null })
  const singleNoOp = () => Promise.resolve({ data: null, error: null })

  const chainable: any = {
    select: () => chainable,
    insert: noOp,
    update: noOp,
    delete: noOp,
    eq: () => chainable,
    neq: () => chainable,
    gt: () => chainable,
    gte: () => chainable,
    lt: () => chainable,
    lte: () => chainable,
    like: () => chainable,
    ilike: () => chainable,
    is: () => chainable,
    in: () => chainable,
    order: () => chainable,
    limit: () => chainable,
    range: () => chainable,
    single: singleNoOp,
    maybeSingle: singleNoOp,
    then: (resolve: any) => resolve({ data: [], error: null }),
  }

  return {
    from: () => chainable,
    auth: {
      getUser: async () => ({ data: { user: null }, error: null }),
      getSession: async () => ({ data: { session: null }, error: null }),
    },
    rpc: () => singleNoOp(),
  } as any
}

export async function createClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('[Supabase Server] Missing NEXT_PUBLIC_SUPABASE_URL or ANON_KEY — using dummy client')
    return createDummyClient()
  }

  // Additional sanity check on URL format
  if (!supabaseUrl.startsWith('http') || supabaseUrl.includes('/rest/v1')) {
    console.error('[Supabase Server] NEXT_PUBLIC_SUPABASE_URL looks invalid (contains /rest/v1/ or not http). Using dummy client.')
    return createDummyClient()
  }

  const cookieStore = await cookies()

  try {
    return createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have a proxy/session refresher
            // updating user sessions (see proxy.ts + lib/supabase/session.ts).
          }
        },
      },
    })
  } catch (err) {
    console.error('[Supabase Server] createServerClient threw, falling back to dummy:', err)
    return createDummyClient()
  }
}

/**
 * Creates a Supabase client with Service Role Key (bypasses RLS).
 * Use sparingly (admin operations, accuracy recalc, etc.).
 */
export async function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.warn('[Supabase Admin] Missing SUPABASE_SERVICE_ROLE_KEY or URL — using dummy admin client')
    return createDummyClient()
  }

  if (!supabaseUrl.startsWith('http') || supabaseUrl.includes('/rest/v1')) {
    console.error('[Supabase Admin] NEXT_PUBLIC_SUPABASE_URL invalid format. Using dummy.')
    return createDummyClient()
  }

  const cookieStore = await cookies()

  try {
    return createServerClient(supabaseUrl, serviceRoleKey, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Ignore cookie setting errors in server components
          }
        },
      },
      auth: {
        persistSession: false,
      },
    })
  } catch (err) {
    console.error('[Supabase Admin] createServerClient (service role) threw, dummy fallback:', err)
    return createDummyClient()
  }
}

/**
 * Helper to get the current user from the request (for API routes)
 * Pass the Authorization header token from the frontend.
 */
export async function getUserFromToken(token: string | null) {
  if (!token) return null

  const supabase = await createClient()

  // If we got a dummy client, it will safely return null user
  const { data: { user }, error } = await supabase.auth.getUser(token.replace('Bearer ', ''))

  if (error) {
    // Only log real errors (dummy returns no error)
    if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
      console.error('Error getting user from token:', error)
    }
    return null
  }

  return user
}
