import { NextResponse } from 'next/server'

/**
 * Returns the allowed origin for CORS based on environment configuration.
 * Falls back to the production frontend URL.
 */
export function getAllowedOrigin(requestOrigin: string | null): string {
  const configured =
    process.env.NEXT_PUBLIC_FRONTEND_URL ||
    process.env.FRONTEND_URL ||
    'https://forcastnetwork.vercel.app'

  if (!requestOrigin) {
    return configured
  }

  // Exact match for configured frontend
  if (requestOrigin === configured) {
    return requestOrigin
  }

  // Local development
  if (requestOrigin.startsWith('http://localhost') || requestOrigin.startsWith('http://127.0.0.1')) {
    return requestOrigin
  }

  // Allow any Vercel preview / deployment (both frontend and backend previews)
  if (requestOrigin.endsWith('.vercel.app')) {
    return requestOrigin
  }

  // Default to the configured production frontend
  return configured
}

/**
 * Applies standard CORS headers to a NextResponse.
 * Use this for all API route responses when the backend is deployed separately from the frontend.
 */
export function applyCorsHeaders(
  response: NextResponse,
  requestOrigin: string | null
): NextResponse {
  const origin = getAllowedOrigin(requestOrigin)

  response.headers.set('Access-Control-Allow-Origin', origin)
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  // Uncomment only if you need to send cookies/credentials cross-origin in the future
  // response.headers.set('Access-Control-Allow-Credentials', 'true');

  return response
}

/**
 * Convenience wrapper for JSON responses that automatically includes CORS headers.
 */
export function corsJson<T>(
  body: T,
  init: ResponseInit | undefined,
  requestOrigin: string | null
) {
  const response = NextResponse.json(body, init)
  return applyCorsHeaders(response, requestOrigin)
}
