import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { ensureProfileForUser } from '@/lib/profiles'
import { z } from 'zod'
import type { ApiResponse } from '@/types'

const followSchema = z.object({
  following_id: z.string().uuid(),
})

/**
 * POST /api/follows
 * Follow an analyst
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized' }, { status: 401 })
  }

  // Ensure the caller has a profile row (required by FKs on follows and forecasts)
  await ensureProfileForUser({
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata,
  })

  try {
    const body = await request.json()
    const parsed = followSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Invalid data' }, { status: 400 })
    }

    if (parsed.data.following_id === user.id) {
      return NextResponse.json<ApiResponse<null>>({ error: 'You cannot follow yourself' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('follows')
      .insert({
        follower_id: user.id,
        following_id: parsed.data.following_id,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json<ApiResponse<null>>({ error: 'Already following this analyst' }, { status: 409 })
      }
      return NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 })
    }

    return NextResponse.json<ApiResponse<any>>({ data, message: 'Successfully followed' }, { status: 201 })
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Invalid request' }, { status: 400 })
  }
}

/**
 * DELETE /api/follows?following_id=xxx
 * Unfollow an analyst
 */
export async function DELETE(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const followingId = searchParams.get('following_id')

  if (!followingId) {
    return NextResponse.json<ApiResponse<null>>({ error: 'following_id is required' }, { status: 400 })
  }

  try {
    const supabase = await createClient()

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', followingId)

    if (error) {
      return NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 })
    }

    return NextResponse.json<ApiResponse<null>>({ message: 'Successfully unfollowed' })
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Internal server error' }, { status: 500 })
  }
}
