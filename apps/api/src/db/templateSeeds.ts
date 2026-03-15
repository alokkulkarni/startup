import type { templates } from './schema.js'

type TemplateSeed = Omit<typeof templates.$inferInsert, 'id' | 'createdAt' | 'updatedAt' | 'useCount' | 'avgRating' | 'ratingCount'>

export const TEMPLATE_SEEDS: TemplateSeed[] = [
  // ── 1. React Counter ────────────────────────────────────────────────────────
  {
    name: 'React Counter',
    slug: 'react-counter',
    description: 'A simple counter app built with React and hooks. Perfect starting point for learning React state management.',
    category: 'starter',
    framework: 'react',
    isOfficial: true,
    isPublic: true,
    filesJson: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'react-counter',
          version: '1.0.0',
          type: 'module',
          scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
          dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
          devDependencies: { '@vitejs/plugin-react': '^4.0.0', vite: '^5.0.0' },
        }, null, 2),
      },
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>React Counter</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>`,
      },
      {
        path: 'src/main.jsx',
        content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')).render(<App />)`,
      },
      {
        path: 'src/App.jsx',
        content: `import { useState } from 'react'

export default function App() {
  const [count, setCount] = useState(0)
  return (
    <div className="app">
      <h1>Counter</h1>
      <p className="count">{count}</p>
      <div className="buttons">
        <button onClick={() => setCount(c => c - 1)}>-</button>
        <button onClick={() => setCount(0)}>Reset</button>
        <button onClick={() => setCount(c => c + 1)}>+</button>
      </div>
    </div>
  )
}`,
      },
      {
        path: 'src/index.css',
        content: `body { margin: 0; font-family: system-ui; background: #f5f5f5; }
.app { max-width: 300px; margin: 80px auto; text-align: center; background: white; padding: 2rem; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
.count { font-size: 4rem; font-weight: bold; margin: 1rem 0; color: #6366f1; }
.buttons { display: flex; gap: 1rem; justify-content: center; }
button { padding: 0.5rem 1.5rem; font-size: 1.2rem; border: none; border-radius: 6px; cursor: pointer; background: #6366f1; color: white; transition: background 0.2s; }
button:hover { background: #4f46e5; }`,
      },
      {
        path: 'vite.config.js',
        content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], server: { host: true, port: 5173 } })`,
      },
    ],
  },

  // ── 2. React Todo App ────────────────────────────────────────────────────────
  {
    name: 'React Todo App',
    slug: 'react-todo-app',
    description: 'A fully-featured todo list with add, complete, delete, and filter. Uses localStorage for persistence.',
    category: 'starter',
    framework: 'react',
    isOfficial: true,
    isPublic: true,
    filesJson: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'react-todo-app',
          version: '1.0.0',
          type: 'module',
          scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
          dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
          devDependencies: { '@vitejs/plugin-react': '^4.0.0', vite: '^5.0.0' },
        }, null, 2),
      },
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>Todo App</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>`,
      },
      {
        path: 'src/main.jsx',
        content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')).render(<App />)`,
      },
      {
        path: 'src/App.jsx',
        content: `import { useState, useEffect } from 'react'

function useTodos() {
  const [todos, setTodos] = useState(() => {
    try { return JSON.parse(localStorage.getItem('todos') || '[]') } catch { return [] }
  })
  useEffect(() => { localStorage.setItem('todos', JSON.stringify(todos)) }, [todos])
  const addTodo = (text) => setTodos(ts => [...ts, { id: Date.now(), text, done: false }])
  const toggleTodo = (id) => setTodos(ts => ts.map(t => t.id === id ? { ...t, done: !t.done } : t))
  const deleteTodo = (id) => setTodos(ts => ts.filter(t => t.id !== id))
  return { todos, addTodo, toggleTodo, deleteTodo }
}

export default function App() {
  const { todos, addTodo, toggleTodo, deleteTodo } = useTodos()
  const [input, setInput] = useState('')
  const [filter, setFilter] = useState('all')

  const filtered = todos.filter(t =>
    filter === 'active' ? !t.done : filter === 'done' ? t.done : true
  )

  const handleAdd = (e) => {
    e.preventDefault()
    if (input.trim()) { addTodo(input.trim()); setInput('') }
  }

  return (
    <div className="app">
      <h1>✅ Todos</h1>
      <form onSubmit={handleAdd} className="add-form">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="What needs to be done?"
        />
        <button type="submit">Add</button>
      </form>
      <div className="filters">
        {['all', 'active', 'done'].map(f => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>
      <ul className="todo-list">
        {filtered.map(todo => (
          <li key={todo.id} className={todo.done ? 'done' : ''}>
            <span onClick={() => toggleTodo(todo.id)}>{todo.text}</span>
            <button className="delete" onClick={() => deleteTodo(todo.id)}>×</button>
          </li>
        ))}
      </ul>
      <p className="count">{todos.filter(t => !t.done).length} items left</p>
    </div>
  )
}`,
      },
      {
        path: 'src/index.css',
        content: `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui; background: #f0f4ff; min-height: 100vh; padding: 2rem; }
.app { max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; padding: 2rem; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
h1 { font-size: 2rem; margin-bottom: 1.5rem; color: #1e293b; }
.add-form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.add-form input { flex: 1; padding: 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 1rem; }
.add-form input:focus { outline: none; border-color: #6366f1; }
.add-form button { padding: 0.75rem 1.25rem; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 1rem; }
.filters { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.filters button { padding: 0.4rem 1rem; border: 2px solid #e2e8f0; border-radius: 6px; cursor: pointer; background: white; }
.filters button.active { border-color: #6366f1; color: #6366f1; }
.todo-list { list-style: none; }
.todo-list li { display: flex; align-items: center; justify-content: space-between; padding: 0.75rem; border-bottom: 1px solid #f1f5f9; }
.todo-list li span { flex: 1; cursor: pointer; }
.todo-list li.done span { text-decoration: line-through; color: #94a3b8; }
.delete { background: none; border: none; color: #ef4444; font-size: 1.25rem; cursor: pointer; }
.count { margin-top: 1rem; font-size: 0.9rem; color: #94a3b8; text-align: right; }`,
      },
      {
        path: 'vite.config.js',
        content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], server: { host: true, port: 5173 } })`,
      },
    ],
  },

  // ── 3. Next.js SaaS Starter ──────────────────────────────────────────────────
  {
    name: 'Next.js SaaS Starter',
    slug: 'nextjs-saas-starter',
    description: 'A production-ready SaaS landing page with navbar, hero, pricing table, and sign-up CTA. Built with Next.js and Tailwind CSS.',
    category: 'saas',
    framework: 'nextjs',
    isOfficial: true,
    isPublic: true,
    filesJson: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'nextjs-saas-starter',
          version: '1.0.0',
          scripts: { dev: 'next dev -H 0.0.0.0 -p 5173', build: 'next build', start: 'next start -H 0.0.0.0 -p 5173' },
          dependencies: { next: '^14.2.0', react: '^18.2.0', 'react-dom': '^18.2.0' },
          devDependencies: { typescript: '^5.5.0', '@types/react': '^18.3.0', '@types/react-dom': '^18.3.0', '@types/node': '^20.0.0', tailwindcss: '^3.4.0', autoprefixer: '^10.4.0', postcss: '^8.4.0' },
        }, null, 2),
      },
      {
        path: 'src/app/layout.tsx',
        content: `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Acme SaaS – The Modern Platform',
  description: 'Ship faster with Acme SaaS.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900 antialiased">{children}</body>
    </html>
  )
}`,
      },
      {
        path: 'src/app/page.tsx',
        content: `import Navbar from '@/components/Navbar'
import Hero from '@/components/Hero'
import Pricing from '@/components/Pricing'

export default function Home() {
  return (
    <>
      <Navbar />
      <main>
        <Hero />
        <Pricing />
      </main>
    </>
  )
}`,
      },
      {
        path: 'src/components/Navbar.tsx',
        content: `'use client'
import { useState } from 'react'

export default function Navbar() {
  const [open, setOpen] = useState(false)
  return (
    <nav className="fixed top-0 w-full bg-white border-b border-gray-100 z-50">
      <div className="max-w-6xl mx-auto px-4 flex items-center justify-between h-16">
        <a href="/" className="text-xl font-bold text-indigo-600">Acme</a>
        <div className="hidden md:flex items-center gap-6 text-sm">
          <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
          <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
          <a href="/login" className="text-gray-600 hover:text-gray-900">Sign in</a>
          <a href="/signup" className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition">
            Get started
          </a>
        </div>
      </div>
    </nav>
  )
}`,
      },
      {
        path: 'src/components/Hero.tsx',
        content: `export default function Hero() {
  return (
    <section className="pt-32 pb-20 px-4 text-center">
      <div className="max-w-3xl mx-auto">
        <span className="inline-block px-3 py-1 text-sm bg-indigo-50 text-indigo-700 rounded-full mb-6">
          Now in public beta
        </span>
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 mb-6">
          The platform that helps you<br />
          <span className="text-indigo-600">ship 10× faster</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-xl mx-auto">
          Stop wrestling with infrastructure. Focus on what matters — your product.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <a href="/signup" className="px-8 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition">
            Start for free
          </a>
          <a href="#demo" className="px-8 py-3 border border-gray-200 rounded-xl font-semibold hover:border-gray-400 transition">
            Watch demo
          </a>
        </div>
      </div>
    </section>
  )
}`,
      },
      {
        path: 'src/components/Pricing.tsx',
        content: `const plans = [
  { name: 'Starter', price: '$0', features: ['3 projects', '5 GB storage', 'Community support'], cta: 'Get started', highlighted: false },
  { name: 'Pro', price: '$29', features: ['Unlimited projects', '50 GB storage', 'Priority support', 'Custom domains'], cta: 'Start free trial', highlighted: true },
  { name: 'Enterprise', price: 'Custom', features: ['Everything in Pro', 'SSO / SAML', 'SLA guarantee', 'Dedicated support'], cta: 'Contact sales', highlighted: false },
]

export default function Pricing() {
  return (
    <section id="pricing" className="py-20 px-4 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">Simple, transparent pricing</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {plans.map(plan => (
            <div key={plan.name} className={\`rounded-2xl p-8 \${plan.highlighted ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'bg-white border border-gray-200'}\`}>
              <h3 className="text-xl font-semibold mb-2">{plan.name}</h3>
              <p className="text-4xl font-extrabold mb-6">{plan.price}<span className="text-lg font-normal opacity-70">/mo</span></p>
              <ul className="space-y-3 mb-8">
                {plan.features.map(f => <li key={f} className="flex items-center gap-2"><span>✓</span>{f}</li>)}
              </ul>
              <a href="/signup" className={\`block text-center py-3 rounded-xl font-semibold transition \${plan.highlighted ? 'bg-white text-indigo-600 hover:bg-gray-100' : 'bg-indigo-600 text-white hover:bg-indigo-700'}\`}>
                {plan.cta}
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}`,
      },
      {
        path: 'src/app/globals.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
      },
      {
        path: 'tailwind.config.js',
        content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: {} },
  plugins: [],
}`,
      },
      {
        path: 'postcss.config.js',
        content: `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }`,
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'ES2017', lib: ['dom', 'dom.iterable', 'esnext'],
            allowJs: true, skipLibCheck: true, strict: true,
            noEmit: true, esModuleInterop: true, module: 'esnext',
            moduleResolution: 'bundler', resolveJsonModule: true,
            isolatedModules: true, jsx: 'preserve', incremental: true,
            plugins: [{ name: 'next' }],
            paths: { '@/*': ['./src/*'] },
          },
          include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
          exclude: ['node_modules'],
        }, null, 2),
      },
      {
        path: 'next.config.js',
        content: `/** @type {import('next').NextConfig} */
const nextConfig = { env: { NEXT_TELEMETRY_DISABLED: '1' } }
module.exports = nextConfig`,
      },
    ],
  },
  {
    name: 'React Landing Page',
    slug: 'landing-page',
    description: 'A polished marketing landing page with hero, features grid, testimonials, and CTA section. Built with React and CSS.',
    category: 'landing',
    framework: 'react',
    isOfficial: true,
    isPublic: true,
    filesJson: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'landing-page',
          version: '1.0.0',
          type: 'module',
          scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
          dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
          devDependencies: { '@vitejs/plugin-react': '^4.0.0', vite: '^5.0.0' },
        }, null, 2),
      },
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /><title>Landing Page</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>`,
      },
      {
        path: 'src/main.jsx',
        content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')).render(<App />)`,
      },
      {
        path: 'src/App.jsx',
        content: `import Hero from './components/Hero.jsx'
import Features from './components/Features.jsx'
import Testimonials from './components/Testimonials.jsx'
import CTA from './components/CTA.jsx'

export default function App() {
  return (
    <>
      <nav className="navbar">
        <div className="nav-inner">
          <span className="logo">🚀 Launchpad</span>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#testimonials">Reviews</a>
            <a href="#cta" className="btn-nav">Get started</a>
          </div>
        </div>
      </nav>
      <main>
        <Hero />
        <Features />
        <Testimonials />
        <CTA />
      </main>
      <footer><p>© 2024 Launchpad Inc.</p></footer>
    </>
  )
}`,
      },
      {
        path: 'src/components/Hero.jsx',
        content: `export default function Hero() {
  return (
    <section className="hero" id="hero">
      <div className="hero-content">
        <h1>Build something <span className="highlight">remarkable</span></h1>
        <p>The all-in-one platform to launch your next big idea. No setup, no hassle, just results.</p>
        <div className="hero-actions">
          <a href="#cta" className="btn-primary">Start free trial</a>
          <a href="#features" className="btn-secondary">Learn more ↓</a>
        </div>
        <p className="hero-note">No credit card required · Cancel anytime</p>
      </div>
    </section>
  )
}`,
      },
      {
        path: 'src/components/Features.jsx',
        content: `const features = [
  { icon: '⚡', title: 'Lightning Fast', desc: 'Optimized performance out of the box with edge-ready infrastructure.' },
  { icon: '🔒', title: 'Secure by Default', desc: 'Enterprise-grade security without the enterprise complexity.' },
  { icon: '📊', title: 'Real-time Analytics', desc: 'Track what matters with beautiful dashboards and instant insights.' },
  { icon: '🔗', title: 'Easy Integrations', desc: 'Connect with 200+ tools you already use, in minutes.' },
  { icon: '🌍', title: 'Global CDN', desc: 'Serve your users from the nearest edge location worldwide.' },
  { icon: '🤖', title: 'AI-Powered', desc: 'Automate repetitive tasks and get intelligent suggestions.' },
]

export default function Features() {
  return (
    <section className="features" id="features">
      <h2>Everything you need to succeed</h2>
      <div className="features-grid">
        {features.map(f => (
          <div key={f.title} className="feature-card">
            <span className="feature-icon">{f.icon}</span>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}`,
      },
      {
        path: 'src/components/Testimonials.jsx',
        content: `const testimonials = [
  { name: 'Sarah K.', role: 'CEO at TechCorp', text: 'This platform transformed how we ship products. We went from 2-week releases to daily deploys.' },
  { name: 'Marcus J.', role: 'Lead Engineer', text: 'The DX is incredible. Everything just works. Our team productivity went up 40% in the first month.' },
  { name: 'Priya M.', role: 'Founder', text: 'We built and launched our MVP in 3 days. I cannot imagine building without this anymore.' },
]

export default function Testimonials() {
  return (
    <section className="testimonials" id="testimonials">
      <h2>Loved by builders worldwide</h2>
      <div className="testimonials-grid">
        {testimonials.map(t => (
          <blockquote key={t.name} className="testimonial-card">
            <p>"{t.text}"</p>
            <footer><strong>{t.name}</strong> — {t.role}</footer>
          </blockquote>
        ))}
      </div>
    </section>
  )
}`,
      },
      {
        path: 'src/components/CTA.jsx',
        content: `export default function CTA() {
  return (
    <section className="cta" id="cta">
      <h2>Ready to launch?</h2>
      <p>Join 10,000+ teams already building on Launchpad.</p>
      <form className="cta-form" onSubmit={e => e.preventDefault()}>
        <input type="email" placeholder="Enter your email" />
        <button type="submit">Get early access</button>
      </form>
    </section>
  )
}`,
      },
      {
        path: 'src/index.css',
        content: `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; line-height: 1.6; }
.navbar { position: sticky; top: 0; background: rgba(255,255,255,0.9); backdrop-filter: blur(10px); border-bottom: 1px solid #e2e8f0; z-index: 100; }
.nav-inner { max-width: 1100px; margin: 0 auto; padding: 1rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
.logo { font-size: 1.25rem; font-weight: 700; }
.nav-links { display: flex; gap: 2rem; align-items: center; }
.nav-links a { color: #64748b; text-decoration: none; }
.btn-nav { padding: 0.5rem 1.25rem; background: #6366f1; color: white !important; border-radius: 8px; }
.hero { min-height: 80vh; display: flex; align-items: center; justify-content: center; text-align: center; background: linear-gradient(135deg, #f0f4ff, #faf5ff); padding: 4rem 1.5rem; }
.hero h1 { font-size: 3.5rem; font-weight: 800; line-height: 1.1; margin-bottom: 1.5rem; }
.highlight { color: #6366f1; }
.hero p { font-size: 1.25rem; color: #64748b; max-width: 500px; margin: 0 auto 2rem; }
.hero-actions { display: flex; gap: 1rem; justify-content: center; margin-bottom: 1rem; }
.btn-primary { padding: 0.875rem 2rem; background: #6366f1; color: white; border-radius: 10px; text-decoration: none; font-weight: 600; }
.btn-secondary { padding: 0.875rem 2rem; border: 2px solid #e2e8f0; border-radius: 10px; text-decoration: none; font-weight: 600; }
.hero-note { font-size: 0.875rem; color: #94a3b8; }
.features { padding: 5rem 1.5rem; text-align: center; }
.features h2, .testimonials h2, .cta h2 { font-size: 2.25rem; font-weight: 700; margin-bottom: 3rem; }
.features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; max-width: 1100px; margin: 0 auto; }
.feature-card { padding: 2rem; background: white; border-radius: 12px; border: 1px solid #e2e8f0; text-align: left; }
.feature-icon { font-size: 2rem; display: block; margin-bottom: 1rem; }
.feature-card h3 { font-size: 1.1rem; margin-bottom: 0.5rem; }
.feature-card p { color: #64748b; font-size: 0.95rem; }
.testimonials { padding: 5rem 1.5rem; background: #f8fafc; text-align: center; }
.testimonials-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1.5rem; max-width: 1100px; margin: 0 auto; }
.testimonial-card { background: white; padding: 2rem; border-radius: 12px; border: 1px solid #e2e8f0; text-align: left; }
.testimonial-card p { font-size: 1rem; color: #475569; margin-bottom: 1rem; font-style: italic; }
.testimonial-card footer { font-size: 0.875rem; color: #94a3b8; }
.cta { padding: 6rem 1.5rem; background: linear-gradient(135deg, #6366f1, #8b5cf6); text-align: center; color: white; }
.cta h2 { color: white; }
.cta p { font-size: 1.125rem; opacity: 0.85; margin-bottom: 2rem; }
.cta-form { display: flex; gap: 0.75rem; max-width: 460px; margin: 0 auto; }
.cta-form input { flex: 1; padding: 0.875rem; border-radius: 10px; border: none; font-size: 1rem; }
.cta-form button { padding: 0.875rem 1.5rem; background: #1e293b; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 600; white-space: nowrap; }
footer { text-align: center; padding: 2rem; color: #94a3b8; font-size: 0.875rem; }`,
      },
      {
        path: 'vite.config.js',
        content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], server: { host: true, port: 5173 } })`,
      },
    ],
  },

  // ── 5. Next.js Blog ──────────────────────────────────────────────────────────
  {
    name: 'Next.js Blog',
    slug: 'nextjs-blog',
    description: 'A minimal blog with index, post detail, and markdown rendering. Built with Next.js App Router and Tailwind CSS.',
    category: 'blog',
    framework: 'nextjs',
    isOfficial: true,
    isPublic: true,
    filesJson: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'nextjs-blog',
          version: '1.0.0',
          scripts: { dev: 'next dev -H 0.0.0.0 -p 5173', build: 'next build', start: 'next start -H 0.0.0.0 -p 5173' },
          dependencies: { next: '^14.2.0', react: '^18.2.0', 'react-dom': '^18.2.0', 'gray-matter': '^4.0.3', 'remark': '^15.0.0', 'remark-html': '^16.0.1' },
          devDependencies: { typescript: '^5.5.0', '@types/react': '^18.3.0', '@types/react-dom': '^18.3.0', '@types/node': '^20.0.0', tailwindcss: '^3.4.0', autoprefixer: '^10.4.0', postcss: '^8.4.0' },
        }, null, 2),
      },
      {
        path: 'src/app/layout.tsx',
        content: `import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = { title: 'My Blog', description: 'Thoughts and ideas' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-white">
        <header className="border-b border-gray-100 py-4 px-6">
          <a href="/" className="text-xl font-bold text-gray-900">My Blog</a>
        </header>
        <main className="max-w-2xl mx-auto px-6 py-12">{children}</main>
        <footer className="text-center py-8 text-sm text-gray-400 border-t">© 2024</footer>
      </body>
    </html>
  )
}`,
      },
      {
        path: 'src/app/page.tsx',
        content: `import Link from 'next/link'
import { getPosts } from '@/lib/posts'

export default async function BlogIndex() {
  const posts = await getPosts()
  return (
    <div>
      <h1 className="text-3xl font-bold mb-8">All Posts</h1>
      {posts.length === 0 && <p className="text-gray-500">No posts yet. Add markdown files to /content/posts/</p>}
      <ul className="space-y-6">
        {posts.map(post => (
          <li key={post.slug} className="border-b border-gray-100 pb-6">
            <Link href={\`/posts/\${post.slug}\`} className="group">
              <h2 className="text-xl font-semibold group-hover:text-indigo-600 transition">{post.title}</h2>
              <p className="text-sm text-gray-400 mt-1">{post.date}</p>
              {post.excerpt && <p className="text-gray-600 mt-2">{post.excerpt}</p>}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}`,
      },
      {
        path: 'src/app/posts/[slug]/page.tsx',
        content: `import { getPost, getPosts } from '@/lib/posts'
import { notFound } from 'next/navigation'

export async function generateStaticParams() {
  const posts = await getPosts()
  return posts.map(p => ({ slug: p.slug }))
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug)
  if (!post) notFound()
  return (
    <article>
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{post.title}</h1>
        <p className="text-sm text-gray-400">{post.date}</p>
      </header>
      <div
        className="prose prose-gray max-w-none"
        dangerouslySetInnerHTML={{ __html: post.contentHtml }}
      />
    </article>
  )
}`,
      },
      {
        path: 'src/lib/posts.ts',
        content: `import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'
import { remark } from 'remark'
import html from 'remark-html'

const postsDir = path.join(process.cwd(), 'content/posts')

export interface PostMeta { slug: string; title: string; date: string; excerpt?: string }
export interface Post extends PostMeta { contentHtml: string }

export async function getPosts(): Promise<PostMeta[]> {
  if (!fs.existsSync(postsDir)) return []
  const files = fs.readdirSync(postsDir).filter(f => f.endsWith('.md'))
  return files.map(file => {
    const slug = file.replace(/\\.md$/, '')
    const raw = fs.readFileSync(path.join(postsDir, file), 'utf8')
    const { data } = matter(raw)
    return { slug, title: data.title ?? slug, date: data.date ?? '', excerpt: data.excerpt }
  }).sort((a, b) => b.date.localeCompare(a.date))
}

export async function getPost(slug: string): Promise<Post | null> {
  const filePath = path.join(postsDir, \`\${slug}.md\`)
  if (!fs.existsSync(filePath)) return null
  const raw = fs.readFileSync(filePath, 'utf8')
  const { data, content } = matter(raw)
  const processed = await remark().use(html).process(content)
  return { slug, title: data.title ?? slug, date: data.date ?? '', excerpt: data.excerpt, contentHtml: processed.toString() }
}`,
      },
      {
        path: 'content/posts/hello-world.md',
        content: `---
title: Hello World
date: '2024-01-01'
excerpt: Welcome to my new blog built with Next.js.
---

# Hello World

Welcome to my blog! This is the first post.

## Getting Started

Add new markdown files to the \`content/posts/\` directory and they'll appear here automatically.

\`\`\`bash
touch content/posts/my-new-post.md
\`\`\`

Happy writing! ✍️`,
      },
      {
        path: 'src/app/globals.css',
        content: `@tailwind base;
@tailwind components;
@tailwind utilities;`,
      },
      {
        path: 'tailwind.config.js',
        content: `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: { extend: {} },
  plugins: [],
}`,
      },
      {
        path: 'postcss.config.js',
        content: `module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }`,
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'ES2017', lib: ['dom', 'dom.iterable', 'esnext'],
            allowJs: true, skipLibCheck: true, strict: true,
            noEmit: true, esModuleInterop: true, module: 'esnext',
            moduleResolution: 'bundler', resolveJsonModule: true,
            isolatedModules: true, jsx: 'preserve', incremental: true,
            plugins: [{ name: 'next' }],
            paths: { '@/*': ['./src/*'] },
          },
          include: ['next-env.d.ts', '**/*.ts', '**/*.tsx', '.next/types/**/*.ts'],
          exclude: ['node_modules'],
        }, null, 2),
      },
      {
        path: 'next.config.js',
        content: `/** @type {import('next').NextConfig} */
const nextConfig = { env: { NEXT_TELEMETRY_DISABLED: '1' } }
module.exports = nextConfig`,
      },
    ],
  },
  {
    name: 'React E-Commerce',
    slug: 'react-ecommerce',
    description: 'A shopping app with product grid, cart sidebar, and checkout button. Uses React context for cart state management.',
    category: 'ecommerce',
    framework: 'react',
    isOfficial: true,
    isPublic: true,
    filesJson: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'react-ecommerce',
          version: '1.0.0',
          type: 'module',
          scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
          dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
          devDependencies: { '@vitejs/plugin-react': '^4.0.0', vite: '^5.0.0' },
        }, null, 2),
      },
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>Shop</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>`,
      },
      {
        path: 'src/main.jsx',
        content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')).render(<App />)`,
      },
      {
        path: 'src/context/CartContext.jsx',
        content: `import { createContext, useContext, useReducer } from 'react'

const CartContext = createContext(null)

function cartReducer(state, action) {
  switch (action.type) {
    case 'ADD': {
      const existing = state.find(i => i.id === action.item.id)
      if (existing) return state.map(i => i.id === action.item.id ? { ...i, qty: i.qty + 1 } : i)
      return [...state, { ...action.item, qty: 1 }]
    }
    case 'REMOVE': return state.filter(i => i.id !== action.id)
    case 'INC': return state.map(i => i.id === action.id ? { ...i, qty: i.qty + 1 } : i)
    case 'DEC': return state.map(i => i.id === action.id ? { ...i, qty: Math.max(1, i.qty - 1) } : i)
    default: return state
  }
}

export function CartProvider({ children }) {
  const [cart, dispatch] = useReducer(cartReducer, [])
  const addToCart = (item) => dispatch({ type: 'ADD', item })
  const removeFromCart = (id) => dispatch({ type: 'REMOVE', id })
  const total = cart.reduce((sum, i) => sum + i.price * i.qty, 0)
  return <CartContext.Provider value={{ cart, addToCart, removeFromCart, total }}>{children}</CartContext.Provider>
}

export const useCart = () => useContext(CartContext)`,
      },
      {
        path: 'src/App.jsx',
        content: `import { useState } from 'react'
import { CartProvider } from './context/CartContext.jsx'
import ProductGrid from './components/ProductGrid.jsx'
import CartSidebar from './components/CartSidebar.jsx'

export default function App() {
  const [cartOpen, setCartOpen] = useState(false)
  return (
    <CartProvider>
      <div className="app">
        <header className="header">
          <h1>🛍️ Shop</h1>
          <button className="cart-btn" onClick={() => setCartOpen(o => !o)}>🛒 Cart</button>
        </header>
        <div className="layout">
          <ProductGrid />
          {cartOpen && <CartSidebar onClose={() => setCartOpen(false)} />}
        </div>
      </div>
    </CartProvider>
  )
}`,
      },
      {
        path: 'src/components/ProductGrid.jsx',
        content: `import { useCart } from '../context/CartContext.jsx'

const PRODUCTS = [
  { id: 1, name: 'Wireless Headphones', price: 79.99, image: '🎧', category: 'Electronics' },
  { id: 2, name: 'Running Shoes', price: 129.99, image: '👟', category: 'Sports' },
  { id: 3, name: 'Coffee Mug', price: 19.99, image: '☕', category: 'Kitchen' },
  { id: 4, name: 'Notebook', price: 12.99, image: '📓', category: 'Stationery' },
  { id: 5, name: 'Sunglasses', price: 59.99, image: '🕶️', category: 'Accessories' },
  { id: 6, name: 'Backpack', price: 89.99, image: '🎒', category: 'Bags' },
]

export default function ProductGrid() {
  const { addToCart } = useCart()
  return (
    <div className="product-grid">
      {PRODUCTS.map(p => (
        <div key={p.id} className="product-card">
          <span className="product-image">{p.image}</span>
          <div className="product-info">
            <p className="product-category">{p.category}</p>
            <h3>{p.name}</h3>
            <p className="product-price">\${p.price.toFixed(2)}</p>
          </div>
          <button className="add-btn" onClick={() => addToCart(p)}>Add to cart</button>
        </div>
      ))}
    </div>
  )
}`,
      },
      {
        path: 'src/components/CartSidebar.jsx',
        content: `import { useCart } from '../context/CartContext.jsx'

export default function CartSidebar({ onClose }) {
  const { cart, removeFromCart, total } = useCart()
  return (
    <aside className="cart-sidebar">
      <div className="cart-header">
        <h2>Your Cart</h2>
        <button onClick={onClose}>✕</button>
      </div>
      {cart.length === 0
        ? <p className="empty-cart">Your cart is empty</p>
        : <>
            <ul className="cart-items">
              {cart.map(item => (
                <li key={item.id} className="cart-item">
                  <span>{item.image} {item.name}</span>
                  <span>×{item.qty}</span>
                  <span>\${(item.price * item.qty).toFixed(2)}</span>
                  <button onClick={() => removeFromCart(item.id)}>×</button>
                </li>
              ))}
            </ul>
            <div className="cart-footer">
              <p>Total: <strong>\${total.toFixed(2)}</strong></p>
              <button className="checkout-btn">Checkout</button>
            </div>
          </>
      }
    </aside>
  )
}`,
      },
      {
        path: 'src/index.css',
        content: `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui; background: #f8fafc; }
.header { background: white; padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; position: sticky; top: 0; z-index: 10; }
.header h1 { font-size: 1.5rem; }
.cart-btn { padding: 0.5rem 1.25rem; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.95rem; }
.layout { display: flex; position: relative; }
.product-grid { flex: 1; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.5rem; padding: 2rem; }
.product-card { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #e2e8f0; display: flex; flex-direction: column; gap: 0.75rem; }
.product-image { font-size: 3rem; text-align: center; }
.product-category { font-size: 0.75rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
.product-card h3 { font-size: 1rem; font-weight: 600; }
.product-price { font-size: 1.25rem; font-weight: 700; color: #6366f1; }
.add-btn { margin-top: auto; padding: 0.625rem; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-size: 0.9rem; }
.cart-sidebar { width: 360px; background: white; border-left: 1px solid #e2e8f0; padding: 1.5rem; height: calc(100vh - 64px); position: sticky; top: 64px; overflow-y: auto; }
.cart-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.cart-header button { background: none; border: none; font-size: 1.25rem; cursor: pointer; color: #94a3b8; }
.empty-cart { color: #94a3b8; text-align: center; margin-top: 2rem; }
.cart-items { list-style: none; display: flex; flex-direction: column; gap: 1rem; }
.cart-item { display: flex; align-items: center; gap: 0.75rem; font-size: 0.9rem; }
.cart-item span:first-child { flex: 1; }
.cart-item button { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1rem; }
.cart-footer { margin-top: 2rem; border-top: 1px solid #e2e8f0; padding-top: 1.5rem; }
.cart-footer p { margin-bottom: 1rem; font-size: 1.1rem; }
.checkout-btn { width: 100%; padding: 0.875rem; background: #10b981; color: white; border: none; border-radius: 10px; cursor: pointer; font-size: 1rem; font-weight: 600; }`,
      },
      {
        path: 'vite.config.js',
        content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], server: { host: true, port: 5173 } })`,
      },
    ],
  },

  // ── 7. React Dashboard ───────────────────────────────────────────────────────
  {
    name: 'React Dashboard',
    slug: 'react-dashboard',
    description: 'An admin dashboard template with collapsible sidebar, stats cards, and a sortable data table. Built with React.',
    category: 'dashboard',
    framework: 'react',
    isOfficial: true,
    isPublic: true,
    filesJson: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'react-dashboard',
          version: '1.0.0',
          type: 'module',
          scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
          dependencies: { react: '^18.2.0', 'react-dom': '^18.2.0' },
          devDependencies: { '@vitejs/plugin-react': '^4.0.0', vite: '^5.0.0' },
        }, null, 2),
      },
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>Dashboard</title></head>
  <body><div id="root"></div><script type="module" src="/src/main.jsx"></script></body>
</html>`,
      },
      {
        path: 'src/main.jsx',
        content: `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
ReactDOM.createRoot(document.getElementById('root')).render(<App />)`,
      },
      {
        path: 'src/App.jsx',
        content: `import { useState } from 'react'
import Sidebar from './components/Sidebar.jsx'
import StatsGrid from './components/StatsGrid.jsx'
import DataTable from './components/DataTable.jsx'

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [active, setActive] = useState('overview')

  return (
    <div className="app">
      <Sidebar open={sidebarOpen} active={active} onSelect={setActive} onToggle={() => setSidebarOpen(o => !o)} />
      <div className={\`main \${sidebarOpen ? 'with-sidebar' : ''}\`}>
        <header className="topbar">
          <button className="menu-btn" onClick={() => setSidebarOpen(o => !o)}>☰</button>
          <h1 className="page-title">{active.charAt(0).toUpperCase() + active.slice(1)}</h1>
          <div className="topbar-right">
            <span className="avatar">AU</span>
          </div>
        </header>
        <div className="content">
          <StatsGrid />
          <DataTable />
        </div>
      </div>
    </div>
  )
}`,
      },
      {
        path: 'src/components/Sidebar.jsx',
        content: `const NAV_ITEMS = [
  { id: 'overview', icon: '📊', label: 'Overview' },
  { id: 'analytics', icon: '📈', label: 'Analytics' },
  { id: 'users', icon: '👥', label: 'Users' },
  { id: 'settings', icon: '⚙️', label: 'Settings' },
]

export default function Sidebar({ open, active, onSelect, onToggle }) {
  return (
    <aside className={\`sidebar \${open ? 'open' : 'closed'}\`}>
      <div className="sidebar-logo">
        {open && <span>🚀 Admin</span>}
      </div>
      <nav>
        {NAV_ITEMS.map(item => (
          <button key={item.id} className={\`nav-item \${active === item.id ? 'active' : ''}\`} onClick={() => onSelect(item.id)}>
            <span className="nav-icon">{item.icon}</span>
            {open && <span>{item.label}</span>}
          </button>
        ))}
      </nav>
    </aside>
  )
}`,
      },
      {
        path: 'src/components/StatsGrid.jsx',
        content: `const STATS = [
  { label: 'Total Revenue', value: '$48,295', change: '+12.5%', up: true },
  { label: 'Active Users', value: '3,842', change: '+8.2%', up: true },
  { label: 'Conversions', value: '284', change: '-2.1%', up: false },
  { label: 'Avg. Session', value: '4m 32s', change: '+0.8%', up: true },
]

export default function StatsGrid() {
  return (
    <div className="stats-grid">
      {STATS.map(s => (
        <div key={s.label} className="stat-card">
          <p className="stat-label">{s.label}</p>
          <p className="stat-value">{s.value}</p>
          <p className={\`stat-change \${s.up ? 'up' : 'down'}\`}>{s.change}</p>
        </div>
      ))}
    </div>
  )
}`,
      },
      {
        path: 'src/components/DataTable.jsx',
        content: `import { useState } from 'react'

const DATA = [
  { id: 1, name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', status: 'Active', joined: '2024-01-15' },
  { id: 2, name: 'Bob Smith', email: 'bob@example.com', role: 'Editor', status: 'Active', joined: '2024-02-01' },
  { id: 3, name: 'Carol White', email: 'carol@example.com', role: 'Viewer', status: 'Inactive', joined: '2024-03-10' },
  { id: 4, name: 'David Brown', email: 'david@example.com', role: 'Editor', status: 'Active', joined: '2024-03-22' },
  { id: 5, name: 'Eve Davis', email: 'eve@example.com', role: 'Admin', status: 'Active', joined: '2024-04-05' },
]

export default function DataTable() {
  const [sortKey, setSortKey] = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  const sorted = [...DATA].sort((a, b) => {
    const cmp = a[sortKey].localeCompare(b[sortKey])
    return sortDir === 'asc' ? cmp : -cmp
  })

  const handleSort = (key) => {
    if (key === sortKey) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  return (
    <div className="table-container">
      <h2 className="table-title">Users</h2>
      <table className="data-table">
        <thead>
          <tr>
            {['name', 'email', 'role', 'status', 'joined'].map(col => (
              <th key={col} onClick={() => handleSort(col)} className="sortable">
                {col.charAt(0).toUpperCase() + col.slice(1)} {sortKey === col ? (sortDir === 'asc' ? '↑' : '↓') : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(row => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td className="secondary">{row.email}</td>
              <td><span className="badge">{row.role}</span></td>
              <td><span className={\`status \${row.status.toLowerCase()}\`}>{row.status}</span></td>
              <td className="secondary">{row.joined}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}`,
      },
      {
        path: 'src/index.css',
        content: `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui; background: #f1f5f9; color: #1e293b; }
.app { display: flex; height: 100vh; }
.sidebar { background: #1e293b; color: white; display: flex; flex-direction: column; transition: width 0.3s; overflow: hidden; }
.sidebar.open { width: 240px; }
.sidebar.closed { width: 64px; }
.sidebar-logo { padding: 1.25rem; font-size: 1.1rem; font-weight: 700; border-bottom: 1px solid rgba(255,255,255,0.1); height: 64px; display: flex; align-items: center; }
.nav-item { width: 100%; display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1.25rem; background: none; border: none; color: rgba(255,255,255,0.7); cursor: pointer; font-size: 0.95rem; text-align: left; transition: background 0.2s; white-space: nowrap; }
.nav-item:hover { background: rgba(255,255,255,0.1); color: white; }
.nav-item.active { background: rgba(99,102,241,0.3); color: white; }
.nav-icon { font-size: 1.1rem; min-width: 20px; }
.main { flex: 1; display: flex; flex-direction: column; overflow: auto; }
.topbar { height: 64px; background: white; border-bottom: 1px solid #e2e8f0; display: flex; align-items: center; padding: 0 1.5rem; gap: 1rem; position: sticky; top: 0; z-index: 10; }
.menu-btn { background: none; border: none; font-size: 1.25rem; cursor: pointer; padding: 0.5rem; border-radius: 6px; }
.page-title { font-size: 1.25rem; font-weight: 600; }
.topbar-right { margin-left: auto; }
.avatar { width: 36px; height: 36px; background: #6366f1; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.8rem; font-weight: 600; }
.content { padding: 2rem; display: flex; flex-direction: column; gap: 2rem; }
.stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1.25rem; }
.stat-card { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #e2e8f0; }
.stat-label { font-size: 0.85rem; color: #94a3b8; margin-bottom: 0.5rem; }
.stat-value { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.25rem; }
.stat-change { font-size: 0.85rem; font-weight: 500; }
.stat-change.up { color: #10b981; }
.stat-change.down { color: #ef4444; }
.table-container { background: white; border-radius: 12px; padding: 1.5rem; border: 1px solid #e2e8f0; }
.table-title { font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; }
.data-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
.data-table th { text-align: left; padding: 0.75rem; border-bottom: 2px solid #e2e8f0; color: #64748b; font-weight: 600; }
.sortable { cursor: pointer; }
.sortable:hover { color: #6366f1; }
.data-table td { padding: 0.75rem; border-bottom: 1px solid #f1f5f9; }
.secondary { color: #94a3b8; }
.badge { padding: 0.2rem 0.6rem; background: #f1f5f9; border-radius: 4px; font-size: 0.8rem; }
.status { padding: 0.2rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-weight: 500; }
.status.active { background: #dcfce7; color: #16a34a; }
.status.inactive { background: #fef2f2; color: #dc2626; }`,
      },
      {
        path: 'vite.config.js',
        content: `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
export default defineConfig({ plugins: [react()], server: { host: true, port: 5173 } })`,
      },
    ],
  },

  // ── 8. Fastify REST API ──────────────────────────────────────────────────────
  {
    name: 'Fastify REST API',
    slug: 'fastify-rest-api',
    description: 'A production-ready REST API built with Fastify, TypeScript, Zod validation, and in-memory CRUD. Includes health check and error handling.',
    category: 'api',
    framework: 'node',
    isOfficial: true,
    isPublic: true,
    filesJson: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'fastify-rest-api',
          version: '1.0.0',
          type: 'module',
          scripts: { dev: 'tsx watch src/server.ts', build: 'tsc', start: 'node dist/server.js' },
          dependencies: {
            fastify: '^4.28.0',
            '@fastify/cors': '^9.0.0',
            '@fastify/swagger': '^8.14.0',
            '@fastify/swagger-ui': '^4.0.0',
            zod: '^3.23.0',
            'zod-to-json-schema': '^3.23.0',
          },
          devDependencies: { typescript: '^5.5.0', tsx: '^4.16.0', '@types/node': '^20.0.0' },
        }, null, 2),
      },
      {
        path: 'src/server.ts',
        content: `import Fastify from 'fastify'
import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { itemRoutes } from './routes/items.js'

const app = Fastify({ logger: { level: 'info' } })

// CORS — allow all origins in development
await app.register(cors, { origin: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] })

// OpenAPI spec + Swagger UI
await app.register(swagger, {
  openapi: {
    info: { title: 'Fastify REST API', description: 'CRUD API with Zod validation', version: '1.0.0' },
    tags: [{ name: 'items', description: 'Item management' }, { name: 'system', description: 'System endpoints' }],
  },
})
await app.register(swaggerUi, { routePrefix: '/docs' })

// Routes
await app.register(itemRoutes, { prefix: '/api/v1' })

// Expose spec at /openapi.json for the Forge API Explorer
app.get('/openapi.json', { schema: { hide: true } }, () => app.swagger())

app.get('/health', {
  schema: {
    tags: ['system'],
    summary: 'Health check',
    response: { 200: { type: 'object', properties: { status: { type: 'string' }, timestamp: { type: 'string' } } } },
  },
}, () => ({ status: 'ok', timestamp: new Date().toISOString() }))

app.setErrorHandler((error, _request, reply) => {
  app.log.error(error)
  reply.status(error.statusCode ?? 500).send({
    success: false,
    error: { code: error.code ?? 'INTERNAL_ERROR', message: error.message },
  })
})

const port = Number(process.env.PORT ?? 5173)
await app.listen({ port, host: '0.0.0.0' })
app.log.info(\`Server listening on http://0.0.0.0:\${port}\`)
app.log.info(\`Swagger UI: http://localhost:\${port}/docs\`)`,
      },
      {
        path: 'src/routes/items.ts',
        content: `import type { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { randomUUID } from 'crypto'

const CreateItemSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
})

const UpdateItemSchema = CreateItemSchema.partial()

interface Item { id: string; name: string; description?: string; price: number; createdAt: string }

// Pre-seeded sample data so GET /api/v1/items returns results immediately
const SEED_ITEMS: Item[] = [
  { id: 'a1b2c3d4-0001-4000-8000-000000000001', name: 'Widget Pro', description: 'A high-quality widget for professionals', price: 29.99, createdAt: '2024-01-15T09:00:00.000Z' },
  { id: 'a1b2c3d4-0002-4000-8000-000000000002', name: 'Gadget Plus', description: 'Advanced gadget with extended features', price: 49.99, createdAt: '2024-01-16T10:30:00.000Z' },
  { id: 'a1b2c3d4-0003-4000-8000-000000000003', name: 'Starter Pack', description: 'Perfect bundle for getting started', price: 9.99, createdAt: '2024-01-17T14:00:00.000Z' },
]

const db = new Map<string, Item>(SEED_ITEMS.map(i => [i.id, i]))

// Shared response schema fragments
const ItemSchema = {
  type: 'object',
  properties: {
    id: { type: 'string', example: 'a1b2c3d4-0001-4000-8000-000000000001' },
    name: { type: 'string', example: 'Widget Pro' },
    description: { type: 'string', example: 'A high-quality widget for professionals' },
    price: { type: 'number', example: 29.99 },
    createdAt: { type: 'string', format: 'date-time', example: '2024-01-15T09:00:00.000Z' },
  },
}

const ErrorSchema = {
  type: 'object',
  properties: {
    success: { type: 'boolean', example: false },
    error: {
      type: 'object',
      properties: {
        code: { type: 'string', example: 'NOT_FOUND' },
        message: { type: 'string', example: 'The requested resource was not found' },
      },
      required: ['code', 'message'],
    },
  },
}

const R400 = { description: 'Bad Request — validation failed', ...ErrorSchema }
const R404 = { description: 'Not Found — item does not exist', ...ErrorSchema }
const R500 = { description: 'Internal Server Error', ...ErrorSchema }

export async function itemRoutes(app: FastifyInstance) {
  // GET /items
  app.get('/items', {
    schema: {
      tags: ['items'],
      summary: 'List all items',
      description: 'Returns the full list of items in the store.',
      response: {
        200: {
          description: 'Success',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'array', items: ItemSchema },
          },
        },
        500: R500,
      },
    },
  }, async () => {
    return { success: true, data: Array.from(db.values()) }
  })

  // GET /items/:id
  app.get<{ Params: { id: string } }>('/items/:id', {
    schema: {
      tags: ['items'],
      summary: 'Get item by ID',
      description: 'Returns a single item by its UUID.',
      params: { type: 'object', properties: { id: { type: 'string', example: 'a1b2c3d4-0001-4000-8000-000000000001' } }, required: ['id'] },
      response: {
        200: {
          description: 'Success',
          type: 'object',
          properties: { success: { type: 'boolean', example: true }, data: ItemSchema },
        },
        404: R404,
        500: R500,
      },
    },
  }, async (request, reply) => {
    const item = db.get(request.params.id)
    if (!item) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } })
    return { success: true, data: item }
  })

  // POST /items
  app.post('/items', {
    schema: {
      tags: ['items'],
      summary: 'Create a new item',
      description: 'Creates a new item. \`name\` and \`price\` are required.',
      body: {
        type: 'object',
        required: ['name', 'price'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100, example: 'New Widget' },
          description: { type: 'string', maxLength: 500, example: 'A brand new widget' },
          price: { type: 'number', minimum: 0, example: 19.99 },
        },
      },
      response: {
        201: {
          description: 'Created successfully',
          type: 'object',
          properties: { success: { type: 'boolean', example: true }, data: ItemSchema },
        },
        400: R400,
        500: R500,
      },
    },
  }, async (request, reply) => {
    const result = CreateItemSchema.safeParse(request.body)
    if (!result.success) return reply.code(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: result.error.message } })
    const item: Item = { id: randomUUID(), ...result.data, createdAt: new Date().toISOString() }
    db.set(item.id, item)
    return reply.code(201).send({ success: true, data: item })
  })

  // PATCH /items/:id
  app.patch<{ Params: { id: string } }>('/items/:id', {
    schema: {
      tags: ['items'],
      summary: 'Update an item',
      description: 'Partially updates an existing item. All fields are optional.',
      params: { type: 'object', properties: { id: { type: 'string', example: 'a1b2c3d4-0001-4000-8000-000000000001' } }, required: ['id'] },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 100, example: 'Updated Name' },
          description: { type: 'string', maxLength: 500, example: 'Updated description' },
          price: { type: 'number', minimum: 0, example: 34.99 },
        },
      },
      response: {
        200: {
          description: 'Updated successfully',
          type: 'object',
          properties: { success: { type: 'boolean', example: true }, data: ItemSchema },
        },
        400: R400,
        404: R404,
        500: R500,
      },
    },
  }, async (request, reply) => {
    const item = db.get(request.params.id)
    if (!item) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } })
    const result = UpdateItemSchema.safeParse(request.body)
    if (!result.success) return reply.code(400).send({ success: false, error: { code: 'VALIDATION_ERROR', message: result.error.message } })
    const updated = { ...item, ...result.data }
    db.set(item.id, updated)
    return { success: true, data: updated }
  })

  // DELETE /items/:id
  app.delete<{ Params: { id: string } }>('/items/:id', {
    schema: {
      tags: ['items'],
      summary: 'Delete an item',
      description: 'Permanently removes an item from the store.',
      params: { type: 'object', properties: { id: { type: 'string', example: 'a1b2c3d4-0001-4000-8000-000000000001' } }, required: ['id'] },
      response: {
        200: {
          description: 'Deleted successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            data: { type: 'object', properties: { message: { type: 'string', example: 'Deleted' } } },
          },
        },
        404: R404,
        500: R500,
      },
    },
  }, async (request, reply) => {
    if (!db.has(request.params.id)) return reply.code(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Item not found' } })
    db.delete(request.params.id)
    return { success: true, data: { message: 'Deleted' } }
  })
}`,
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'ES2022',
            module: 'NodeNext',
            moduleResolution: 'NodeNext',
            outDir: './dist',
            strict: true,
            esModuleInterop: true,
          },
          include: ['src'],
        }, null, 2),
      },
    ],
  },

  // ── 9. Vue 3 App ─────────────────────────────────────────────────────────────
  {
    name: 'Vue 3 Starter',
    slug: 'vue3-app',
    description: 'A Vue 3 starter app using Composition API with a reactive counter and a persistent todo list.',
    category: 'starter',
    framework: 'vue',
    isOfficial: true,
    isPublic: true,
    filesJson: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'vue3-app',
          version: '1.0.0',
          type: 'module',
          scripts: { dev: 'vite', build: 'vite build', preview: 'vite preview' },
          dependencies: { vue: '^3.4.0', pinia: '^2.1.0' },
          devDependencies: { '@vitejs/plugin-vue': '^5.0.0', vite: '^5.0.0', typescript: '^5.5.0', 'vue-tsc': '^2.0.0' },
        }, null, 2),
      },
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>Vue 3 App</title></head>
  <body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>
</html>`,
      },
      {
        path: 'src/main.ts',
        content: `import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'

const app = createApp(App)
app.use(createPinia())
app.mount('#app')`,
      },
      {
        path: 'src/App.vue',
        content: `<script setup lang="ts">
import Counter from './components/Counter.vue'
import TodoList from './components/TodoList.vue'
</script>

<template>
  <div class="app">
    <h1>Vue 3 Starter ⚡</h1>
    <Counter />
    <hr />
    <TodoList />
  </div>
</template>

<style scoped>
.app { max-width: 500px; margin: 2rem auto; padding: 2rem; background: white; border-radius: 12px; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
h1 { font-size: 1.75rem; margin-bottom: 1.5rem; color: #1e293b; }
hr { border: none; border-top: 1px solid #e2e8f0; margin: 2rem 0; }
</style>`,
      },
      {
        path: 'src/components/Counter.vue',
        content: `<script setup lang="ts">
import { ref, computed } from 'vue'

const count = ref(0)
const isNegative = computed(() => count.value < 0)

const increment = () => count.value++
const decrement = () => count.value--
const reset = () => { count.value = 0 }
</script>

<template>
  <div class="counter">
    <h2>Counter</h2>
    <p class="count" :class="{ negative: isNegative }">{{ count }}</p>
    <div class="buttons">
      <button @click="decrement">−</button>
      <button @click="reset" class="reset">Reset</button>
      <button @click="increment">+</button>
    </div>
  </div>
</template>

<style scoped>
.counter { text-align: center; }
h2 { margin-bottom: 1rem; font-size: 1.1rem; color: #64748b; }
.count { font-size: 3.5rem; font-weight: 700; color: #6366f1; margin: 1rem 0; transition: color 0.2s; }
.count.negative { color: #ef4444; }
.buttons { display: flex; gap: 0.75rem; justify-content: center; }
button { padding: 0.5rem 1.5rem; border: none; border-radius: 8px; background: #6366f1; color: white; font-size: 1.1rem; cursor: pointer; transition: background 0.2s; }
button:hover { background: #4f46e5; }
button.reset { background: #e2e8f0; color: #1e293b; }
button.reset:hover { background: #cbd5e1; }
</style>`,
      },
      {
        path: 'src/components/TodoList.vue',
        content: `<script setup lang="ts">
import { ref } from 'vue'
import { useTodoStore } from '../stores/todo.js'

const store = useTodoStore()
const input = ref('')

const add = () => {
  if (input.value.trim()) {
    store.addTodo(input.value.trim())
    input.value = ''
  }
}
</script>

<template>
  <div class="todos">
    <h2>Todo List</h2>
    <form @submit.prevent="add" class="add-form">
      <input v-model="input" placeholder="Add a task..." />
      <button type="submit">Add</button>
    </form>
    <ul>
      <li v-for="todo in store.todos" :key="todo.id" :class="{ done: todo.done }">
        <span @click="store.toggle(todo.id)">{{ todo.text }}</span>
        <button @click="store.remove(todo.id)">×</button>
      </li>
    </ul>
    <p class="summary" v-if="store.todos.length">{{ store.remaining }} remaining</p>
  </div>
</template>

<style scoped>
h2 { font-size: 1.1rem; color: #64748b; margin-bottom: 1rem; }
.add-form { display: flex; gap: 0.5rem; margin-bottom: 1rem; }
.add-form input { flex: 1; padding: 0.5rem 0.75rem; border: 2px solid #e2e8f0; border-radius: 8px; font-size: 0.95rem; }
.add-form button { padding: 0.5rem 1rem; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; }
ul { list-style: none; }
li { display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; border-bottom: 1px solid #f1f5f9; }
li span { cursor: pointer; }
li.done span { text-decoration: line-through; color: #94a3b8; }
li button { background: none; border: none; color: #ef4444; cursor: pointer; font-size: 1.1rem; }
.summary { font-size: 0.85rem; color: #94a3b8; text-align: right; margin-top: 0.5rem; }
</style>`,
      },
      {
        path: 'src/stores/todo.ts',
        content: `import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

interface Todo { id: number; text: string; done: boolean }

export const useTodoStore = defineStore('todo', () => {
  const todos = ref<Todo[]>([])
  const remaining = computed(() => todos.value.filter(t => !t.done).length)

  function addTodo(text: string) {
    todos.value.push({ id: Date.now(), text, done: false })
  }

  function toggle(id: number) {
    const t = todos.value.find(t => t.id === id)
    if (t) t.done = !t.done
  }

  function remove(id: number) {
    todos.value = todos.value.filter(t => t.id !== id)
  }

  return { todos, remaining, addTodo, toggle, remove }
})`,
      },
      {
        path: 'src/style.css',
        content: `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui; background: #f0f4ff; min-height: 100vh; padding: 2rem; }`,
      },
      {
        path: 'vite.config.js',
        content: `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
export default defineConfig({ plugins: [vue()], server: { host: true, port: 5173 } })`,
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'ES2020', useDefineForClassFields: true,
            lib: ['ES2020', 'DOM', 'DOM.Iterable'],
            module: 'ESNext', skipLibCheck: true,
            moduleResolution: 'bundler', resolveJsonModule: true,
            isolatedModules: true, noEmit: true, jsx: 'preserve',
            strict: true,
          },
          include: ['src/**/*.ts', 'src/**/*.tsx', 'src/**/*.vue'],
        }, null, 2),
      },
    ],
  },
  {
    name: 'SvelteKit Starter',
    slug: 'svelte-app',
    description: 'A SvelteKit starter with a reactive counter, writable store, and dark mode toggle. Perfect for learning Svelte reactivity.',
    category: 'starter',
    framework: 'svelte',
    isOfficial: true,
    isPublic: true,
    filesJson: [
      {
        path: 'package.json',
        content: JSON.stringify({
          name: 'svelte-app',
          version: '1.0.0',
          type: 'module',
          scripts: { dev: 'vite dev', build: 'vite build', preview: 'vite preview' },
          dependencies: { svelte: '^4.2.0' },
          devDependencies: { '@sveltejs/vite-plugin-svelte': '^3.0.0', vite: '^5.0.0', typescript: '^5.5.0' },
        }, null, 2),
      },
      {
        path: 'index.html',
        content: `<!DOCTYPE html>
<html lang="en">
  <head><meta charset="UTF-8" /><title>Svelte App</title></head>
  <body><div id="app"></div><script type="module" src="/src/main.ts"></script></body>
</html>`,
      },
      {
        path: 'src/main.ts',
        content: `import App from './App.svelte'
import './app.css'

const app = new App({ target: document.getElementById('app')! })
export default app`,
      },
      {
        path: 'src/App.svelte',
        content: `<script lang="ts">
  import Counter from './lib/Counter.svelte'
  import { darkMode } from './stores.js'

  function toggleDark() { $darkMode = !$darkMode }
</script>

<div class="app" class:dark={$darkMode}>
  <header>
    <h1>🔥 SvelteKit Starter</h1>
    <button class="dark-toggle" on:click={toggleDark}>
      {$darkMode ? '☀️ Light' : '🌙 Dark'}
    </button>
  </header>
  <main>
    <Counter />
  </main>
</div>

<style>
  .app { min-height: 100vh; transition: background 0.3s, color 0.3s; }
  .app.dark { background: #0f172a; color: #e2e8f0; }
  header { display: flex; justify-content: space-between; align-items: center; padding: 1rem 2rem; border-bottom: 1px solid rgba(0,0,0,0.1); }
  h1 { font-size: 1.5rem; }
  .dark-toggle { padding: 0.4rem 1rem; border: 1px solid currentColor; border-radius: 6px; background: transparent; color: inherit; cursor: pointer; font-size: 0.875rem; }
  main { max-width: 400px; margin: 3rem auto; padding: 0 1rem; }
</style>`,
      },
      {
        path: 'src/lib/Counter.svelte',
        content: `<script lang="ts">
  import { writable } from 'svelte/store'

  const count = writable(0)
  const history: number[] = []

  function increment() { count.update(n => { history.push(n); return n + 1 }) }
  function decrement() { count.update(n => { history.push(n); return n - 1 }) }
  function reset() { count.set(0); history.length = 0 }
  function undo() {
    if (history.length > 0) {
      const prev = history.pop()!
      count.set(prev)
    }
  }
</script>

<div class="counter">
  <h2>Counter</h2>
  <p class="value" class:negative={$count < 0}>{$count}</p>
  <div class="controls">
    <button on:click={decrement}>−</button>
    <button on:click={reset} class="reset">Reset</button>
    <button on:click={increment}>+</button>
  </div>
  <button class="undo" on:click={undo} disabled={history.length === 0}>↩ Undo</button>
  {#if history.length > 0}
    <p class="history">Last: {history[history.length - 1]}</p>
  {/if}
</div>

<style>
  .counter { text-align: center; background: rgba(255,255,255,0.05); border: 1px solid rgba(0,0,0,0.1); border-radius: 16px; padding: 2rem; }
  h2 { font-size: 1.1rem; opacity: 0.7; margin-bottom: 1rem; }
  .value { font-size: 5rem; font-weight: 800; color: #6366f1; line-height: 1; margin-bottom: 1.5rem; transition: color 0.2s; }
  .value.negative { color: #ef4444; }
  .controls { display: flex; gap: 0.75rem; justify-content: center; margin-bottom: 1rem; }
  button { padding: 0.5rem 1.5rem; border: none; border-radius: 8px; background: #6366f1; color: white; font-size: 1.1rem; cursor: pointer; transition: background 0.2s; }
  button:hover { background: #4f46e5; }
  button.reset { background: #e2e8f0; color: #1e293b; }
  button.undo { background: transparent; border: 1px solid #94a3b8; color: inherit; font-size: 0.875rem; padding: 0.4rem 1rem; }
  button:disabled { opacity: 0.4; cursor: not-allowed; }
  .history { font-size: 0.85rem; opacity: 0.5; margin-top: 0.5rem; }
</style>`,
      },
      {
        path: 'src/stores.ts',
        content: `import { writable } from 'svelte/store'

export const darkMode = writable(false)
export const notifications = writable<string[]>([])`,
      },
      {
        path: 'src/app.css',
        content: `* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: system-ui, -apple-system, sans-serif; }`,
      },
      {
        path: 'vite.config.js',
        content: `import { defineConfig } from 'vite'
import { svelte, vitePreprocess } from '@sveltejs/vite-plugin-svelte'
export default defineConfig({
  plugins: [svelte({ preprocess: vitePreprocess() })],
  server: { host: true, port: 5173 },
})`,
      },
      {
        path: 'tsconfig.json',
        content: JSON.stringify({
          compilerOptions: {
            target: 'ES2017', lib: ['ES2017', 'DOM', 'DOM.Iterable'],
            module: 'ESNext', moduleResolution: 'bundler',
            resolveJsonModule: true, isolatedModules: true,
            noEmit: true, strict: true, skipLibCheck: true,
          },
          include: ['src/**/*.ts', 'src/**/*.svelte'],
        }, null, 2),
      },
    ],
  },
]
