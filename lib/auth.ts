import { createClient } from '@/lib/supabase/server'
import { NextRequest } from 'next/server'

/**
 * Extracts the Supabase user from the Authorization Bearer token.
 * This is the recommended way when the frontend sends the session token
 * to your separate backend API.
 */
export async function getAuthenticatedUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const token = authHeader.replace('Bearer ', '')
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser(token)

  if (error || !user) {
    return null
  }

  return user
}

/**
 * Requires authentication. Throws/returns error response if not authenticated.
 * Use in API routes.
 */
export async function requireAuth(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return { error: 'Unauthorized', status: 401 }
  }
  return { user }
}
