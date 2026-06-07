import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Creates a Supabase client for server-side use (Route Handlers, Server Actions, etc.)
 * Uses the anon key by default for user-context operations.
 * For admin operations, use createAdminClient below.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

/**
 * Creates a Supabase client with Service Role Key.
 * Bypasses Row Level Security - use only for trusted server operations
 * like admin tasks, triggers, or when RLS needs to be bypassed.
 * NEVER use this on the client or expose the key.
 */
export async function createAdminClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
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
        // Do not persist session for service role
        persistSession: false,
      },
    }
  )
}

/**
 * Helper to get the current user from the request (for API routes)
 * Pass the Authorization header token from the frontend.
 */
export async function getUserFromToken(token: string | null) {
  if (!token) return null

  const supabase = await createClient()
  
  // Set the auth token for this request
  const { data: { user }, error } = await supabase.auth.getUser(token.replace('Bearer ', ''))

  if (error) {
    console.error('Error getting user from token:', error)
    return null
  }

  return user
}
