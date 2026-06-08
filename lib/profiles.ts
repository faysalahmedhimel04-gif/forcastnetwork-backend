import { createAdminClient } from './supabase/server'

/**
 * Ensures a profile row exists for the given Supabase auth user.
 * Safe to call on every authenticated write or after login.
 * Uses service role so it bypasses RLS.
 *
 * If profile is missing (common after trigger failure, social signup race, or old data),
 * it creates one using:
 *   - username from user_metadata.username (set at email signup) or provider fields
 *   - fallback to email local-part + short unique suffix if needed
 */
export async function ensureProfileForUser(user: {
  id: string
  email?: string | null
  user_metadata?: Record<string, any> | null
}) {
  if (!user?.id) return { created: false, error: 'No user id' }

  const supabase = await createAdminClient()

  // 1. Check if profile already exists
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, username')
    .eq('id', user.id)
    .maybeSingle()

  if (existing) {
    return { created: false, profile: existing }
  }

  // 2. Derive best possible username + name from metadata (works for both email+password and OAuth)
  const meta = user.user_metadata || {}
  let baseUsername =
    meta.username ||
    meta.user_name ||
    meta.preferred_username ||
    meta.name?.toLowerCase?.().replace(/\s+/g, '_') ||
    (user.email ? user.email.split('@')[0] : `user_${user.id.slice(0, 8)}`)

  // Sanitize
  baseUsername = String(baseUsername)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20) || `user_${user.id.slice(0, 8)}`

  const fullName =
    meta.full_name ||
    meta.name ||
    meta.fullName ||
    null

  const avatarUrl =
    meta.avatar_url ||
    meta.picture ||
    meta.avatar ||
    null

  // 3. Try to insert with smart conflict handling for username uniqueness
  let finalUsername = baseUsername
  let attempt = 0
  const maxAttempts = 5

  while (attempt < maxAttempts) {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      username: finalUsername,
      full_name: fullName,
      avatar_url: avatarUrl,
    })

    if (!insertError) {
      return { created: true, username: finalUsername }
    }

    // If username unique violation, append suffix and retry
    if (insertError.code === '23505' || insertError.message?.includes('username')) {
      attempt++
      const suffix = Math.random().toString(36).slice(2, 6)
      finalUsername = `${baseUsername.slice(0, 16)}_${suffix}`
      continue
    }

    // Other error (e.g. FK weirdness) — log and give up
    console.error('[ensureProfileForUser] Insert failed:', insertError)
    return { created: false, error: insertError.message }
  }

  return { created: false, error: 'Could not allocate unique username' }
}
