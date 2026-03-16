import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'
import { NumberedSteps } from '@/app/docs/_components/Steps'

export const metadata: Metadata = {
  title: 'Templates',
  description: '16 production-ready starter templates covering React, Next.js, Vue, Svelte, Angular, and Flutter.',
}

export default function TemplatesPage() {
  return (
    <DocsProse>
      <h1>Templates</h1>
      <p className="lead">
        16 production-ready starter templates covering React, Next.js, Vue, Svelte,
        Angular, and Flutter. Start building instantly with the right foundation.
      </p>

      <h2>Using a template</h2>
      <NumberedSteps>
        <div>
          From the dashboard, click <strong>"Browse Templates"</strong> or{' '}
          <strong>"+ New Project"</strong> to open the template gallery.
        </div>
        <div>
          Browse by category (Starter, Dashboard, SaaS, Commerce, API) or search by
          template name or framework.
        </div>
        <div>
          Click any template card to see a description, framework badge, and a preview of
          the files it includes.
        </div>
        <div>
          Click <strong>"Use Template"</strong> — your new project is created and opens
          in the editor immediately, with the template code loaded and the live preview
          already running.
        </div>
      </NumberedSteps>

      <h2>Building on templates</h2>
      <p>
        Templates are starting points, not finished apps. They give you a solid structure
        so you spend your prompts adding your specific features rather than scaffolding
        boilerplate. Once your project opens, use the AI chat to customise it:
      </p>
      <ul>
        <li>
          "Replace the placeholder hero text with our product description and update the
          brand colour to teal"
        </li>
        <li>
          "Add a pricing section below the features grid with three plan cards"
        </li>
        <li>
          "Connect the contact form to a Fastify endpoint at <code>/api/contact</code>"
        </li>
      </ul>

      <h2>Template catalog</h2>
      <table>
        <thead>
          <tr>
            <th>Template</th>
            <th>Framework</th>
            <th>Category</th>
            <th>Best for</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>React Counter</td>
            <td>React</td>
            <td>Starter</td>
            <td>Learning, demos</td>
          </tr>
          <tr>
            <td>React Todo App</td>
            <td>React</td>
            <td>Starter</td>
            <td>CRUD patterns</td>
          </tr>
          <tr>
            <td>React Landing Page</td>
            <td>React</td>
            <td>Landing</td>
            <td>Marketing sites</td>
          </tr>
          <tr>
            <td>React E-Commerce</td>
            <td>React</td>
            <td>Commerce</td>
            <td>Product stores</td>
          </tr>
          <tr>
            <td>React Dashboard</td>
            <td>React</td>
            <td>Dashboard</td>
            <td>Admin panels</td>
          </tr>
          <tr>
            <td>Next.js SaaS Starter</td>
            <td>Next.js</td>
            <td>SaaS</td>
            <td>Full-stack SaaS</td>
          </tr>
          <tr>
            <td>Next.js Blog</td>
            <td>Next.js</td>
            <td>Blog</td>
            <td>Content sites</td>
          </tr>
          <tr>
            <td>Fastify REST API</td>
            <td>Node.js</td>
            <td>API</td>
            <td>Backend services</td>
          </tr>
          <tr>
            <td>Vue 3 Starter</td>
            <td>Vue 3</td>
            <td>Starter</td>
            <td>Vue applications</td>
          </tr>
          <tr>
            <td>SvelteKit Starter</td>
            <td>SvelteKit</td>
            <td>Starter</td>
            <td>Svelte apps</td>
          </tr>
          <tr>
            <td>Angular Starter</td>
            <td>Angular</td>
            <td>Starter</td>
            <td>Angular apps</td>
          </tr>
          <tr>
            <td>Angular Material Dashboard</td>
            <td>Angular</td>
            <td>Dashboard</td>
            <td>Enterprise dashboards</td>
          </tr>
          <tr>
            <td>Angular Signals App</td>
            <td>Angular</td>
            <td>Starter</td>
            <td>Modern Angular</td>
          </tr>
          <tr>
            <td>Flutter Starter</td>
            <td>Flutter</td>
            <td>Starter</td>
            <td>Cross-platform apps</td>
          </tr>
          <tr>
            <td>Flutter Web Dashboard</td>
            <td>Flutter</td>
            <td>Dashboard</td>
            <td>Flutter dashboards</td>
          </tr>
          <tr>
            <td>Flutter WASM Canvas</td>
            <td>Flutter</td>
            <td>Starter</td>
            <td>Canvas / graphics apps</td>
          </tr>
        </tbody>
      </table>

      <Callout type="tip" title="Template gallery">
        Visit <a href="/templates">/templates</a> to browse all templates with visual
        mockups, framework badges, and category filters before starting a new project.
      </Callout>
    </DocsProse>
  )
}
