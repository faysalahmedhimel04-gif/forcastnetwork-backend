import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { ensureProfileForUser } from '@/lib/profiles'
import { z } from 'zod'
import type { ApiResponse } from '@/types'

const createCommentSchema = z.object({
  forecast_id: z.string().uuid(),
  content: z.string().min(1).max(2000),
})

/**
 * GET /api/comments?forecast_id=xxx
 * List comments for a forecast
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const forecastId = searchParams.get('forecast_id')

  if (!forecastId) {
    return NextResponse.json<ApiResponse<null>>({ error: 'forecast_id is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:user_id (id, username, full_name, avatar_url)
      `)
      .eq('forecast_id', forecastId)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 })
    }

    return NextResponse.json<ApiResponse<any[]>>({ data })
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/comments
 * Create a comment (requires auth)
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized' }, { status: 401 })
  }

  // Ensure profile exists before inserting comment (FK constraint on user_id -> profiles)
  await ensureProfileForUser({
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata,
  })

  try {
    const body = await request.json()
    const parsed = createCommentSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Invalid comment data' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('comments')
      .insert({
        forecast_id: parsed.data.forecast_id,
        user_id: user.id,
        content: parsed.data.content,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 })
    }

    return NextResponse.json<ApiResponse<any>>({ data, message: 'Comment added' }, { status: 201 })
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Invalid request' }, { status: 400 })
  }
}
