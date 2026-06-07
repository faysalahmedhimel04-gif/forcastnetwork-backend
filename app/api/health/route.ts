import { NextResponse } from 'next/server'
import type { ApiResponse } from '@/types'

/**
 * GET /api/health
 * Simple health check endpoint
 */
export async function GET() {
  return NextResponse.json<ApiResponse<{ status: string; timestamp: string }>>({
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
    },
  })
}
