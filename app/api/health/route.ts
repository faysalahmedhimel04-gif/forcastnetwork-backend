import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types'
import { applyCorsHeaders } from '@/lib/cors'

/**
 * GET /api/health
 * Simple health check endpoint.
 * Also reports whether critical Supabase env vars are present (safe, no secret values).
 * Useful after Vercel deploy to confirm env configuration without checking logs immediately.
 */
export async function GET(request: NextRequest) {
  const hasUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL
  const hasAnon = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const hasService = !!process.env.SUPABASE_SERVICE_ROLE_KEY

  const res = NextResponse.json<ApiResponse<{
    status: string
    timestamp: string
    supabase: { url: boolean; anonKey: boolean; serviceRole: boolean }
    note?: string
  }>>({
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      supabase: {
        url: hasUrl,
        anonKey: hasAnon,
        serviceRole: hasService,
      },
      ...( (!hasUrl || !hasAnon) && {
        note: 'Supabase env vars are missing or not yet injected. Public endpoints will return empty results until configured in Vercel dashboard and redeployed.'
      })
    },
  })

  return applyCorsHeaders(res, request.headers.get('origin'))
}
