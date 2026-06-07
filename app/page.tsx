import Link from 'next/link'

export default function BackendHome() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-4">ForcastNetwork Backend API</h1>
        <p className="text-zinc-400 mb-8">
          Production-ready backend for the Forecast Creator Network. 
          Built with Next.js 15 App Router + Supabase.
        </p>

        <div className="grid gap-6">
          <div className="bg-zinc-900 p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-3">Available Endpoints</h2>
            <ul className="space-y-2 text-sm font-mono">
              <li><span className="text-emerald-400">GET</span> /api/health</li>
              <li><span className="text-emerald-400">GET/POST</span> /api/forecasts</li>
              <li><span className="text-emerald-400">GET/PATCH</span> /api/forecasts/[id]</li>
              <li><span className="text-emerald-400">GET/POST</span> /api/comments</li>
              <li><span className="text-emerald-400">POST/DELETE</span> /api/follows</li>
              <li><span className="text-emerald-400">GET/PATCH</span> /api/profiles/[id]</li>
              <li><span className="text-emerald-400">GET</span> /api/leaderboard</li>
              <li><span className="text-emerald-400">GET</span> /api/markets (Polymarket proxy)</li>
            </ul>
          </div>

          <div className="bg-zinc-900 p-6 rounded-xl">
            <h2 className="text-xl font-semibold mb-3">Authentication</h2>
            <p className="text-sm text-zinc-400">
              Protected routes require a Supabase access token in the <code>Authorization: Bearer &lt;token&gt;</code> header.
              Obtain the token from the frontend after user login via Supabase client.
            </p>
          </div>

          <div>
            <Link 
              href="/api/health" 
              className="inline-block bg-white text-black px-4 py-2 rounded-lg text-sm font-medium hover:bg-zinc-200 transition"
            >
              Test Health Endpoint
            </Link>
          </div>
        </div>

        <p className="mt-12 text-xs text-zinc-500">
          This is the dedicated backend service. The frontend (in the sibling forcastnetwork folder) 
          can call these endpoints instead of talking directly to Supabase for added abstraction and control.
        </p>
      </div>
    </div>
  )
}
