import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'

export const metadata: Metadata = {
  title: 'Supported Frameworks',
  description: 'Forge AI can generate, run, and deploy applications in six frontend frameworks and one backend framework.',
}

export default function SupportedFrameworksPage() {
  return (
    <DocsProse>
      <h1>Supported Frameworks</h1>
      <p className="lead">
        Forge AI can generate, run, and deploy applications in six frontend frameworks
        and one backend framework.
      </p>

      <h2>Frontend frameworks</h2>

      <h3>React</h3>
      <p>
        React 18 with Vite 5, TypeScript, and Tailwind CSS. The most popular choice on
        Forge AI — 5 templates available. Best for: single-page applications, component
        libraries, dashboards, and anything that pairs well with a Fastify backend.
      </p>

      <h3>Next.js</h3>
      <p>
        Next.js 14 with the App Router, TypeScript, and Tailwind CSS. 2 templates
        available (SaaS Starter and Blog). Best for: full-stack SaaS applications,
        marketing sites, and projects that need server-side rendering or API routes in
        the same codebase.
      </p>

      <h3>Vue 3</h3>
      <p>
        Vue 3 Composition API with Vite and TypeScript. 1 template available. Best for:
        interactive UIs and teams with existing Vue expertise who want to move quickly
        without switching frameworks.
      </p>

      <h3>SvelteKit</h3>
      <p>
        SvelteKit with <code>adapter-auto</code> and TypeScript. 1 template available.
        Best for: high-performance marketing sites, minimal-bundle-size applications, and
        developers who enjoy Svelte's reactive model.
      </p>

      <h3>Angular</h3>
      <p>
        Angular 18 with standalone components, Angular Material, and the new Signals
        reactive model. 3 templates available (Angular Starter, Angular Material
        Dashboard, Angular Signals App). Best for: enterprise applications, large
        development teams, and projects that benefit from Angular's strong conventions
        and tooling.
      </p>

      <h3>Flutter Web</h3>
      <p>
        Flutter 3 with Dart, including a WebAssembly (WASM) canvas variant for
        graphics-heavy applications. 3 templates available (Flutter Starter, Flutter Web
        Dashboard, Flutter WASM Canvas). Best for: cross-platform applications, teams
        with Dart experience, and canvas-heavy or animation-rich applications.
      </p>

      <h2>Backend</h2>

      <h3>Node.js (Fastify)</h3>
      <p>
        Fastify 4 with TypeScript, Drizzle ORM, and PostgreSQL. This is the backend
        framework used throughout the Forge AI platform itself. Best for: REST APIs,
        server-side business logic, and full-stack projects that pair with any of the
        frontend frameworks above.
      </p>

      <h2>Build tools</h2>
      <table>
        <thead>
          <tr>
            <th>Framework</th>
            <th>Build tool</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>React</td>
            <td>Vite 5</td>
          </tr>
          <tr>
            <td>Vue 3</td>
            <td>Vite 5</td>
          </tr>
          <tr>
            <td>SvelteKit</td>
            <td>Vite (via SvelteKit)</td>
          </tr>
          <tr>
            <td>Next.js</td>
            <td>Next.js build (Turbopack in dev)</td>
          </tr>
          <tr>
            <td>Angular</td>
            <td>Angular CLI (esbuild)</td>
          </tr>
          <tr>
            <td>Flutter Web</td>
            <td>Flutter Web compiler (WASM variant available)</td>
          </tr>
        </tbody>
      </table>

      <h2>Styling support</h2>
      <table>
        <thead>
          <tr>
            <th>Framework</th>
            <th>Styling options</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>React</td>
            <td>Tailwind CSS, CSS Modules, vanilla CSS</td>
          </tr>
          <tr>
            <td>Next.js</td>
            <td>Tailwind CSS, CSS Modules, vanilla CSS</td>
          </tr>
          <tr>
            <td>Vue 3</td>
            <td>Tailwind CSS, scoped CSS</td>
          </tr>
          <tr>
            <td>SvelteKit</td>
            <td>Tailwind CSS, scoped CSS</td>
          </tr>
          <tr>
            <td>Angular</td>
            <td>Angular Material, Tailwind CSS, SCSS</td>
          </tr>
          <tr>
            <td>Flutter Web</td>
            <td>Flutter Material 3, custom themes</td>
          </tr>
        </tbody>
      </table>

      <h2>Deployment compatibility</h2>
      <table>
        <thead>
          <tr>
            <th>Framework</th>
            <th>Vercel</th>
            <th>Netlify</th>
            <th>Cloudflare Pages</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>React</td>
            <td>✅</td>
            <td>✅</td>
            <td>✅</td>
          </tr>
          <tr>
            <td>Next.js</td>
            <td>✅</td>
            <td>✅</td>
            <td>✅</td>
          </tr>
          <tr>
            <td>Vue 3</td>
            <td>✅</td>
            <td>✅</td>
            <td>✅</td>
          </tr>
          <tr>
            <td>SvelteKit</td>
            <td>✅</td>
            <td>✅</td>
            <td>✅</td>
          </tr>
          <tr>
            <td>Angular</td>
            <td>✅</td>
            <td>✅</td>
            <td>✅</td>
          </tr>
          <tr>
            <td>Flutter Web</td>
            <td>⚠️ requires config</td>
            <td>✅</td>
            <td>✅</td>
          </tr>
          <tr>
            <td>Flutter WASM</td>
            <td>⚠️ requires config</td>
            <td>✅</td>
            <td>✅</td>
          </tr>
        </tbody>
      </table>

      <Callout type="info">
        Flutter Web deployments to Vercel require a custom build command configuration
        in the Vercel project settings. Netlify and Cloudflare Pages deploy Flutter Web
        without additional configuration.
      </Callout>
    </DocsProse>
  )
}
