export const metadata = {
  title: 'Supported Frameworks',
  description: 'Forge AI supports a wide range of frontend and backend frameworks.',
}

import { Callout } from '../../_components/Callout'

export default function SupportedFrameworksPage() {
  return (
    <div>
      <h1>Supported Frameworks</h1>

      <p>
        Forge AI can scaffold, run, and iterate on projects across a wide range of frontend and
        backend frameworks. The live preview runs your chosen framework natively — there is no
        conversion layer.
      </p>

      <h2>Frontend frameworks</h2>

      <h3>React</h3>
      <p>
        The most popular choice for UI-heavy apps, dashboards, component libraries, and anything
        requiring a rich client-side experience. Works with Vite, Next.js, or Create React App.
      </p>

      <h3>Next.js</h3>
      <p>
        Full-stack React with App Router or Pages Router. Great for content sites, SaaS apps, and
        anything that benefits from server-side rendering or API routes in one project. See the{' '}
        <a href="/docs/guides/building-nextjs">Next.js guide</a>.
      </p>

      <h3>Vue 3</h3>
      <p>
        Progressive JavaScript framework with Composition API and Vite. Ideal for interactive UIs
        and single-page applications with a gentle learning curve. See the{' '}
        <a href="/docs/guides/building-vue">Vue guide</a>.
      </p>

      <h3>SvelteKit</h3>
      <p>
        Fast, lightweight framework with a compiler-based approach. No virtual DOM. Good for
        performance-critical apps and leaner bundles. See the{' '}
        <a href="/docs/guides/building-svelte">SvelteKit guide</a>.
      </p>

      <h3>Angular</h3>
      <p>
        Enterprise-grade framework with TypeScript-first design, a strong component model, and
        Angular Material for UI. Great for large-scale apps with strict structure requirements.
        See the <a href="/docs/guides/building-angular">Angular guide</a>.
      </p>

      <h3>Flutter Web</h3>
      <p>
        Build pixel-perfect, cross-platform UIs in Dart that compile to web, iOS, and Android from
        a single codebase. See the <a href="/docs/guides/building-flutter">Flutter guide</a>.
      </p>

      <h3>Plain HTML / CSS / JavaScript</h3>
      <p>
        Static sites, landing pages, and simple demos. No build step required.
      </p>

      <h2>Backend</h2>

      <h3>Node.js (TypeScript)</h3>
      <p>
        Server-side TypeScript with REST or tRPC API routes. Forge AI generates typed API routes
        with request validation and connects them to your database automatically.
      </p>

      <h2>Database</h2>
      <p>
        Forge AI generates type-safe database schemas, migrations, and query helpers for
        relational databases. Tables, relations, and migrations are kept in sync with your API
        layer.
      </p>

      <h2>Choosing a framework</h2>
      <Callout type="tip">
        When you create a new project from a template, the framework is pre-selected. You can
        also start a blank project and ask Forge AI: <em>"Set up a Vue 3 app with Vite and
        Tailwind CSS."</em>
      </Callout>

      <p>
        If you are unsure which framework to pick:
      </p>
      <ul>
        <li><strong>SaaS product</strong> — Next.js or React</li>
        <li><strong>Marketing site or landing page</strong> — Next.js, SvelteKit, or plain HTML</li>
        <li><strong>Admin dashboard</strong> — React or Angular</li>
        <li><strong>Mobile + Web from one codebase</strong> — Flutter</li>
        <li><strong>Enterprise app with strict structure</strong> — Angular</li>
        <li><strong>Fastest possible bundle size</strong> — SvelteKit</li>
      </ul>
    </div>
  )
}
