import { createAdminClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { revalidatePath } from 'next/cache'

export const dynamic = 'force-dynamic'

interface ManageForecastsPageProps {
  searchParams: Promise<{ q?: string; status?: string }>
}

async function deleteForecast(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  if (!id) return

  const supabase = await createAdminClient()
  await supabase.from('comments').delete().eq('forecast_id', id)
  await supabase.from('forecasts').delete().eq('id', id)

  revalidatePath('/manage/forecasts')
}

async function forceResolve(formData: FormData) {
  'use server'
  const id = formData.get('id') as string
  if (!id) return

  const supabase = await createAdminClient()

  const { data: forecast } = await supabase
    .from('forecasts')
    .select('predicted_outcome')
    .eq('id', id)
    .single()

  if (forecast) {
    const isCorrect = forecast.predicted_outcome.toLowerCase().trim() === forecast.predicted_outcome.toLowerCase().trim()
    await supabase.from('forecasts').update({
      status: 'resolved',
      resolved_outcome: forecast.predicted_outcome,
      is_correct: isCorrect,
      resolved_at: new Date().toISOString(),
    }).eq('id', id)
  }

  revalidatePath('/manage/forecasts')
}

export default async function ManageForecastsPage({ searchParams }: ManageForecastsPageProps) {
  const params = await searchParams
  const supabase = await createAdminClient()

  let query = supabase
    .from('forecasts')
    .select(`
      *,
      profiles:user_id (id, username, full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (params.q) {
    query = query.ilike('title', `%${params.q}%`)
  }
  if (params.status === 'open' || params.status === 'resolved') {
    query = query.eq('status', params.status)
  }

  const { data: forecasts = [] } = await query

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Manage Forecasts</h1>
            <p className="text-zinc-400 mt-1 text-sm">Admin panel • Uses service role (full DB access)</p>
          </div>
          <Link href="/" className="text-sm text-zinc-400 hover:text-white">← API Docs</Link>
        </div>

        {/* Filters */}
        <form method="GET" className="flex gap-3 mb-6">
          <input 
            type="text" 
            name="q" 
            placeholder="Search title..." 
            defaultValue={params.q} 
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm w-80 focus:outline-none focus:border-zinc-600"
          />
          <select 
            name="status" 
            defaultValue={params.status || ''} 
            className="bg-zinc-900 border border-zinc-800 rounded-lg px-4 py-2 text-sm"
          >
            <option value="">All</option>
            <option value="open">Open</option>
            <option value="resolved">Resolved</option>
          </select>
          <button type="submit" className="bg-white text-black px-5 py-2 rounded-lg text-sm font-medium">Filter</button>
          <Link href="/manage/forecasts" className="px-5 py-2 rounded-lg border border-zinc-700 text-sm">Clear</Link>
        </form>

        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
            <div className="font-medium">Forecasts ({forecasts.length})</div>
            <div className="text-xs text-zinc-500">Service role • Bypasses RLS</div>
          </div>

          {forecasts.length === 0 ? (
            <div className="p-12 text-center text-zinc-400">No forecasts match your filters.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-left text-zinc-400">
                  <th className="px-6 py-3 font-normal">Title</th>
                  <th className="px-6 py-3 font-normal">Analyst</th>
                  <th className="px-6 py-3 font-normal">Category / Status</th>
                  <th className="px-6 py-3 font-normal">Target Date</th>
                  <th className="px-6 py-3 font-normal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800">
                {forecasts.map((f: any) => (
                  <tr key={f.id} className="hover:bg-zinc-800/50">
                    <td className="px-6 py-4">
                      <div className="font-medium pr-4">{f.title}</div>
                      <div className="text-[10px] text-zinc-500 mt-0.5">→ {f.predicted_outcome}</div>
                    </td>
                    <td className="px-6 py-4 text-zinc-400">@{f.profiles?.username || 'unknown'}</td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2 py-0.5 rounded bg-zinc-800 text-xs mr-2">{f.category}</span>
                      {f.status === 'resolved' ? (
                        <span className={f.is_correct ? "text-emerald-400" : "text-red-400"}>
                          {f.is_correct ? "Correct" : "Incorrect"}
                        </span>
                      ) : (
                        <span className="text-blue-400">Open</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-zinc-400 text-xs">
                      {new Date(f.target_date).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <form action={deleteForecast} className="inline">
                        <input type="hidden" name="id" value={f.id} />
                        <button 
                          type="submit" 
                          className="text-red-400 hover:text-red-300 text-xs px-3 py-1 rounded border border-red-900 hover:border-red-700"
                          onClick={e => { if (!confirm('Permanently delete this forecast?')) e.preventDefault() }}
                        >
                          Delete
                        </button>
                      </form>

                      {f.status === 'open' && (
                        <form action={forceResolve} className="inline">
                          <input type="hidden" name="id" value={f.id} />
                          <button type="submit" className="text-emerald-400 hover:text-emerald-300 text-xs px-3 py-1 rounded border border-emerald-900 hover:border-emerald-700">
                            Force Resolve
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="mt-4 text-[10px] text-zinc-500">
          All actions here run with full admin privileges. Changes are permanent.
        </div>
      </div>
    </div>
  )
}
