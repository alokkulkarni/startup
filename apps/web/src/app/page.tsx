import Link from 'next/link'
import { TemplateShowcase } from '@/components/landing/TemplateShowcase'

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col bg-gray-950 text-gray-50">

      {/* ── Nav ──────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b border-gray-800/60 bg-gray-950/80 backdrop-blur-md">
        <div className="mx-auto max-w-7xl flex items-center justify-between px-6 h-16">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-forge-400 to-forge-600 flex items-center justify-center font-bold text-white text-sm shadow-lg shadow-forge-900/40">
              F
            </div>
            <span className="font-semibold text-lg tracking-tight">Forge AI</span>
          </Link>

          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400">
            <a href="#how-it-works" className="hover:text-white transition-colors">How it works</a>
            <Link href="/templates" className="hover:text-white transition-colors">Templates</Link>
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <Link href="/docs" className="hover:text-white transition-colors">Docs</Link>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/login" className="hidden sm:block text-sm text-gray-400 hover:text-white transition-colors">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="text-sm px-4 py-2 bg-forge-500 hover:bg-forge-400 text-white rounded-lg font-medium transition-all hover:shadow-lg hover:shadow-forge-900/40"
            >
              Start building
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ─────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden flex flex-col items-center text-center pt-24 pb-32 px-6">
        {/* Ambient background glow */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-forge-600/10 rounded-full blur-3xl" />
          <div className="absolute top-32 left-1/3 w-[400px] h-[400px] bg-blue-700/5 rounded-full blur-2xl" />
        </div>

        {/* Beta badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 mb-8 bg-forge-950 border border-forge-800/60 rounded-full text-sm text-forge-300">
          <span className="w-1.5 h-1.5 bg-forge-400 rounded-full animate-pulse" />
          Now in private beta — join the waitlist
        </div>

        {/* Headline */}
        <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight max-w-4xl leading-[1.05]">
          Build full-stack apps
          <br />
          <span className="bg-gradient-to-r from-forge-300 via-forge-400 to-blue-400 bg-clip-text text-transparent">
            with plain English
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-gray-400 max-w-2xl leading-relaxed">
          Describe what you want to build. Forge AI generates production-ready React apps,
          wires up the database, API, and auth — then deploys to your favourite platform in minutes.
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row gap-3">
          <Link
            href="/signup"
            className="px-8 py-4 bg-forge-500 hover:bg-forge-400 text-white rounded-xl text-base font-semibold transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-forge-900/40 active:scale-[0.98]"
          >
            Start building for free →
          </Link>
          <a
            href="#how-it-works"
            className="px-8 py-4 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white rounded-xl text-base font-semibold transition-colors"
          >
            See how it works
          </a>
        </div>
        <p className="mt-4 text-sm text-gray-700">No credit card required · Deploy in under 5 minutes</p>

        {/* Mock app window */}
        <div className="mt-16 w-full max-w-4xl rounded-2xl border border-gray-700/50 bg-gray-900/70 shadow-2xl shadow-black/50 overflow-hidden">
          {/* Window chrome */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-800 bg-gray-900">
            <div className="w-3 h-3 rounded-full bg-gray-700" />
            <div className="w-3 h-3 rounded-full bg-gray-700" />
            <div className="w-3 h-3 rounded-full bg-gray-700" />
            <div className="ml-4 flex-1 h-5 bg-gray-800 rounded" />
          </div>
          <div className="flex h-64 md:h-80">
            {/* Sidebar */}
            <div className="hidden md:flex w-60 shrink-0 border-r border-gray-800 p-4 flex-col gap-2.5">
              <div className="h-3.5 w-20 bg-gray-800 rounded mb-1" />
              {[
                { label: 'Build a SaaS dashboard', active: true },
                { label: 'Add user authentication' },
                { label: 'Create a REST API' },
                { label: 'Deploy to Vercel' },
              ].map((item, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2 px-2.5 py-2 rounded-lg ${item.active ? 'bg-forge-950/80 border border-forge-800/40' : ''}`}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-700 shrink-0" />
                  <span className="text-xs text-gray-500 truncate">{item.label}</span>
                </div>
              ))}
            </div>
            {/* Chat area */}
            <div className="flex-1 p-5 flex flex-col justify-end gap-3">
              <div className="flex justify-end">
                <div className="max-w-xs px-4 py-2.5 bg-forge-600/20 border border-forge-600/30 rounded-2xl rounded-br-sm text-sm text-forge-200">
                  Build me a SaaS dashboard with user auth, billing, and an analytics page
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-forge-400 to-forge-600 shrink-0 flex items-center justify-center text-[10px] font-bold">
                  F
                </div>
                <div className="max-w-sm px-4 py-2.5 bg-gray-800 rounded-2xl rounded-bl-sm text-sm text-gray-300 leading-relaxed">
                  Generating your React SaaS dashboard with login flow, billing page, and a Recharts analytics view…
                  <span className="inline-block ml-1 w-1.5 h-4 bg-forge-400 animate-pulse align-middle rounded-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 px-6 border-t border-gray-800/60">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-forge-400 uppercase tracking-widest mb-3">How it works</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">From idea to live app in minutes</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            {[
              {
                step: '01',
                icon: '✏️',
                title: 'Describe your app',
                desc: 'Type what you want in plain English. Paste screenshots, share a design file, or just explain the features you need.',
              },
              {
                step: '02',
                icon: '⚡',
                title: 'Watch it come to life',
                desc: 'Forge AI generates production-quality React code, sets up your database schema, API routes, and auth — in real time.',
              },
              {
                step: '03',
                icon: '🚀',
                title: 'Refine and ship',
                desc: "Iterate with natural language. When you're happy, deploy to Vercel, Netlify, or Cloudflare Pages in one click.",
              },
            ].map((s, i) => (
              <div key={s.step} className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-5xl font-bold text-gray-800 tabular-nums leading-none select-none">{s.step}</span>
                  <span className="text-2xl">{s.icon}</span>
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 px-6 bg-gray-900/30 border-t border-gray-800/60">
        <div className="mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-forge-400 uppercase tracking-widest mb-3">Everything you need</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Built for real production apps</h2>
            <p className="mt-4 text-gray-400 max-w-xl mx-auto text-sm leading-relaxed">
              Not just a prototype generator. Forge AI outputs clean, maintainable code you can actually own and extend.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { icon: '🤖', title: 'Claude-powered AI', desc: 'Powered by Claude models, with GPT and Gemini as intelligent fallbacks for the best possible output.' },
              { icon: '👁️', title: 'Live browser preview', desc: 'Your app runs directly in the browser via WebContainers — no server, no setup, instant hot-reload.' },
              { icon: '📦', title: '16+ starter templates', desc: 'React, Next.js, Vue, Svelte, Angular, Flutter, and Fastify REST — all with full working file scaffolding.' },
              { icon: '🚀', title: 'One-click deploy', desc: 'Push to Vercel, Netlify, or Cloudflare Pages instantly. Custom domains and environment variables handled.' },
              { icon: '👥', title: 'Team collaboration', desc: 'Real-time multi-user editing with Yjs, shared AI chat history, and role-based access — Admin, Editor, or Viewer.' },
              { icon: '🔗', title: 'GitHub sync', desc: 'Connect your GitHub account, push every change to your own repo, and take your code anywhere.' },
            ].map(f => (
              <div
                key={f.title}
                className="p-5 rounded-xl border border-gray-800 bg-gray-900/50 hover:border-gray-700 hover:bg-gray-900 transition-all group"
              >
                <div className="text-2xl mb-3">{f.icon}</div>
                <h3 className="font-semibold mb-1.5 group-hover:text-white transition-colors">{f.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats ─────────────────────────────────────────────────────────── */}
      <section className="py-20 px-6 border-t border-gray-800/60">
        <div className="mx-auto max-w-4xl">
          <p className="text-center text-xs font-semibold text-forge-400 uppercase tracking-widest mb-14">Forge in numbers</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '10K+', label: 'Apps built' },
              { value: '< 5 min', label: 'Avg. deploy time' },
              { value: '3 AI', label: 'Models powering it' },
              { value: '1-click', label: 'Deploy to production' },
            ].map(s => (
              <div key={s.label}>
                <div className="text-3xl md:text-4xl font-bold tracking-tight">{s.value}</div>
                <div className="mt-1.5 text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <TemplateShowcase />

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6 border-t border-gray-800/60">
        <div className="mx-auto max-w-3xl">
          <div className="relative rounded-2xl border border-forge-800/30 bg-gradient-to-b from-forge-950/60 to-gray-950 p-12 text-center overflow-hidden">
            <div className="pointer-events-none absolute inset-0 -z-10">
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-forge-600/8 rounded-full blur-3xl" />
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Ready to build something great?</h2>
            <p className="text-gray-400 mb-8 text-lg">Join developers building with Forge AI. Free to get started.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/signup"
                className="px-8 py-4 bg-forge-500 hover:bg-forge-400 text-white rounded-xl font-semibold transition-all hover:scale-[1.02] hover:shadow-xl hover:shadow-forge-900/40"
              >
                Start building for free →
              </Link>
              <Link
                href="/login"
                className="px-8 py-4 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white rounded-xl font-semibold transition-colors"
              >
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-gray-800/60 py-10 px-6">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-forge-400 to-forge-600 flex items-center justify-center font-bold text-white text-xs">
              F
            </div>
            <span className="text-gray-400 font-medium">Forge AI</span>
          </div>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-gray-400 transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-400 transition-colors">Terms</a>
            <Link href="/templates" className="hover:text-gray-400 transition-colors">Templates</Link>
            <Link href="/docs" className="hover:text-gray-400 transition-colors">Docs</Link>
            <a href="mailto:hello@forge.ai" className="hover:text-gray-400 transition-colors">Contact</a>
          </div>
          <p>© {new Date().getFullYear()} Forge AI. All rights reserved.</p>
        </div>
      </footer>

    </main>
  )
}
