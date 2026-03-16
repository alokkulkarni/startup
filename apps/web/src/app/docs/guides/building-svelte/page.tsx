export const metadata = {
  title: 'Building with Svelte',
  description: 'Build a fast, lean SvelteKit application with Forge AI.',
}

import { Callout } from '../../_components/Callout'
import { Steps, Step } from '../../_components/Steps'

export default function BuildingSveltePage() {
  return (
    <div>
      <h1>Building with SvelteKit</h1>

      <p>
        SvelteKit is a fast, compiler-based framework with no virtual DOM. It produces leaner
        JavaScript bundles than most other frameworks and has a clean, intuitive component model.
        Forge AI scaffolds SvelteKit projects with TypeScript and Tailwind CSS.
      </p>

      <h2>What you will build</h2>
      <ul>
        <li>SvelteKit app with file-based routing</li>
        <li>Server-side data loading with <code>+page.server.ts</code></li>
        <li>Form actions for mutation without JavaScript</li>
        <li>Svelte stores for shared state</li>
        <li>Tailwind CSS for styling</li>
      </ul>

      <h2>Getting started</h2>
      <Steps>
        <Step title="Create a new project">
          Click <strong>New project</strong> and select the <strong>SvelteKit</strong> template.
          Forge AI sets up <code>svelte.config.js</code>, <code>src/routes/</code>, and Tailwind
          CSS.
        </Step>
        <Step title="Add a route">
          <blockquote>
            "Add a <code>/blog</code> route that loads a list of posts from a local data file and
            displays them as cards."
          </blockquote>
          Forge AI will create <code>src/routes/blog/+page.svelte</code> and{' '}
          <code>src/routes/blog/+page.server.ts</code>.
        </Step>
        <Step title="Add a form action">
          <blockquote>
            "Add a contact form on the <code>/contact</code> page that uses a SvelteKit form
            action to validate and process submissions."
          </blockquote>
        </Step>
        <Step title="Add shared state">
          <blockquote>
            "Create a writable Svelte store for the current user and import it into the navbar
            component."
          </blockquote>
        </Step>
        <Step title="Add an API endpoint">
          <blockquote>
            "Add a <code>/api/posts</code> endpoint that returns the list of blog posts as JSON."
          </blockquote>
        </Step>
        <Step title="Deploy">
          SvelteKit supports multiple adapters. For static hosting (Vercel, Netlify, Cloudflare
          Pages), Forge AI configures the correct adapter automatically.
        </Step>
      </Steps>

      <h2>SvelteKit-specific tips</h2>
      <ul>
        <li>
          <strong>Layouts</strong> — ask: <em>"Add a shared layout with header and footer to all
          routes under <code>/app</code>."</em> Forge AI will create{' '}
          <code>src/routes/app/+layout.svelte</code>.
        </li>
        <li>
          <strong>Progressive enhancement</strong> — SvelteKit form actions work without
          JavaScript. Ask: <em>"Make the contact form work without JavaScript using a form
          action."</em>
        </li>
        <li>
          <strong>Transitions</strong> — Svelte has built-in transitions: <em>"Add a slide
          transition when switching between pages."</em>
        </li>
      </ul>

      <Callout type="tip">
        SvelteKit is excellent for content-heavy sites and marketing pages because it produces
        very small bundles and excellent Core Web Vitals scores.
      </Callout>

      <h2>Common prompts for SvelteKit</h2>
      <table>
        <thead><tr><th>What you want</th><th>Prompt</th></tr></thead>
        <tbody>
          <tr><td>Dynamic route</td><td>"Add a <code>/blog/[slug]</code> route that loads a post by slug from a data file"</td></tr>
          <tr><td>Error page</td><td>"Add a custom <code>+error.svelte</code> that shows a friendly 404 message"</td></tr>
          <tr><td>Hook</td><td>"Add a <code>handle</code> hook in <code>src/hooks.server.ts</code> to log all incoming requests"</td></tr>
          <tr><td>Store</td><td>"Create a <code>cartStore</code> with add, remove, and clear methods"</td></tr>
          <tr><td>SSR opt-out</td><td>"Disable SSR on the <code>/dashboard</code> page so it renders client-side only"</td></tr>
        </tbody>
      </table>
    </div>
  )
}
