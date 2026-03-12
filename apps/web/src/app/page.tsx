import Link from 'next/link'

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-forge-500 rounded-lg flex items-center justify-center font-bold text-white text-sm">F</div>
          <span className="font-semibold text-lg">Forge AI</span>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-gray-400 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link
            href="/login"
            className="text-sm px-4 py-2 bg-forge-500 hover:bg-forge-600 text-white rounded-lg transition-colors font-medium"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-forge-950 border border-forge-800 rounded-full text-sm text-forge-300">
          <span className="w-2 h-2 bg-forge-400 rounded-full animate-pulse" />
          Now in private beta
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight max-w-4xl">
          Build full-stack apps
          <br />
          <span className="text-forge-400">with plain English</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-400 max-w-2xl">
          Describe what you want. Forge AI generates production-ready React apps, handles the
          database, API, and deploys to your favourite platform — in minutes.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/login"
            className="px-8 py-4 bg-forge-500 hover:bg-forge-600 text-white rounded-xl text-lg font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            Start building for free
          </Link>
          <a
            href="#demo"
            className="px-8 py-4 border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white rounded-xl text-lg font-semibold transition-colors"
          >
            See a demo
          </a>
        </div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full mt-12">
          {[
            { icon: '⚡', title: 'Instant preview', desc: 'See your app running in the browser as it builds — no setup required.' },
            { icon: '🤖', title: 'AI-powered', desc: 'Claude 3.5, Gemini, and GPT-4 work in concert to generate the best code.' },
            { icon: '🚀', title: 'One-click deploy', desc: 'Push to Vercel, Netlify, or Cloudflare Pages with a single click.' },
          ].map(f => (
            <div key={f.title} className="p-6 rounded-xl border border-gray-800 bg-gray-900/50 text-left">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-gray-400">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 px-6 text-center text-sm text-gray-600">
        © {new Date().getFullYear()} Forge AI. All rights reserved.
      </footer>
    </main>
  )
}
