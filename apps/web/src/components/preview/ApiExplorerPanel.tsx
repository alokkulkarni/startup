'use client'

import { useEffect, useCallback, useRef, useState } from 'react'

interface OpenApiInfo {
  title: string
  version: string
  description?: string
}

interface OpenApiPathItem {
  tags?: string[]
  summary?: string
  description?: string
  parameters?: { name: string; in: string; required?: boolean; description?: string; schema?: { type: string; example?: unknown } }[]
  requestBody?: { required?: boolean; content?: { 'application/json'?: { schema?: unknown } } }
  responses?: Record<string, { description: string }>
}

interface OpenApiSpec {
  info: OpenApiInfo
  paths: Record<string, Record<string, OpenApiPathItem>>
  servers?: { url: string }[]
}

interface RouteEntry {
  method: string
  path: string
  summary?: string
  tags?: string[]
  parameters?: OpenApiPathItem['parameters']
  requestBody?: OpenApiPathItem['requestBody']
}

type RequestState = 'idle' | 'loading' | 'success' | 'error'

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-600/20 text-emerald-300 border border-emerald-600/40',
  POST: 'bg-blue-600/20 text-blue-300 border border-blue-600/40',
  PUT: 'bg-amber-600/20 text-amber-300 border border-amber-600/40',
  PATCH: 'bg-orange-600/20 text-orange-300 border border-orange-600/40',
  DELETE: 'bg-red-600/20 text-red-300 border border-red-600/40',
}

const STATUS_COLORS: Record<number, string> = {
  2: 'text-emerald-400',
  3: 'text-blue-400',
  4: 'text-amber-400',
  5: 'text-red-400',
}

function statusColor(code: number) {
  return STATUS_COLORS[Math.floor(code / 100)] ?? 'text-gray-400'
}

function formatDuration(ms: number) {
  return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`
}

function jsonHighlight(json: string) {
  return json
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {
      let cls = 'text-yellow-300'
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'text-sky-300' : 'text-green-300'
      } else if (/true|false/.test(match)) {
        cls = 'text-purple-300'
      } else if (/null/.test(match)) {
        cls = 'text-gray-500'
      } else {
        cls = 'text-orange-300'
      }
      return `<span class="${cls}">${match}</span>`
    })
}

// Build a contextual example value from a JSON Schema node
function schemaToExample(schema: unknown, propName?: string): unknown {
  if (!schema || typeof schema !== 'object') return null
  const s = schema as Record<string, unknown>

  if ('example' in s) return s.example
  if ('default' in s) return s.default
  if ('enum' in s && Array.isArray(s.enum) && s.enum.length > 0) return s.enum[0]

  const type = s.type as string | undefined

  if (type === 'object' || s.properties) {
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries((s.properties ?? {}) as Record<string, unknown>)) {
      result[k] = schemaToExample(v, k)
    }
    return result
  }

  if (type === 'array') {
    return s.items ? [schemaToExample(s.items, propName)] : []
  }

  const name = (propName ?? '').toLowerCase()
  if (type === 'string') {
    if (name.includes('email')) return 'user@example.com'
    if (name === 'name' || name.includes('username')) return 'Widget Pro'
    if (name.includes('title')) return 'My Title'
    if (name.includes('desc')) return 'A detailed description of the item'
    if (name.includes('url') || name.includes('href') || name.includes('link')) return 'https://example.com'
    if (name.includes('id')) return 'a1b2c3d4-0001-4000-8000-000000000001'
    if (name.includes('date') || name.includes('time') || name.includes('at')) return new Date().toISOString()
    if (name.includes('password') || name.includes('secret')) return 'p@ssw0rd!'
    if (name.includes('token') || name.includes('key')) return 'ey...'
    if (name.includes('phone') || name.includes('tel')) return '+1-555-0100'
    if (name.includes('status')) return 'active'
    if (name.includes('color') || name.includes('colour')) return '#6366f1'
    return 'string'
  }

  if (type === 'number' || type === 'integer') {
    if (name.includes('price') || name.includes('amount') || name.includes('cost') || name.includes('fee')) return 29.99
    if (name.includes('age')) return 25
    if (name.includes('count') || name.includes('total') || name.includes('quantity')) return 3
    if (name.includes('port')) return 3000
    if (name.includes('rating') || name.includes('score')) return 4.5
    return type === 'integer' ? 1 : 1.0
  }

  if (type === 'boolean') return true

  return null
}

// Extract the request body schema from an OpenAPI path item and generate an example
function buildExampleBody(route: RouteEntry): string {
  const schema = route.requestBody?.content?.['application/json']?.schema
  if (!schema) return '{\n  \n}'
  try {
    const example = schemaToExample(schema)
    return JSON.stringify(example, null, 2)
  } catch {
    return '{\n  \n}'
  }
}

interface Props {
  baseUrl: string
}

export function ApiExplorerPanel({ baseUrl }: Props) {
  const [spec, setSpec] = useState<OpenApiSpec | null>(null)
  const [routes, setRoutes] = useState<RouteEntry[]>([])
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<RouteEntry | null>(null)

  // Request state
  const [reqBody, setReqBody] = useState('')
  const [reqHeaders, setReqHeaders] = useState('{\n  "Content-Type": "application/json"\n}')
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body')

  // Path params (key/value map)
  const [pathParams, setPathParams] = useState<Record<string, string>>({})

  // Response state
  const [reqState, setReqState] = useState<RequestState>('idle')
  const [responseStatus, setResponseStatus] = useState<number | null>(null)
  const [responseDuration, setResponseDuration] = useState<number | null>(null)
  const [responseBody, setResponseBody] = useState<string | null>(null)
  const [responseHtml, setResponseHtml] = useState<string | null>(null)

  const bodyTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Normalise baseUrl — strip trailing slash and query params
  const origin = baseUrl.split('?')[0].replace(/\/$/, '')

  // Candidate spec URLs tried in order — covers Forge convention, @fastify/swagger-ui,
  // express/swagger-jsdoc, swagger-ui-express, hapi-swagger
  const SPEC_CANDIDATES = [
    `${origin}/openapi.json`,
    `${origin}/docs/json`,
    `${origin}/swagger.json`,
    `${origin}/api-docs`,
    `${origin}/documentation/json`,
  ]

  const loadSpec = useCallback(async () => {
    setLoadError(null)
    let lastError = ''
    for (const url of SPEC_CANDIDATES) {
      try {
        const res = await fetch(url, { signal: AbortSignal.timeout(3000) })
        if (!res.ok) { lastError = `${url} → HTTP ${res.status}`; continue }
        const data: OpenApiSpec = await res.json()
        setSpec(data)
        const discovered: RouteEntry[] = []
        for (const [path, methods] of Object.entries(data.paths ?? {})) {
          for (const [method, item] of Object.entries(methods)) {
            if (['get', 'post', 'put', 'patch', 'delete', 'options', 'head'].includes(method.toLowerCase())) {
              discovered.push({ method: method.toUpperCase(), path, ...item })
            }
          }
        }
        setRoutes(discovered)
        if (discovered.length > 0) handleSelect(discovered[0])
        return
      } catch {
        lastError = `${url} → no response`
      }
    }
    setLoadError(lastError || 'No OpenAPI spec found')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [origin])

  useEffect(() => {
    loadSpec()
  }, [loadSpec])

  function handleSelect(route: RouteEntry) {
    setSelected(route)
    setResponseStatus(null)
    setResponseBody(null)
    setResponseHtml(null)
    setResponseDuration(null)
    setReqState('idle')

    // Pre-fill path params — use seed IDs for 'id' params so user can test immediately
    const params: Record<string, string> = {}
    const matches = route.path.matchAll(/:([a-zA-Z_][a-zA-Z0-9_]*)/g)
    for (const m of matches) {
      const key = m[1]
      params[key] = key === 'id' ? 'a1b2c3d4-0001-4000-8000-000000000001' : ''
    }
    setPathParams(params)

    // For methods with a body: generate an example from the OpenAPI schema
    if (['POST', 'PUT', 'PATCH'].includes(route.method)) {
      setReqBody(buildExampleBody(route))
      setActiveTab('body')
    } else {
      setReqBody('')
      setActiveTab('headers')
    }
  }

  function buildUrl(route: RouteEntry): string {
    let path = route.path
    for (const [k, v] of Object.entries(pathParams)) {
      path = path.replace(`:${k}`, encodeURIComponent(v) || `:${k}`)
    }
    return `${origin}${path}`
  }

  async function sendRequest() {
    if (!selected) return
    setReqState('loading')
    setResponseStatus(null)
    setResponseBody(null)
    setResponseHtml(null)
    setResponseDuration(null)

    let headers: Record<string, string> = {}
    try {
      headers = JSON.parse(reqHeaders)
    } catch {
      // ignore malformed headers
    }

    const start = performance.now()
    try {
      const opts: RequestInit = { method: selected.method, headers }
      if (['POST', 'PUT', 'PATCH'].includes(selected.method) && reqBody.trim()) {
        opts.body = reqBody
      }
      const res = await fetch(buildUrl(selected), opts)
      const duration = Math.round(performance.now() - start)
      setResponseStatus(res.status)
      setResponseDuration(duration)

      const contentType = res.headers.get('content-type') ?? ''
      const text = await res.text()

      if (contentType.includes('application/json') || contentType.includes('application/') ) {
        try {
          const parsed = JSON.parse(text)
          const pretty = JSON.stringify(parsed, null, 2)
          setResponseBody(pretty)
          setResponseHtml(jsonHighlight(pretty))
        } catch {
          setResponseBody(text)
          setResponseHtml(null)
        }
      } else {
        setResponseBody(text)
        setResponseHtml(null)
      }
      setReqState(res.ok ? 'success' : 'error')
    } catch (err) {
      const duration = Math.round(performance.now() - start)
      setResponseDuration(duration)
      setResponseBody(`Network error: ${(err as Error).message}`)
      setResponseHtml(null)
      setReqState('error')
    }
  }

  // Group routes by first tag or 'Other'
  const grouped = routes.reduce<Record<string, RouteEntry[]>>((acc, r) => {
    const tag = r.tags?.[0] ?? 'Other'
    ;(acc[tag] ??= []).push(r)
    return acc
  }, {})

  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-950 text-gray-400 gap-4 p-6">
        <div className="text-lg text-gray-300 font-semibold">API Explorer</div>
        <p className="text-sm text-center max-w-sm text-gray-500">
          Tried <span className="text-gray-400">{SPEC_CANDIDATES.length}</span> spec URLs — none responded with a valid OpenAPI spec.
          <br /><span className="text-red-400 text-xs mt-1 block">{loadError}</span>
        </p>
        <p className="text-xs text-gray-600 text-center">Make sure the server exposes <code className="text-gray-500">/openapi.json</code> or <code className="text-gray-500">/docs/json</code>.</p>
        <button
          onClick={loadSpec}
          className="mt-2 px-4 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors"
        >
          Retry
        </button>
        <div className="mt-4 border-t border-gray-800 pt-4 w-full max-w-sm">
          <p className="text-xs text-gray-600 mb-2 font-medium">Manual request</p>
          <ManualRequestPane origin={origin} />
        </div>
      </div>
    )
  }

  if (!spec) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-950">
        <div className="flex items-center gap-2 text-gray-500 text-sm">
          <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
          Loading API spec…
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-full bg-gray-950 overflow-hidden">
      {/* Sidebar — route list */}
      <aside className="w-56 shrink-0 border-r border-gray-800 flex flex-col overflow-hidden">
        <div className="px-3 py-2.5 border-b border-gray-800">
          <p className="text-xs font-bold text-gray-200 truncate">{spec.info.title}</p>
          <p className="text-[10px] text-gray-600">v{spec.info.version}</p>
        </div>
        <div className="flex-1 overflow-y-auto">
          {Object.entries(grouped).map(([tag, tagRoutes]) => (
            <div key={tag}>
              <div className="px-3 pt-3 pb-1 text-[10px] font-bold uppercase tracking-widest text-gray-600">{tag}</div>
              {tagRoutes.map((r) => (
                <button
                  key={`${r.method}:${r.path}`}
                  onClick={() => handleSelect(r)}
                  className={`w-full text-left px-3 py-2 flex items-start gap-2 hover:bg-gray-800/60 transition-colors group ${selected?.method === r.method && selected?.path === r.path ? 'bg-gray-800' : ''}`}
                >
                  <span className={`shrink-0 text-[9px] font-bold px-1 py-0.5 rounded font-mono mt-0.5 ${METHOD_COLORS[r.method] ?? 'bg-gray-700 text-gray-300'}`}>
                    {r.method}
                  </span>
                  <span className="text-[11px] text-gray-400 group-hover:text-gray-200 break-all leading-tight font-mono">
                    {r.path}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <button onClick={loadSpec} className="m-2 text-[10px] text-gray-700 hover:text-gray-400 transition-colors text-center">
          ↻ Reload spec
        </button>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected ? (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-gray-800 flex items-center gap-3 shrink-0">
              <span className={`text-xs font-bold px-2 py-1 rounded font-mono ${METHOD_COLORS[selected.method] ?? 'bg-gray-700 text-gray-300'}`}>
                {selected.method}
              </span>
              <span className="text-sm font-mono text-gray-200 flex-1 truncate">{buildUrl(selected)}</span>
              <button
                onClick={sendRequest}
                disabled={reqState === 'loading'}
                className="px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white rounded-md transition-colors font-medium flex items-center gap-1.5"
              >
                {reqState === 'loading' ? (
                  <><div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" /> Sending…</>
                ) : 'Send'}
              </button>
            </div>

            {/* Path params if any */}
            {Object.keys(pathParams).length > 0 && (
              <div className="px-4 py-2 border-b border-gray-800 bg-gray-900/40 flex flex-wrap gap-3 items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Path params</span>
                {Object.entries(pathParams).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-1.5">
                    <span className="text-xs text-indigo-400 font-mono">{k}</span>
                    <input
                      value={v}
                      onChange={e => setPathParams(prev => ({ ...prev, [k]: e.target.value }))}
                      placeholder={`value`}
                      className="w-28 px-2 py-0.5 text-xs bg-gray-800 border border-gray-700 rounded text-gray-200 font-mono focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Request tabs */}
            <div className="flex gap-0 border-b border-gray-800 shrink-0">
              {(['body', 'headers'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 text-xs font-medium transition-colors capitalize ${activeTab === tab ? 'text-indigo-400 border-b-2 border-indigo-500 -mb-px' : 'text-gray-500 hover:text-gray-300'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* Request body / headers */}
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex-1 overflow-hidden flex flex-col">
                <textarea
                  ref={bodyTextareaRef}
                  value={activeTab === 'body' ? reqBody : reqHeaders}
                  onChange={e => activeTab === 'body' ? setReqBody(e.target.value) : setReqHeaders(e.target.value)}
                  spellCheck={false}
                  placeholder={activeTab === 'body' ? '// Request body (JSON)' : '// Headers (JSON)'}
                  className="flex-1 min-h-0 resize-none w-full bg-gray-900 text-gray-300 text-xs font-mono p-4 focus:outline-none border-none"
                />
              </div>

              {/* Response panel */}
              <div className="border-t border-gray-800 flex flex-col" style={{ height: '55%', minHeight: '160px' }}>
                <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-800 bg-gray-900/30 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Response</span>
                  {responseStatus !== null && (
                    <span className={`text-xs font-bold font-mono ${statusColor(responseStatus)}`}>{responseStatus}</span>
                  )}
                  {responseDuration !== null && (
                    <span className="text-[10px] text-gray-600">{formatDuration(responseDuration)}</span>
                  )}
                  {responseBody && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(responseBody) }}
                      className="ml-auto text-[10px] text-gray-600 hover:text-gray-400 transition-colors"
                    >
                      Copy
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-auto p-4">
                  {reqState === 'idle' && (
                    <p className="text-xs text-gray-700 italic">Send a request to see the response</p>
                  )}
                  {reqState === 'loading' && (
                    <p className="text-xs text-gray-600 animate-pulse">Waiting for response…</p>
                  )}
                  {responseBody !== null && responseHtml !== null && (
                    <pre
                      className="text-xs font-mono leading-relaxed whitespace-pre-wrap break-words"
                      dangerouslySetInnerHTML={{ __html: responseHtml }}
                    />
                  )}
                  {responseBody !== null && responseHtml === null && (
                    <pre className="text-xs font-mono text-gray-300 leading-relaxed whitespace-pre-wrap break-words">
                      {responseBody}
                    </pre>
                  )}
                </div>
              </div>
            </div>
          </>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-600 text-sm">
            Select an endpoint to explore
          </div>
        )}
      </div>
    </div>
  )
}

// Simple manual request pane shown when OpenAPI spec can't be loaded
function ManualRequestPane({ origin }: { origin: string }) {
  const [method, setMethod] = useState('GET')
  const [path, setPath] = useState('/health')
  const [body, setBody] = useState('')
  const [response, setResponse] = useState<string | null>(null)
  const [status, setStatus] = useState<number | null>(null)
  const [loading, setLoading] = useState(false)

  async function send() {
    setLoading(true)
    setResponse(null)
    try {
      const opts: RequestInit = { method, headers: { 'Content-Type': 'application/json' } }
      if (['POST', 'PUT', 'PATCH'].includes(method) && body.trim()) opts.body = body
      const res = await fetch(`${origin}${path}`, opts)
      setStatus(res.status)
      const text = await res.text()
      try { setResponse(JSON.stringify(JSON.parse(text), null, 2)) } catch { setResponse(text) }
    } catch (err) {
      setResponse(`Error: ${(err as Error).message}`)
    }
    setLoading(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <select value={method} onChange={e => setMethod(e.target.value)} className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300 focus:outline-none">
          {['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => <option key={m}>{m}</option>)}
        </select>
        <input value={path} onChange={e => setPath(e.target.value)} className="flex-1 text-xs bg-gray-800 border border-gray-700 rounded px-2 py-1 text-gray-300 font-mono focus:outline-none focus:border-indigo-500" placeholder="/api/v1/items" />
        <button onClick={send} disabled={loading} className="px-3 py-1 text-xs bg-indigo-600 hover:bg-indigo-500 text-white rounded transition-colors">
          {loading ? '…' : 'Send'}
        </button>
      </div>
      {status !== null && <p className={`text-xs font-mono ${statusColor(status)}`}>HTTP {status}</p>}
      {response && <pre className="text-[10px] text-gray-400 font-mono whitespace-pre-wrap break-words max-h-32 overflow-auto bg-gray-900 rounded p-2">{response}</pre>}
    </div>
  )
}
