import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { ApiResponse, LeaderboardEntry } from '@/types'
import { applyCorsHeaders } from '@/lib/cors'

/**
 * GET /api/leaderboard
 * Returns the accuracy leaderboard
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)

  try {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('profiles')
      .select('id, username, full_name, avatar_url, accuracy, total_forecasts, correct_forecasts, follower_count, expertise_areas')
      .gte('total_forecasts', 1)
      .order('accuracy', { ascending: false })
      .order('total_forecasts', { ascending: false })
      .limit(limit)

    if (error) {
      const res = NextResponse.json<ApiResponse<null>>({ error: error.message }, { status: 500 })
      return applyCorsHeaders(res, request.headers.get('origin'))
    }

    const res = NextResponse.json<ApiResponse<LeaderboardEntry[]>>({ data: data as LeaderboardEntry[] })
    return applyCorsHeaders(res, request.headers.get('origin'))
  } catch (err) {
    const res = NextResponse.json<ApiResponse<null>>({ error: 'Internal server error' }, { status: 500 })
    return applyCorsHeaders(res, request.headers.get('origin'))
  }
}
