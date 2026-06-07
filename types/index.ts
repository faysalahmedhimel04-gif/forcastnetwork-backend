// Shared types for the Forecast Creator Network Backend

export type Profile = {
  id: string
  username: string
  full_name: string | null
  bio: string | null
  avatar_url: string | null
  expertise_areas: string[]
  total_forecasts: number
  correct_forecasts: number
  accuracy: number
  follower_count: number
  created_at: string
  updated_at: string
}

export type Forecast = {
  id: string
  user_id: string
  title: string
  description: string
  category: string
  target_date: string
  predicted_outcome: string
  initial_confidence: number
  status: 'open' | 'resolved'
  resolved_outcome: string | null
  is_correct: boolean | null
  resolved_at: string | null
  resolved_by: string | null
  comment_count: number
  created_at: string
  updated_at: string
  // External linking (e.g. Polymarket for reference)
  external_source?: string | null
  external_id?: string | null
  external_slug?: string | null
  external_market_price?: number | null
  external_url?: string | null
}

export type Comment = {
  id: string
  forecast_id: string
  user_id: string
  content: string
  created_at: string
}

export type Follow = {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export type LeaderboardEntry = {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  accuracy: number
  total_forecasts: number
  correct_forecasts: number
  follower_count: number
  expertise_areas: string[]
}

export type ApiResponse<T> = {
  data?: T
  error?: string
  message?: string
}

export const FORECAST_CATEGORIES = [
  'Politics',
  'Technology',
  'Economy',
  'Science',
  'Sports',
  'Entertainment',
  'Business',
  'Weather',
  'Geopolitics',
  'Other',
] as const

export type ForecastCategory = (typeof FORECAST_CATEGORIES)[number]
