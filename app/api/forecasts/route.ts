import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { z } from 'zod'
import type { ApiResponse, Forecast } from '@/types'
import { applyCorsHeaders } from '@/lib/cors'

// Validation schemas
const createForecastSchema = z.object({
  title: z.string().min(10).max(200),
  description: z.string().min(20),
  category: z.string().min(2),
  target_date: z.string().refine((d) => new Date(d) > new Date(), {
    message: 'Target date must be in the future',
  }),
  predicted_outcome: z.string().min(1).max(120),
  initial_confidence: z.number().min(1).max(100),
  external_source: z.string().optional(),
  external_id: z.string().optional(),
  external_slug: z.string().optional(),
  external_market_price: z.number().optional(),
  external_url: z.string().optional(),
})

/**
 * GET /api/forecasts
 * List forecasts with optional filters
 * Query params: status, category, source, limit, offset
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const source = searchParams.get('source')
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100)
  const offset = parseInt(searchParams.get('offset') || '0')

  try {
    const supabase = await createClient()

    let query = supabase
      .from('forecasts')
      .select(`
        *,
        profiles:user_id (id, username, full_name, avatar_url)
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (status === 'open' || status === 'resolved') {
      query = query.eq('status', status)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (source === 'polymarket') {
      query = query.eq('external_source', 'polymarket')
    } else if (source === 'manual') {
      query = query.is('external_source', null)
    }

    const { data, error } = await query

    if (error) {
      const res = NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 })
      return applyCorsHeaders(res, request.headers.get('origin'))
    }

    const res = NextResponse.json<ApiResponse<Forecast[]>>({ data: data as Forecast[] })
    return applyCorsHeaders(res, request.headers.get('origin'))
  } catch (err) {
    return NextResponse.json<ApiResponse<null>>({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/forecasts
 * Create a new forecast (requires authentication)
 */
export async function POST(request: NextRequest) {
  const user = await getAuthenticatedUser(request)
  if (!user) {
    const res = NextResponse.json<ApiResponse<null>>({ error: 'Unauthorized' }, { status: 401 })
    return applyCorsHeaders(res, request.headers.get('origin'))
  }

  try {
    const body = await request.json()
    const parsed = createForecastSchema.safeParse(body)

    if (!parsed.success) {
      const res = NextResponse.json<ApiResponse<null>>(
        { error: parsed.error.issues[0]?.message || 'Invalid data' },
        { status: 400 }
      )
      return applyCorsHeaders(res, request.headers.get('origin'))
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from('forecasts')
      .insert({
        user_id: user.id,
        ...parsed.data,
      })
      .select()
      .single()

    if (error) {
      const res = NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 })
      return applyCorsHeaders(res, request.headers.get('origin'))
    }

    const res = NextResponse.json<ApiResponse<Forecast>>({ data: data as Forecast }, { status: 201 })
    return applyCorsHeaders(res, request.headers.get('origin'))
  } catch (err) {
    const res = NextResponse.json<ApiResponse<null>>({ error: 'Invalid request body' }, { status: 400 })
    return applyCorsHeaders(res, request.headers.get('origin'))
  }
}
