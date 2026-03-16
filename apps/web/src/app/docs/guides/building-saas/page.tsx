import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'
import { Steps, Step } from '@/app/docs/_components/Steps'

export const metadata: Metadata = {
  title: 'Building a SaaS App',
  description: 'A step-by-step guide to building a complete SaaS application with Forge AI, from template to production.',
}

export default function BuildingSaasPage() {
  return (
    <DocsProse>
      <h1>Building a SaaS App</h1>
      <p className="lead">
        A step-by-step guide to building a complete SaaS application with Forge AI, from
        template to production.
      </p>

      <Callout type="tip" title="Keep it moving">
        Don't perfect each step before moving on. Build the full skeleton first, then
        polish. The AI is excellent at global refactors: "Make the whole app use a
        consistent indigo/slate colour palette."
      </Callout>

      <Steps>
        <Step step={1} title="Start from the Next.js SaaS Starter template">
          From the dashboard, click <strong>Browse Templates → Next.js SaaS Starter →
          Use Template</strong>. This gives you a Next.js 14 App Router project
          pre-configured with a clean layout. The template includes a top-level app
          router structure, a site header with navigation, a hero section on the home
          page, a pricing stub page, a dashboard shell with placeholder content, and
          Tailwind CSS for styling. You're not starting from a blank page — you're
          starting from a working foundation.
        </Step>

        <Step step={2} title="Define your product">
          Send a prompt that describes your specific product and brand:
          <br />
          <br />
          <em>
            "This is a project management SaaS called TaskFlow. Update the landing page
            hero to say: 'Ship projects faster with AI-powered task management.' Update
            the brand colours to use teal instead of indigo."
          </em>
          <br />
          <br />
          This one prompt establishes the product identity throughout the app and gives
          the AI context for everything that follows.
        </Step>

        <Step step={3} title="Build the core feature">
          Describe your primary feature clearly, one screen at a time:
          <br />
          <br />
          <em>
            "Add a Projects page that shows a grid of project cards. Each card has a
            project name, description, progress bar (0–100%), and team member avatars.
            Use mock data for now."
          </em>
          <br />
          <br />
          Once that's working, continue:
          <br />
          <br />
          <em>
            "Add a Create Project modal with a form for name, description, and due date.
            Opening it from a '+ New Project' button in the page header."
          </em>
        </Step>

        <Step step={4} title="Add authentication context">
          <em>
            "Add a <code>useAuth</code> hook that returns the current user (name, email,
            avatar) from localStorage. Gate the /dashboard route — if no user is logged
            in, redirect to /login with a simple login form."
          </em>
          <br />
          <br />
          This wires a local authentication context for prototyping. For production, the
          Forge AI stack uses Keycloak OIDC — consult your backend configuration to
          connect to the real auth server.
        </Step>

        <Step step={5} title="Build the pricing page">
          <em>
            "Create a /pricing page with three plan cards: Starter ($9/mo, 3 projects),
            Pro ($29/mo, 20 projects), Enterprise (custom pricing, contact sales). Include
            a 'Most Popular' badge on the Pro card. Add a monthly/annual billing toggle
            that adjusts the displayed prices."
          </em>
        </Step>

        <Step step={6} title="Wire up the dashboard">
          <em>
            "Add a sidebar to the dashboard layout with navigation links to: Projects,
            Tasks, Team, Settings. Show the current user's avatar and name at the bottom
            of the sidebar. Highlight the active route with an indigo background."
          </em>
        </Step>

        <Step step={7} title="Polish and deploy">
          Switch the preview to Mobile viewport (the toggle in the preview header) and
          verify the responsive layout. Press <strong>⌘⇧E</strong> to hide the code
          editor and focus on the preview. When you're happy, click{' '}
          <strong>Deploy ▾ → Vercel</strong> and follow the deployment steps. Your SaaS
          is live.
        </Step>

        <Step step={8} title="Connect GitHub">
          Click <strong>GitHub → Push to GitHub</strong>. This creates a permanent copy
          of your codebase in version control, where your engineering team can review,
          fork, extend, and deploy from a proper CI/CD pipeline.
        </Step>
      </Steps>
    </DocsProse>
  )
}
