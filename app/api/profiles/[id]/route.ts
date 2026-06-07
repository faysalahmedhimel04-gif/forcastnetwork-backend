import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { z } from 'zod'
import type { ApiResponse, Profile } from '@/types'

const updateProfileSchema = z.object({
  full_name: z.string().optional(),
  bio: z.string().max(500).optional(),
  expertise_areas: z.array(z.string()).optional(),
  avatar_url: z.string().url().optional(),
})

/**
 * GET /api/profiles/[id]
 * Get public profile
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Profile not found' }, { status: 404 })
    }

    return NextResponse.json<ApiResponse<Profile>>({ data: data as Profile })
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/profiles/[id]
 * Update own profile (requires auth and ownership)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const user = await getAuthenticatedUser(request)

  if (!user || user.id !== id) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized or cannot update other profiles' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const parsed = updateProfileSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Invalid profile data' }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .update(parsed.data)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 })
    }

    return NextResponse.json<ApiResponse<Profile>>({ data: data as Profile, message: 'Profile updated' })
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Invalid request' }, { status: 400 })
  }
}
