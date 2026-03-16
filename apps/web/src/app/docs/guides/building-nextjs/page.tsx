export const metadata = {
  title: 'Building with Next.js',
  description: 'Build a full-stack Next.js App Router application with Forge AI — from scaffold to deployment.',
}

import { Callout } from '../../_components/Callout'
import { Steps, Step } from '../../_components/Steps'

export default function BuildingNextjsPage() {
  return (
    <div>
      <h1>Building with Next.js</h1>

      <p>
        Next.js App Router is the default full-stack choice in Forge AI for applications that need
        server-side rendering, server actions, API routes, and frontend all in one project. This
        guide walks you through building a complete Next.js app from scratch.
      </p>

      <h2>What you will build</h2>
      <p>
        A full-stack Next.js application with:
      </p>
      <ul>
        <li>App Router layout with shared navigation and auth guard</li>
        <li>Server components for data-fetching pages</li>
        <li>Client components for interactive UI</li>
        <li>API routes for backend logic</li>
        <li>Tailwind CSS for styling</li>
        <li>User authentication</li>
      </ul>

      <h2>Getting started</h2>
      <Steps>
        <Step title="Create a new project">
          From the Forge AI dashboard, click <strong>New project</strong> and select the
          <strong>Next.js App Router</strong> template. Give your project a name and click
          <strong>Create</strong>.
        </Step>
        <Step title="Explore the generated structure">
          Forge AI creates a complete Next.js project with{' '}
          <code>app/</code> directory, <code>layout.tsx</code>, <code>page.tsx</code>,{' '}
          <code>tailwind.config.ts</code>, and <code>tsconfig.json</code> already configured.
        </Step>
        <Step title="Add your first page">
          In the chat panel, type:
          <blockquote>
            "Add a <code>/dashboard</code> page with a sidebar, a stats grid showing 4 KPI cards,
            and a recent activity table."
          </blockquote>
          Forge AI will create the route, the layout, and all components.
        </Step>
        <Step title="Add an API route">
          Ask the AI:
          <blockquote>
            "Create a <code>/api/stats</code> route that returns mock KPI data as JSON."
          </blockquote>
          Forge AI will generate a typed API route handler and update the page to fetch from it.
        </Step>
        <Step title="Add authentication">
          Ask:
          <blockquote>
            "Add authentication so only logged-in users can access the dashboard."
          </blockquote>
          Forge AI will wire up an auth guard using middleware and protect all routes under
          <code>/dashboard</code>.
        </Step>
        <Step title="Deploy">
          When you are ready, click <strong>Deploy</strong> in the toolbar and choose Vercel.
          Forge AI will push your project and trigger a Vercel deployment automatically.
        </Step>
      </Steps>

      <h2>Next.js App Router tips</h2>
      <ul>
        <li>
          By default, all components in the <code>app/</code> directory are <strong>Server
          Components</strong>. Add <code>'use client'</code> at the top of a file to make it a
          Client Component.
        </li>
        <li>
          Ask the AI: <em>"Make the stats chart a client component with animated transitions."</em>
        </li>
        <li>
          Use <strong>Server Actions</strong> for form submissions: <em>"Use a Server Action
          to handle the contact form instead of an API route."</em>
        </li>
        <li>
          To optimise images, ask: <em>"Replace all <code>&lt;img&gt;</code> tags with Next.js
          <code>Image</code> components."</em>
        </li>
      </ul>

      <Callout type="tip">
        Next.js projects deploy seamlessly to Vercel. If you want Cloudflare Pages, ask the AI to
        add <code>@cloudflare/next-on-pages</code> compatibility.
      </Callout>

      <h2>Common prompts for Next.js</h2>
      <table>
        <thead><tr><th>What you want</th><th>Prompt</th></tr></thead>
        <tbody>
          <tr><td>Dynamic route</td><td>"Add a <code>/blog/[slug]</code> page that reads posts from a data file"</td></tr>
          <tr><td>Parallel routes</td><td>"Add a modal route for <code>/dashboard/@modal/create</code>"</td></tr>
          <tr><td>Metadata SEO</td><td>"Add dynamic metadata to all blog post pages"</td></tr>
          <tr><td>Middleware auth</td><td>"Protect all <code>/admin/*</code> routes using Next.js middleware"</td></tr>
          <tr><td>Loading UI</td><td>"Add a loading skeleton to the dashboard stats grid"</td></tr>
        </tbody>
      </table>
    </div>
  )
}
