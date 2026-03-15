'use client'

import { useState } from 'react'

// ── All 16 real templates from templateSeeds.ts ───────────────────────────────

const TEMPLATES = [
  {
    name: 'Next.js SaaS Starter',
    category: 'saas',
    framework: 'nextjs',
    desc: 'Production-ready SaaS landing page with navbar, hero, pricing table, and sign-up CTA.',
  },
  {
    name: 'React Landing Page',
    category: 'landing',
    framework: 'react',
    desc: 'Conversion-optimised hero, features grid, testimonials, and CTA sections.',
  },
  {
    name: 'React Dashboard',
    category: 'dashboard',
    framework: 'react',
    desc: 'Admin dashboard with collapsible sidebar, stats cards, and sortable data table.',
  },
  {
    name: 'Next.js Blog',
    category: 'blog',
    framework: 'nextjs',
    desc: 'Markdown-powered blog with RSS feed, SEO meta, and dark mode.',
  },
  {
    name: 'React E-Commerce',
    category: 'ecommerce',
    framework: 'react',
    desc: 'Product catalogue, cart sidebar, and checkout flow. Uses React context.',
  },
  {
    name: 'Fastify REST API',
    category: 'api',
    framework: 'node',
    desc: 'Production-ready REST API with Fastify, TypeScript, Zod, and CRUD endpoints.',
  },
  {
    name: 'React Counter',
    category: 'starter',
    framework: 'react',
    desc: 'Simple counter app with React and hooks. Perfect for learning state management.',
  },
  {
    name: 'React Todo App',
    category: 'starter',
    framework: 'react',
    desc: 'Fully-featured todo list with add, complete, delete, and filter. Uses localStorage.',
  },
  {
    name: 'Vue 3 Starter',
    category: 'starter',
    framework: 'vue',
    desc: 'Vue 3 starter using Composition API with a reactive counter and persistent todo list.',
  },
  {
    name: 'SvelteKit Starter',
    category: 'starter',
    framework: 'svelte',
    desc: 'SvelteKit starter with reactive counter, writable store, and dark mode toggle.',
  },
  {
    name: 'Angular Starter',
    category: 'starter',
    framework: 'angular',
    desc: 'Angular 18 starter with standalone components, routing, and lazy loading.',
  },
  {
    name: 'Angular Signals App',
    category: 'starter',
    framework: 'angular',
    desc: 'Modern Angular 18 app showcasing Signals, computed(), effect(), and signal-based state.',
  },
  {
    name: 'Angular Material Dashboard',
    category: 'dashboard',
    framework: 'angular',
    desc: 'Admin dashboard with Angular Material — sidenav, stats cards, data table, dark theme.',
  },
  {
    name: 'Flutter Starter',
    category: 'starter',
    framework: 'flutter',
    desc: 'Material 3 Flutter web app with navigation bar, counter, and theme toggle.',
  },
  {
    name: 'Flutter Web Dashboard',
    category: 'dashboard',
    framework: 'flutter',
    desc: 'Responsive Flutter dashboard with NavigationRail, stats cards, and animated charts.',
  },
  {
    name: 'Flutter WASM Canvas',
    category: 'starter',
    framework: 'flutter',
    desc: 'Flutter WebAssembly app with smooth particle canvas and GPU-accelerated rendering.',
  },
] as const

// ── Visual config ──────────────────────────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { label: string; tagCls: string; mockupAccent: string }> = {
  starter:   { label: 'Starter',   tagCls: 'text-blue-400 bg-blue-950/70 border-blue-900/50',         mockupAccent: '#3b82f6' },
  saas:      { label: 'SaaS',      tagCls: 'text-violet-400 bg-violet-950/70 border-violet-900/50',   mockupAccent: '#8b5cf6' },
  landing:   { label: 'Landing',   tagCls: 'text-emerald-400 bg-emerald-950/70 border-emerald-900/50',mockupAccent: '#10b981' },
  blog:      { label: 'Blog',      tagCls: 'text-amber-400 bg-amber-950/70 border-amber-900/50',      mockupAccent: '#f59e0b' },
  ecommerce: { label: 'Commerce',  tagCls: 'text-pink-400 bg-pink-950/70 border-pink-900/50',         mockupAccent: '#ec4899' },
  dashboard: { label: 'Dashboard', tagCls: 'text-cyan-400 bg-cyan-950/70 border-cyan-900/50',         mockupAccent: '#06b6d4' },
  api:       { label: 'API',       tagCls: 'text-orange-400 bg-orange-950/70 border-orange-900/50',   mockupAccent: '#f97316' },
}

const FRAMEWORK_CONFIG: Record<string, { label: string; dotCls: string }> = {
  react:   { label: 'React',   dotCls: 'bg-cyan-400' },
  nextjs:  { label: 'Next.js', dotCls: 'bg-white' },
  vue:     { label: 'Vue',     dotCls: 'bg-green-400' },
  svelte:  { label: 'Svelte',  dotCls: 'bg-orange-400' },
  angular: { label: 'Angular', dotCls: 'bg-red-400' },
  node:    { label: 'Node',    dotCls: 'bg-green-500' },
  flutter: { label: 'Flutter', dotCls: 'bg-blue-400' },
}

// ── Category wireframe mockups ─────────────────────────────────────────────────

function SaaSMockup({ accent }: { accent: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 240 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="0" y="0" width="240" height="16" fill="#1f2937" />
      <rect x="8" y="5" width="28" height="6" rx="2" fill={accent} opacity="0.7" />
      <rect x="176" y="5" width="24" height="6" rx="3" fill={accent} opacity="0.5" />
      <rect x="204" y="5" width="28" height="6" rx="3" fill="#374151" />
      <rect x="60" y="24" width="120" height="8" rx="2" fill="#e5e7eb" opacity="0.15" />
      <rect x="80" y="36" width="80" height="5" rx="2" fill="#9ca3af" opacity="0.2" />
      <rect x="96" y="46" width="48" height="10" rx="5" fill={accent} opacity="0.6" />
      <rect x="8" y="62" width="68" height="32" rx="4" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
      <rect x="86" y="62" width="68" height="32" rx="4" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
      <rect x="164" y="62" width="68" height="32" rx="4" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
      <rect x="16" y="70" width="20" height="4" rx="1" fill={accent} opacity="0.5" />
      <rect x="94" y="70" width="20" height="4" rx="1" fill={accent} opacity="0.5" />
      <rect x="172" y="70" width="20" height="4" rx="1" fill={accent} opacity="0.5" />
      <rect x="16" y="78" width="48" height="3" rx="1" fill="#4b5563" opacity="0.8" />
      <rect x="94" y="78" width="48" height="3" rx="1" fill="#4b5563" opacity="0.8" />
      <rect x="172" y="78" width="48" height="3" rx="1" fill="#4b5563" opacity="0.8" />
    </svg>
  )
}

function LandingMockup({ accent }: { accent: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 240 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="0" y="0" width="240" height="48" fill="#0f172a" />
      <rect x="50" y="8" width="140" height="9" rx="3" fill="#e5e7eb" opacity="0.18" />
      <rect x="70" y="22" width="100" height="6" rx="2" fill="#9ca3af" opacity="0.22" />
      <rect x="88" y="33" width="64" height="10" rx="5" fill={accent} opacity="0.65" />
      <rect x="0" y="50" width="240" height="26" fill="#111827" />
      <rect x="12" y="56" width="100" height="5" rx="2" fill="#374151" />
      <rect x="12" y="64" width="80" height="4" rx="2" fill="#374151" opacity="0.6" />
      <rect x="140" y="53" width="88" height="20" rx="4" fill="#1f2937" />
      <rect x="0" y="78" width="240" height="22" fill="#0f172a" />
      <rect x="140" y="83" width="80" height="4" rx="2" fill="#374151" />
      <rect x="140" y="91" width="60" height="3" rx="2" fill="#374151" opacity="0.6" />
      <rect x="12" y="80" width="88" height="18" rx="4" fill="#1f2937" />
    </svg>
  )
}

function DashboardMockup({ accent }: { accent: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 240 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="0" y="0" width="50" height="100" fill="#111827" />
      <rect x="8" y="8" width="34" height="7" rx="2" fill={accent} opacity="0.6" />
      <rect x="8" y="20" width="34" height="4" rx="2" fill="#374151" />
      <rect x="8" y="28" width="34" height="4" rx="2" fill="#374151" opacity="0.7" />
      <rect x="8" y="36" width="34" height="4" rx="2" fill="#374151" opacity="0.5" />
      <rect x="50" y="0" width="190" height="16" fill="#1f2937" />
      <rect x="56" y="20" width="38" height="24" rx="3" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
      <rect x="100" y="20" width="38" height="24" rx="3" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
      <rect x="144" y="20" width="38" height="24" rx="3" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
      <rect x="188" y="20" width="44" height="24" rx="3" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
      <rect x="60" y="24" width="14" height="3" rx="1" fill={accent} opacity="0.5" />
      <rect x="60" y="30" width="24" height="6" rx="1" fill="#e5e7eb" opacity="0.2" />
      <rect x="104" y="24" width="14" height="3" rx="1" fill={accent} opacity="0.5" />
      <rect x="104" y="30" width="24" height="6" rx="1" fill="#e5e7eb" opacity="0.2" />
      <rect x="56" y="50" width="118" height="44" rx="3" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
      <polyline points="64,84 76,74 90,78 104,66 116,70 130,60 144,64 158,56 164,60" fill="none" stroke={accent} strokeWidth="1.5" opacity="0.7" />
      <rect x="180" y="50" width="52" height="44" rx="3" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
      <rect x="184" y="56" width="44" height="3" rx="1" fill="#4b5563" />
      <rect x="184" y="63" width="44" height="3" rx="1" fill="#374151" />
      <rect x="184" y="70" width="44" height="3" rx="1" fill="#374151" opacity="0.7" />
      <rect x="184" y="77" width="44" height="3" rx="1" fill="#374151" opacity="0.5" />
    </svg>
  )
}

function BlogMockup({ accent }: { accent: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 240 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="0" y="0" width="240" height="20" fill="#111827" />
      <rect x="90" y="7" width="60" height="6" rx="2" fill="#e5e7eb" opacity="0.2" />
      <rect x="12" y="26" width="158" height="18" rx="3" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
      <rect x="20" y="30" width="8" height="8" rx="1" fill={accent} opacity="0.5" />
      <rect x="32" y="30" width="80" height="4" rx="1" fill="#e5e7eb" opacity="0.2" />
      <rect x="32" y="37" width="116" height="3" rx="1" fill="#4b5563" opacity="0.7" />
      <rect x="12" y="48" width="158" height="18" rx="3" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
      <rect x="20" y="52" width="8" height="8" rx="1" fill={accent} opacity="0.4" />
      <rect x="32" y="52" width="90" height="4" rx="1" fill="#e5e7eb" opacity="0.2" />
      <rect x="32" y="59" width="110" height="3" rx="1" fill="#4b5563" opacity="0.7" />
      <rect x="12" y="70" width="158" height="18" rx="3" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
      <rect x="20" y="74" width="8" height="8" rx="1" fill={accent} opacity="0.3" />
      <rect x="32" y="74" width="70" height="4" rx="1" fill="#e5e7eb" opacity="0.2" />
      <rect x="32" y="81" width="100" height="3" rx="1" fill="#4b5563" opacity="0.7" />
      <rect x="178" y="26" width="54" height="62" rx="3" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
      <rect x="183" y="32" width="44" height="4" rx="1" fill={accent} opacity="0.4" />
      <rect x="183" y="40" width="36" height="3" rx="1" fill="#4b5563" />
      <rect x="183" y="47" width="40" height="3" rx="1" fill="#4b5563" opacity="0.7" />
    </svg>
  )
}

function EcommerceMockup({ accent }: { accent: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 240 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="0" y="0" width="240" height="16" fill="#1f2937" />
      <rect x="8" y="5" width="32" height="6" rx="2" fill={accent} opacity="0.6" />
      <rect x="206" y="5" width="26" height="6" rx="3" fill="#374151" />
      {([0, 1, 2] as const).map(col =>
        ([0, 1] as const).map(row => (
          <g key={`${col}-${row}`}>
            <rect x={6 + col * 79} y={20 + row * 40} width="72" height="36" rx="3" fill="#1f2937" stroke="#374151" strokeWidth="0.5" />
            <rect x={8 + col * 79} y={22 + row * 40} width="68" height="20" rx="2" fill="#374151" opacity="0.6" />
            <rect x={10 + col * 79} y={45 + row * 40} width="36" height="4" rx="1" fill="#e5e7eb" opacity="0.2" />
            <rect x={10 + col * 79} y={51 + row * 40} width="24" height="3" rx="1" fill={accent} opacity="0.5" />
          </g>
        ))
      )}
    </svg>
  )
}

function APIMockup({ accent }: { accent: string }) {
  return (
    <svg width="100%" height="100%" viewBox="0 0 240 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="0" y="0" width="240" height="100" fill="#0a0e17" />
      <rect x="0" y="0" width="240" height="18" fill="#111827" />
      <circle cx="13" cy="9" r="4" fill="#ef4444" opacity="0.7" />
      <circle cx="25" cy="9" r="4" fill="#f59e0b" opacity="0.7" />
      <circle cx="37" cy="9" r="4" fill="#22c55e" opacity="0.7" />
      <rect x="80" y="5" width="80" height="8" rx="3" fill="#1f2937" />
      <rect x="12" y="26" width="36" height="5" rx="1" fill={accent} opacity="0.7" />
      <rect x="52" y="26" width="60" height="5" rx="1" fill="#22c55e" opacity="0.5" />
      <rect x="20" y="36" width="24" height="4" rx="1" fill="#60a5fa" opacity="0.6" />
      <rect x="48" y="36" width="80" height="4" rx="1" fill="#e5e7eb" opacity="0.18" />
      <rect x="20" y="44" width="24" height="4" rx="1" fill="#60a5fa" opacity="0.6" />
      <rect x="48" y="44" width="60" height="4" rx="1" fill="#e5e7eb" opacity="0.18" />
      <rect x="12" y="54" width="36" height="5" rx="1" fill={accent} opacity="0.7" />
      <rect x="52" y="54" width="40" height="5" rx="1" fill="#a78bfa" opacity="0.5" />
      <rect x="20" y="64" width="24" height="4" rx="1" fill="#60a5fa" opacity="0.6" />
      <rect x="48" y="64" width="70" height="4" rx="1" fill="#e5e7eb" opacity="0.18" />
      <rect x="12" y="74" width="40" height="5" rx="1" fill={accent} opacity="0.7" />
      <rect x="56" y="74" width="48" height="5" rx="1" fill="#f97316" opacity="0.5" />
      <rect x="12" y="88" width="6" height="8" rx="1" fill={accent} opacity="0.8">
        <animate attributeName="opacity" values="0.8;0.1;0.8" dur="1.2s" repeatCount="indefinite" />
      </rect>
    </svg>
  )
}

function StarterMockup({ accent, framework }: { accent: string; framework: string }) {
  const isFlutter = framework === 'flutter'
  return (
    <svg width="100%" height="100%" viewBox="0 0 240 100" xmlns="http://www.w3.org/2000/svg" aria-hidden>
      <rect x="0" y="0" width="240" height="100" fill="#0d1117" />
      <rect x="0" y="0" width="240" height="20" fill={isFlutter ? '#1a237e' : '#161b22'} />
      <rect x="8" y="7" width="40" height="6" rx="2" fill={accent} opacity="0.7" />
      {isFlutter && <rect x="196" y="7" width="36" height="6" rx="3" fill="#303f9f" opacity="0.8" />}
      <rect x="60" y="30" width="120" height="9" rx="3" fill="#e5e7eb" opacity="0.14" />
      <rect x="80" y="44" width="80" height="6" rx="2" fill="#9ca3af" opacity="0.18" />
      <rect x="88" y="56" width="64" height="22" rx="6" fill="#1f2937" stroke="#374151" strokeWidth="0.8" />
      <rect x="96" y="63" width="48" height="8" rx="2" fill={accent} opacity="0.5" />
      {isFlutter && (
        <>
          <rect x="0" y="90" width="240" height="10" fill="#1a237e" opacity="0.7" />
          <circle cx="60" cy="95" r="3" fill="#fff" opacity="0.4" />
          <circle cx="120" cy="95" r="3" fill={accent} opacity="0.8" />
          <circle cx="180" cy="95" r="3" fill="#fff" opacity="0.3" />
        </>
      )}
    </svg>
  )
}

function TemplateMockup({ category, framework, accent }: { category: string; framework: string; accent: string }) {
  const inner = (() => {
    switch (category) {
      case 'saas':      return <SaaSMockup accent={accent} />
      case 'landing':   return <LandingMockup accent={accent} />
      case 'dashboard': return <DashboardMockup accent={accent} />
      case 'blog':      return <BlogMockup accent={accent} />
      case 'ecommerce': return <EcommerceMockup accent={accent} />
      case 'api':       return <APIMockup accent={accent} />
      default:          return <StarterMockup accent={accent} framework={framework} />
    }
  })()

  return (
    <div className="relative overflow-hidden rounded-t-xl" style={{ height: '110px', background: '#0d1117' }}>
      {/* Browser chrome bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center gap-1 px-2 py-1.5 bg-[#0f111a]/90 border-b border-white/5">
        <span className="w-2 h-2 rounded-full bg-red-500/60 flex-shrink-0" />
        <span className="w-2 h-2 rounded-full bg-yellow-500/60 flex-shrink-0" />
        <span className="w-2 h-2 rounded-full bg-green-500/50 flex-shrink-0" />
        <span className="ml-1.5 flex-1 h-3 rounded-full bg-white/5" />
      </div>
      {/* Mockup body — starts below chrome bar */}
      <div className="absolute inset-0 top-[20px] overflow-hidden">
        {inner}
      </div>
    </div>
  )
}

// ── Individual card ────────────────────────────────────────────────────────────

function TemplateCard({ template }: { template: typeof TEMPLATES[number] }) {
  const cat = CATEGORY_CONFIG[template.category] ?? CATEGORY_CONFIG.starter
  const fw  = FRAMEWORK_CONFIG[template.framework] ?? { label: template.framework, dotCls: 'bg-gray-400' }

  return (
    <div className="group rounded-xl border border-gray-800/80 bg-gray-900/50 overflow-hidden hover:border-gray-700 hover:bg-gray-900/80 transition-all duration-200 hover:shadow-xl hover:shadow-black/30">
      <TemplateMockup category={template.category} framework={template.framework} accent={cat.mockupAccent} />
      <div className="p-3.5">
        <div className="flex items-center gap-2 mb-1.5">
          <span className={`inline-flex text-[10px] px-1.5 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${cat.tagCls}`}>
            {cat.label}
          </span>
          <span className="flex items-center gap-1 text-[11px] text-gray-500">
            <span className={`w-1.5 h-1.5 rounded-full inline-block flex-shrink-0 ${fw.dotCls}`} />
            {fw.label}
          </span>
        </div>
        <h3 className="text-sm font-semibold text-gray-200 mb-1 group-hover:text-white transition-colors leading-snug">
          {template.name}
        </h3>
        <p className="text-[11px] text-gray-500 leading-relaxed line-clamp-2">{template.desc}</p>
      </div>
    </div>
  )
}

// ── Main exported component ────────────────────────────────────────────────────

const INITIAL_COUNT = 6

export function TemplateShowcase() {
  const [expanded, setExpanded] = useState(false)
  const visible = expanded ? TEMPLATES : TEMPLATES.slice(0, INITIAL_COUNT)
  const remaining = TEMPLATES.length - INITIAL_COUNT

  return (
    <section id="template-showcase" className="py-24 px-6 border-t border-gray-800/60 bg-gray-900/30">
      <div className="mx-auto max-w-6xl">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold text-forge-400 uppercase tracking-widest mb-2">Templates</p>
            <h2 className="text-3xl font-bold tracking-tight">Start your next project in seconds</h2>
            <p className="mt-2 text-sm text-gray-500">
              {TEMPLATES.length} production-ready starters across 7 frameworks — pick one and build.
            </p>
          </div>
          {!expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="text-sm text-forge-400 hover:text-forge-300 font-medium shrink-0 transition-colors flex items-center gap-1.5"
              aria-label="Show all templates"
            >
              Show all {TEMPLATES.length}
              <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 3v10M3 8l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          )}
        </div>

        {/* Grid */}
        <div className={`grid gap-4 ${
          expanded
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
        }`}>
          {visible.map(t => (
            <TemplateCard key={t.name} template={t} />
          ))}
        </div>

        {/* Expand / collapse CTA */}
        <div className="mt-8 flex justify-center">
          {!expanded ? (
            <button
              onClick={() => setExpanded(true)}
              className="group flex items-center gap-2 px-6 py-3 rounded-xl border border-gray-700/80 hover:border-gray-600 bg-gray-900/60 hover:bg-gray-800/60 text-sm text-gray-300 hover:text-white font-medium transition-all"
            >
              {/* grid icon */}
              <svg className="w-4 h-4 text-gray-500 group-hover:text-forge-400 transition-colors" viewBox="0 0 16 16" fill="none" aria-hidden>
                <rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                <rect x="10" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                <rect x="1" y="10" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
                <rect x="10" y="10" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3" />
              </svg>
              Show {remaining} more templates
            </button>
          ) : (
            <button
              onClick={() => {
                setExpanded(false)
                document.getElementById('template-showcase')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl border border-gray-800 hover:border-gray-700 text-xs text-gray-500 hover:text-gray-300 font-medium transition-all"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none" aria-hidden>
                <path d="M8 13V3M3 8l5-5 5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Show fewer
            </button>
          )}
        </div>

      </div>
    </section>
  )
}
