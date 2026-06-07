import { NextRequest, NextResponse } from 'next/server'
import type { ApiResponse } from '@/types'

/**
 * GET /api/markets
 * Proxy to Polymarket Gamma API (read-only reference data)
 * This allows the frontend to fetch market data without CORS issues
 * and keeps the integration consistent.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const limit = searchParams.get('limit') || '30'
  const active = searchParams.get('active') || 'true'
  const closed = searchParams.get('closed') || 'false'
  const q = searchParams.get('q') || searchParams.get('search')

  try {
    const params = new URLSearchParams({
      limit,
      active,
      closed,
      order: 'volume',
      ascending: 'false',
    })

    if (q) {
      params.set('search', q)
    }

    const gammaUrl = `https://gamma-api.polymarket.com/markets?${params.toString()}`

    const response = await fetch(gammaUrl, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 60 }, // Cache for 1 minute
    })

    if (!response.ok) {
      return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch from Polymarket' }, { status: 502 })
    }

    const data = await response.json()

    return NextResponse.json({
      source: 'polymarket',
      count: Array.isArray(data) ? data.length : 0,
      markets: data,
    })
  } catch (err) {
    console.error('Polymarket proxy error:', err)
    return NextResponse.json<ApiResponse<null>>({ error: 'Failed to fetch market data' }, { status: 500 })
  }
}
