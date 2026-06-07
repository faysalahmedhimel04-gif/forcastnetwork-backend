import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types'
import { createAdminClient } from '@/lib/supabase/server'
import { applyCorsHeaders } from '@/lib/cors'

/**
 * POST /api/auth/confirm
 * Auto-confirms a user's email using the service role (for development only).
 * This bypasses Supabase's email confirmation requirement so new users can sign in immediately.
 * 
 * In production, you should disable this or secure it properly, and enable email confirmation
 * in your Supabase project settings.
 */
export async function POST(request: NextRequest) {
  try {
    const { user_id } = await request.json()

    if (!user_id) {
      return applyCorsHeaders(
        NextResponse.json<ApiResponse<null>>({ error: 'user_id is required' }, { status: 400 }),
        request.headers.get('origin')
      )
    }

    const supabase = await createAdminClient()

    // Use admin API to confirm the email (sets email_confirmed_at)
    const { error } = await supabase.auth.admin.updateUserById(user_id, {
      email_confirm: true,
    })

    if (error) {
      console.error('[Auth Confirm] Failed to confirm user:', error)
      return applyCorsHeaders(
        NextResponse.json<ApiResponse<null>>({ error: 'Failed to confirm email' }, { status: 500 }),
        request.headers.get('origin')
      )
    }

    return applyCorsHeaders(
      NextResponse.json<ApiResponse<{ confirmed: boolean }>>({ data: { confirmed: true } }),
      request.headers.get('origin')
    )
  } catch (err: any) {
    console.error('[Auth Confirm] Error:', err)
    return applyCorsHeaders(
      NextResponse.json<ApiResponse<null>>({ error: 'Invalid request' }, { status: 400 }),
      request.headers.get('origin')
    )
  }
}
