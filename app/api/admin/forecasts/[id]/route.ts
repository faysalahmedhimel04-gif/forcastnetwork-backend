import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { ApiResponse, Forecast } from '@/types'
import { applyCorsHeaders } from '@/lib/cors'

const adminUpdateSchema = z.object({
  title: z.string().min(10).max(200).optional(),
  description: z.string().min(20).optional(),
  category: z.string().min(2).optional(),
  target_date: z.string().optional(),
  predicted_outcome: z.string().min(1).max(120).optional(),
  initial_confidence: z.number().min(1).max(100).optional(),
  status: z.enum(['open', 'resolved']).optional(),
  resolved_outcome: z.string().optional(),
  is_correct: z.boolean().optional(),
  external_source: z.string().optional().nullable(),
  external_id: z.string().optional().nullable(),
  external_slug: z.string().optional().nullable(),
  external_market_price: z.number().optional().nullable(),
  external_url: z.string().optional().nullable(),
})

/**
 * GET /api/admin/forecasts/[id]
 * Get any forecast with full details (admin)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    const supabase = await createAdminClient()

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
 * PATCH /api/admin/forecasts/[id]
 * Admin update - can change almost anything, including force-resolve
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    let body: any
    const contentType = request.headers.get('content-type') || ''

    if (contentType.includes('application/json')) {
      body = await request.json()
    } else {
      // Handle form submissions from management UI
      const formData = await request.formData()
      body = Object.fromEntries(formData.entries())

      // Handle _method override
      if (body._method === 'PATCH') delete body._method
    }

    const parsed = adminUpdateSchema.safeParse(body)

    if (!parsed.success) {
      const res = NextResponse.json<ApiResponse<null>>(
        { error: 'Invalid update data: ' + parsed.error.issues[0]?.message },
        { status: 400 }
      )
      return applyCorsHeaders(res, request.headers.get('origin'))
    }

    const supabase = await createAdminClient()

    // If resolving, set resolved fields
    const updateData: any = { ...parsed.data }

    if (parsed.data.status === 'resolved' && parsed.data.resolved_outcome) {
      // Try to get the original predicted_outcome if not provided
      const { data: current } = await supabase
        .from('forecasts')
        .select('predicted_outcome')
        .eq('id', id)
        .single()

      if (current) {
        updateData.is_correct = current.predicted_outcome.toLowerCase().trim() ===
          parsed.data.resolved_outcome.toLowerCase().trim()
      }
      updateData.resolved_at = new Date().toISOString()
      // resolved_by can be left null for admin actions or set to a system user
    }

    const { data, error } = await supabase
      .from('forecasts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      const res = NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 })
      return applyCorsHeaders(res, request.headers.get('origin'))
    }

    const res = NextResponse.json<ApiResponse<Forecast>>({ 
      data: data as Forecast, 
      message: 'Forecast updated by admin' 
    })
    return applyCorsHeaders(res, request.headers.get('origin'))
  } catch (err) {
    const res = NextResponse.json<ApiResponse<null>>({ error: 'Invalid request' }, { status: 400 })
    return applyCorsHeaders(res, request.headers.get('origin'))
  }
}

/**
 * DELETE /api/admin/forecasts/[id]
 * Hard delete a forecast (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  try {
    // Support form-based delete from management UI (_method=DELETE)
    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('application/json')) {
      const formData = await request.formData()
      if (formData.get('_method') !== 'DELETE') {
        // ignore
      }
    }

    const supabase = await createAdminClient()

    // Delete related comments first
    await supabase.from('comments').delete().eq('forecast_id', id)

    const { error } = await supabase
      .from('forecasts')
      .delete()
      .eq('id', id)

    if (error) {
      const res = NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 })
      return applyCorsHeaders(res, request.headers.get('origin'))
    }

    const res = NextResponse.json<ApiResponse<{ deleted: boolean }>>({ 
      data: { deleted: true },
      message: 'Forecast permanently deleted by admin' 
    })
    return applyCorsHeaders(res, request.headers.get('origin'))
  } catch (err) {
    const res = NextResponse.json<ApiResponse<null>>({ error: 'Internal server error' }, { status: 500 })
    return applyCorsHeaders(res, request.headers.get('origin'))
  }
}
