import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { ApiResponse, Forecast } from '@/types'
import { applyCorsHeaders } from '@/lib/cors'

/**
 * Admin-only endpoints for managing forecasts.
 * These bypass RLS using the service role key.
 * Intended for use from the backend management UI.
 */

const adminListSchema = z.object({
  status: z.enum(['open', 'resolved']).optional(),
  category: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
})

/**
 * GET /api/admin/forecasts
 * List ALL forecasts (admin view - no ownership restrictions)
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const parsed = adminListSchema.safeParse({
    status: searchParams.get('status') || undefined,
    category: searchParams.get('category') || undefined,
    limit: searchParams.get('limit') || undefined,
    offset: searchParams.get('offset') || undefined,
    search: searchParams.get('search') || undefined,
  })

  if (!parsed.success) {
    const res = NextResponse.json<ApiResponse<null>>({ error: 'Invalid query parameters' }, { status: 400 })
    return applyCorsHeaders(res, request.headers.get('origin'))
  }

  const { status, category, limit, offset, search } = parsed.data

  try {
    const supabase = await createAdminClient()

    let query = supabase
      .from('forecasts')
      .select(`
        *,
        profiles:user_id (id, username, full_name, avatar_url, accuracy)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      const res = NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 })
      return applyCorsHeaders(res, request.headers.get('origin'))
    }

    const res = NextResponse.json<ApiResponse<{ forecasts: Forecast[]; total: number }>>({
      data: { forecasts: data as Forecast[], total: count || 0 }
    })
    return applyCorsHeaders(res, request.headers.get('origin'))
  } catch (err) {
    const res = NextResponse.json<ApiResponse<null>>({ error: 'Internal server error' }, { status: 500 })
    return applyCorsHeaders(res, request.headers.get('origin'))
  }
}
