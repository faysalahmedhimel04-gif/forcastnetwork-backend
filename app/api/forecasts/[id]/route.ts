import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { z } from 'zod'
import type { ApiResponse, Forecast } from '@/types'
import { applyCorsHeaders } from '@/lib/cors'

const resolveSchema = z.object({
  resolved_outcome: z.string().min(1),
})

/**
 * GET /api/forecasts/[id]
 * Get a single forecast with analyst info
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('forecasts')
      .select(`
        *,
        profiles:user_id (id, username, full_name, avatar_url, accuracy)
      `)
      .eq('id', id)
      .single()

    if (error || !data) {
      const res = NextResponse.json<ApiResponse<null>>({ error: 'Forecast not found' }, { status: 404 })
      return applyCorsHeaders(res, request.headers.get('origin'))
    }

    const res = NextResponse.json<ApiResponse<any>>({ data })
    return applyCorsHeaders(res, request.headers.get('origin'))
  } catch (err) {
    const res = NextResponse.json<ApiResponse<null>>({ error: 'Internal server error' }, { status: 500 })
    return applyCorsHeaders(res, request.headers.get('origin'))
  }
}

/**
 * PATCH /api/forecasts/[id]
 * Resolve a forecast (only the owner can resolve)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getAuthenticatedUser(request)

  if (!user) {
    const res = NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized' }, { status: 401 })
    return applyCorsHeaders(res, request.headers.get('origin'))
  }

  try {
    const body = await request.json()
    const parsed = resolveSchema.safeParse(body)

    if (!parsed.success) {
      const res = NextResponse.json<ApiResponse<null>>({ error: 'Invalid resolution data' }, { status: 400 })
      return applyCorsHeaders(res, request.headers.get('origin'))
    }

    const supabase = await createClient()

    // Verify ownership
    const { data: forecast } = await supabase
      .from('forecasts')
      .select('user_id, status, predicted_outcome')
      .eq('id', id)
      .single()

    if (!forecast || forecast.user_id !== user.id) {
      const res = NextResponse.json<ApiResponse<null>>({ error: 'You can only resolve your own forecasts' }, { status: 403 })
      return applyCorsHeaders(res, request.headers.get('origin'))
    }

    if (forecast.status === 'resolved') {
      const res = NextResponse.json<ApiResponse<null>>({ error: 'Forecast is already resolved' }, { status: 400 })
      return applyCorsHeaders(res, request.headers.get('origin'))
    }

    const isCorrect = forecast.predicted_outcome.toLowerCase().trim() ===
                      parsed.data.resolved_outcome.toLowerCase().trim()

    const { data, error } = await supabase
      .from('forecasts')
      .update({
        status: 'resolved',
        resolved_outcome: parsed.data.resolved_outcome,
        is_correct: isCorrect,
        resolved_at: new Date().toISOString(),
        resolved_by: user.id,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      const res = NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 })
      return applyCorsHeaders(res, request.headers.get('origin'))
    }

    const res = NextResponse.json<ApiResponse<Forecast>>({ data: data as Forecast, message: 'Forecast resolved successfully' })
    return applyCorsHeaders(res, request.headers.get('origin'))
  } catch (err) {
    const res = NextResponse.json<ApiResponse<null>>({ error: 'Invalid request' }, { status: 400 })
    return applyCorsHeaders(res, request.headers.get('origin'))
  }
}
