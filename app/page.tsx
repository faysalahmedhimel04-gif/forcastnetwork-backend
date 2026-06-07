import Link from 'next/link'

type Method = 'GET' | 'POST' | 'PATCH' | 'DELETE'

interface EndpointDoc {
  methods: Method[]
  path: string
  description: string
  auth: boolean
  queryParams?: Array<{ name: string; type: string; required?: boolean; description: string }>
  body?: { description: string; example: string; schema?: string }
  responses: { success: string; errors: string[] }
}

const endpoints: EndpointDoc[] = [
  {
    methods: ['GET'],
    path: '/api/health',
    description: 'Health check + Supabase configuration status. Useful for verifying environment variables after deployment.',
    auth: false,
    responses: {
      success: '{ "data": { "status": "healthy", "timestamp": "...", "supabase": { "url": true, "anonKey": true, "serviceRole": true } } }',
      errors: []
    }
  },
  {
    methods: ['GET'],
    path: '/api/forecasts',
    description: 'List forecasts with optional filters. Returns most recent first.',
    auth: false,
    queryParams: [
      { name: 'status', type: 'string', description: 'open | resolved' },
      { name: 'category', type: 'string', description: 'Politics, Technology, Economy, etc.' },
      { name: 'source', type: 'string', description: 'polymarket | manual' },
      { name: 'limit', type: 'number', description: 'Max 100, default 20' },
      { name: 'offset', type: 'number', description: 'For pagination, default 0' },
    ],
    responses: {
      success: '{ "data": Forecast[] }',
      errors: ['500 Internal server error']
    }
  },
  {
    methods: ['POST'],
    path: '/api/forecasts',
    description: 'Create a new forecast. The creator becomes the owner.',
    auth: true,
    body: {
      description: 'Forecast creation payload',
      example: `{
  "title": "Will Trump win the 2028 election?",
  "description": "Detailed reasoning and sources...",
  "category": "Politics",
  "target_date": "2028-11-07",
  "predicted_outcome": "Yes",
  "initial_confidence": 62,
  "external_source": "polymarket",
  "external_slug": "will-trump-win-2028",
  "external_market_price": 0.47
}`,
      schema: 'title (10-200), description (min 20), category, target_date (future), predicted_outcome (1-120), initial_confidence (1-100), optional external_* fields'
    },
    responses: {
      success: '{ "data": Forecast, "status": 201 }',
      errors: ['400 Validation error', '401 Unauthorized', '500 Server error']
    }
  },
  {
    methods: ['GET'],
    path: '/api/forecasts/[id]',
    description: 'Get a single forecast by ID, including the analyst profile and accuracy.',
    auth: false,
    responses: {
      success: '{ "data": Forecast & { profiles: Profile } }',
      errors: ['404 Forecast not found']
    }
  },
  {
    methods: ['PATCH'],
    path: '/api/forecasts/[id]',
    description: 'Resolve a forecast. Only the original creator can resolve it. Automatically calculates is_correct.',
    auth: true,
    body: {
      description: 'Resolution payload',
      example: `{
  "resolved_outcome": "Yes"
}`
    },
    responses: {
      success: '{ "data": Forecast, "message": "Forecast resolved successfully" }',
      errors: ['400 Already resolved / Invalid data', '401 Unauthorized', '403 Not owner']
    }
  },
  {
    methods: ['GET'],
    path: '/api/comments',
    description: 'List comments for a specific forecast.',
    auth: false,
    queryParams: [
      { name: 'forecast_id', type: 'uuid', required: true, description: 'ID of the forecast' },
    ],
    responses: {
      success: '{ "data": Comment[] } (includes author profile)',
      errors: ['400 forecast_id is required']
    }
  },
  {
    methods: ['POST'],
    path: '/api/comments',
    description: 'Post a comment on a forecast.',
    auth: true,
    body: {
      description: 'Comment payload',
      example: `{
  "forecast_id": "uuid-here",
  "content": "Great analysis! I think the outcome will be..."
}`
    },
    responses: {
      success: '{ "data": Comment, "message": "Comment added", "status": 201 }',
      errors: ['400 Invalid data', '401 Unauthorized']
    }
  },
  {
    methods: ['POST'],
    path: '/api/follows',
    description: 'Follow another user (analyst). Cannot follow yourself.',
    auth: true,
    body: {
      description: 'Follow payload',
      example: `{
  "following_id": "user-uuid-to-follow"
}`
    },
    responses: {
      success: '{ "data": Follow, "message": "Successfully followed", "status": 201 }',
      errors: ['400 Invalid / self-follow', '401 Unauthorized', '409 Already following']
    }
  },
  {
    methods: ['DELETE'],
    path: '/api/follows',
    description: 'Unfollow a user.',
    auth: true,
    queryParams: [
      { name: 'following_id', type: 'uuid', required: true, description: 'User to unfollow' },
    ],
    responses: {
      success: '{ "message": "Successfully unfollowed" }',
      errors: ['400 following_id required', '401 Unauthorized']
    }
  },
  {
    methods: ['GET'],
    path: '/api/profiles/[id]',
    description: 'Get public profile information for a user.',
    auth: false,
    responses: {
      success: '{ "data": Profile }',
      errors: ['404 Profile not found']
    }
  },
  {
    methods: ['PATCH'],
    path: '/api/profiles/[id]',
    description: 'Update your own profile. You can only update your own profile.',
    auth: true,
    body: {
      description: 'Profile update (all fields optional)',
      example: `{
  "full_name": "Jane Analyst",
  "bio": "Forecasting politics and tech since 2022.",
  "expertise_areas": ["Politics", "Technology"],
  "avatar_url": "https://..."
}`
    },
    responses: {
      success: '{ "data": Profile, "message": "Profile updated" }',
      errors: ['400 Invalid data', '403 Cannot update other profiles']
    }
  },
  {
    methods: ['GET'],
    path: '/api/leaderboard',
    description: 'Accuracy leaderboard. Only users with at least 1 forecast are included.',
    auth: false,
    queryParams: [
      { name: 'limit', type: 'number', description: 'Max 100, default 50' },
    ],
    responses: {
      success: '{ "data": LeaderboardEntry[] } (sorted by accuracy desc, then volume)',
      errors: ['500 Server error']
    }
  },
  {
    methods: ['GET'],
    path: '/api/markets',
    description: 'Read-only proxy to Polymarket Gamma API. Returns current market data for reference when creating linked forecasts.',
    auth: false,
    queryParams: [
      { name: 'limit', type: 'number', description: 'default 30' },
      { name: 'active', type: 'boolean', description: 'true | false' },
      { name: 'closed', type: 'boolean', description: 'true | false' },
      { name: 'q or search', type: 'string', description: 'Search term' },
    ],
    responses: {
      success: '{ "source": "polymarket", "count": number, "markets": any[] }',
      errors: ['502 Failed to fetch from Polymarket', '500 Server error']
    }
  }
]

function MethodBadge({ method }: { method: Method }) {
  const colors: Record<Method, string> = {
    GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    PATCH: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  }
  return (
    <span className={`inline-block px-2.5 py-0.5 text-xs font-mono font-semibold rounded border ${colors[method]}`}>
      {method}
    </span>
  )
}

export default function ApiDocs() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="border-b border-white/10 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
              <span className="text-zinc-950 font-bold text-xl">F</span>
            </div>
            <div>
              <div className="font-semibold text-xl tracking-tight">ForcastNetwork</div>
              <div className="text-[10px] text-zinc-500 -mt-1">BACKEND API</div>
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <a href="https://github.com/faysalahmedhimel04-gif/forcastnetwork-backend" target="_blank" className="text-zinc-400 hover:text-white transition">GitHub</a>
            <Link href="/api/health" className="px-4 py-1.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition">
              Test /api/health
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 pt-10 pb-24">
        {/* Hero */}
        <div className="mb-12">
          <div className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs mb-4">
            Next.js 16 + Supabase • Edge-ready
          </div>
          <h1 className="text-5xl font-semibold tracking-tighter mb-3">ForcastNetwork Backend API</h1>
          <p className="max-w-2xl text-xl text-zinc-400">
            Production REST API for the Forecast Creator Network. All data operations go through this service.
          </p>
        </div>

        {/* Auth + Base Info */}
        <div className="grid md:grid-cols-2 gap-4 mb-12">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
            <div className="font-semibold mb-3 flex items-center gap-2">
              Authentication
            </div>
            <p className="text-sm text-zinc-400 mb-3">
              Most write operations require a valid Supabase JWT.
            </p>
            <div className="font-mono text-xs bg-black/50 p-3 rounded-lg border border-white/10">
              Authorization: Bearer &lt;supabase_access_token&gt;
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              Get the token from the frontend after <code>supabase.auth.signInWithPassword</code> or magic link.
            </p>
          </div>

          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6">
            <div className="font-semibold mb-3">Base URL</div>
            <div className="font-mono text-sm bg-black/60 px-4 py-3 rounded-xl border border-white/10 break-all">
              https://your-backend.vercel.app
            </div>
            <p className="mt-3 text-xs text-zinc-500">
              All responses are wrapped in <code className="text-zinc-400">{"{ data?, error?, message? }"}</code> (see <code>ApiResponse&lt;T&gt;</code>).
            </p>
          </div>
        </div>

        {/* Endpoints */}
        <div className="mb-6 flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Endpoints</h2>
            <p className="text-sm text-zinc-400">Click any method + path to jump to details.</p>
          </div>
          <div className="text-xs text-zinc-500 hidden md:block">All dates are ISO strings. IDs are UUIDs.</div>
        </div>

        <div className="space-y-4">
          {endpoints.map((ep, index) => (
            <div key={index} id={ep.path.replace(/\[|\]/g, '').replace(/\//g, '-')} 
                 className="group rounded-2xl border border-white/10 bg-zinc-900/70 hover:border-white/20 transition overflow-hidden">
              
              {/* Header */}
              <div className="flex flex-wrap items-center gap-3 border-b border-white/10 px-5 py-3.5 bg-black/30">
                <div className="flex items-center gap-1.5">
                  {ep.methods.map((m, i) => <MethodBadge key={i} method={m} />)}
                </div>
                <div className="font-mono text-lg font-medium tracking-tight text-white/95">
                  {ep.path}
                </div>
                {ep.auth && (
                  <span className="ml-auto text-[10px] uppercase tracking-widest border border-amber-400/30 text-amber-400 px-2 py-px rounded">
                    Requires Auth
                  </span>
                )}
                {!ep.auth && (
                  <span className="ml-auto text-[10px] uppercase tracking-widest border border-emerald-400/30 text-emerald-400 px-2 py-px rounded">
                    Public
                  </span>
                )}
              </div>

              <div className="p-5 space-y-5">
                <p className="text-zinc-300 leading-relaxed">{ep.description}</p>

                {/* Query Params */}
                {ep.queryParams && ep.queryParams.length > 0 && (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-medium">Query Parameters</div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/10 text-left text-xs text-zinc-500">
                            <th className="py-1.5 pr-4 font-normal">Name</th>
                            <th className="py-1.5 pr-4 font-normal">Type</th>
                            <th className="py-1.5 pr-4 font-normal">Required</th>
                            <th className="py-1.5 font-normal">Description</th>
                          </tr>
                        </thead>
                        <tbody className="text-zinc-300 font-mono text-xs">
                          {ep.queryParams.map((q, i) => (
                            <tr key={i} className="border-b border-white/5 last:border-none">
                              <td className="py-1.5 pr-4 text-emerald-400">{q.name}</td>
                              <td className="py-1.5 pr-4 text-zinc-400">{q.type}</td>
                              <td className="py-1.5 pr-4">{q.required ? 'yes' : 'no'}</td>
                              <td className="py-1.5 text-zinc-400 normal-case font-sans">{q.description}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Request Body */}
                {ep.body && (
                  <div>
                    <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-medium">Request Body</div>
                    <div className="text-xs text-zinc-400 mb-1.5">{ep.body.description}</div>
                    {ep.body.schema && (
                      <div className="text-[11px] text-zinc-500 mb-2">{ep.body.schema}</div>
                    )}
                    <pre className="bg-black/70 border border-white/10 text-emerald-300 p-3.5 rounded-xl text-xs overflow-x-auto font-mono">
                      {ep.body.example}
                    </pre>
                  </div>
                )}

                {/* Responses */}
                <div>
                  <div className="text-xs uppercase tracking-widest text-zinc-500 mb-2 font-medium">Responses</div>
                  <div className="grid gap-2 text-xs">
                    <div>
                      <span className="text-emerald-400 font-medium">200 / 201</span>
                      <pre className="mt-1 bg-black/70 border border-white/10 p-3 rounded-xl text-emerald-300/90 whitespace-pre-wrap font-mono text-[11px]">{ep.responses.success}</pre>
                    </div>
                    {ep.responses.errors.length > 0 && (
                      <div>
                        <span className="text-red-400 font-medium">Errors</span>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          {ep.responses.errors.map((err, i) => (
                            <span key={i} className="bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded text-[10px]">
                              {err}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Footer notes */}
        <div className="mt-14 grid md:grid-cols-2 gap-4 text-xs text-zinc-400">
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5">
            <div className="font-medium text-white mb-1.5">Common Response Wrapper</div>
            All endpoints return <code className="text-zinc-300">ApiResponse&lt;T&gt;</code>:<br />
            <span className="font-mono text-[11px] mt-1 block text-zinc-500">
              {`{ data?: T, error?: string, message?: string }`}
            </span>
          </div>
          <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-5">
            This backend is the single source of truth for forecasts, comments, follows, profiles and leaderboard.
            The frontend never talks directly to Supabase for writes.
          </div>
        </div>

        <p className="mt-10 text-center text-xs text-zinc-500">
          Built for the Forecast Creator Network • Separate deployable service
        </p>
      </div>
    </div>
  )
}
