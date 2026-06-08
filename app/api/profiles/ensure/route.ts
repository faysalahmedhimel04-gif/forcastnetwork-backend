import { NextRequest, NextResponse } from 'next/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { ensureProfileForUser } from '@/lib/profiles'
import { applyCorsHeaders } from '@/lib/cors'
import type { ApiResponse } from '@/types'

/**
 * POST /api/profiles/ensure
 * Idempotent endpoint: makes sure the currently authenticated user has a row in public.profiles.
 * Safe to call after login or signup.
 * Uses service-role under the hood so it works even if the DB trigger failed.
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    const res = NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized' }, { status: 401 })
    return applyCorsHeaders(res, request.headers.get('origin'))
  }

  try {
    // Allow the caller (especially signup) to force a specific username/full_name.
    // This is the value the user explicitly typed in the signup form.
    let overrides: any = {}
    try {
      const body = await request.json()
      overrides = body || {}
    } catch {}

    const meta = {
      ...(user.user_metadata || {}),
      ...(overrides.username ? { username: overrides.username } : {}),
      ...(overrides.full_name ? { full_name: overrides.full_name } : {}),
    }

    // Pass full user (with possible overrides merged) so ensure uses the right handle
    const result = await ensureProfileForUser({
      id: user.id,
      email: user.email,
      user_metadata: meta,
    })

    const res = NextResponse.json<ApiResponse<{ created: boolean; username?: string }>>({
      data: {
        created: !!result.created,
        username: result.username,
      },
      message: result.created ? 'Profile created' : 'Profile already existed',
    })
    return applyCorsHeaders(res, request.headers.get('origin'))
  } catch (err: any) {
    console.error('[profiles/ensure] error', err)
    const res = NextResponse.json<ApiResponse<null>>({ error: 'Failed to ensure profile' }, { status: 500 })
    return applyCorsHeaders(res, request.headers.get('origin'))
  }
}
