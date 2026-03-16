import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'
import { Cards, Card } from '@/app/docs/_components/Cards'

export const metadata: Metadata = {
  title: 'Welcome to Forge AI',
  description: 'Forge AI lets developers and teams build production-grade full-stack web applications using natural language.',
}

export default function WelcomePage() {
  return (
    <DocsProse>
      <h1>Welcome to Forge AI</h1>
      <p className="lead">
        Forge AI lets developers and teams build production-grade full-stack web applications
        using natural language.
      </p>

      <h2>What is Forge AI?</h2>
      <p>
        Forge AI is an AI-powered application builder. You describe what you want — in plain
        English — and the AI generates your entire application: frontend components, backend
        API routes, database schema, authentication flows, and more. The result is a real,
        fully editable codebase that you own and can take anywhere.
      </p>
      <p>
        Under the hood, Forge AI is powered by a multi-model AI stack: Claude (via AWS
        Bedrock) handles the primary generation workload, with automatic fallback to
        Anthropic direct, Gemini 2.0 Flash, and GPT-4o if needed. You always get a
        response — the model selection is transparent and automatic.
      </p>

      <h2>Why Forge AI?</h2>
      <Cards cols={2}>
        <Card
          href="/docs/reference/ai-models"
          title="Multi-model AI"
          icon="🤖"
          description="Claude primary with GPT-4o and Gemini 2.0 Flash as automatic fallbacks — always available."
        />
        <Card
          href="/docs/features/live-preview"
          title="Live Preview"
          icon="👁️"
          description="WebContainers power a browser-native runtime. Your app runs live with zero cold starts."
        />
        <Card
          href="/docs/features/deploy"
          title="One-click Deploy"
          icon="🚀"
          description="Deploy to Vercel, Netlify, or Cloudflare Pages in seconds from the editor header."
        />
        <Card
          href="/docs/features/collaboration"
          title="Team Collaboration"
          icon="👥"
          description="Yjs real-time sync keeps every collaborator in sync. RBAC roles control who can do what."
        />
      </Cards>

      <h2>Who is it for?</h2>
      <p>Forge AI is built for a wide range of builders:</p>
      <ul>
        <li>
          <strong>Individual developers</strong> — founders, indie hackers, and students who
          want to ship fast without scaffolding everything from scratch.
        </li>
        <li>
          <strong>Product teams</strong> — product managers, designers, and marketers who
          need working prototypes without waiting on engineering capacity.
        </li>
        <li>
          <strong>Engineering teams</strong> — developers who want rapid scaffolding for
          internal tools, proof-of-concepts, and new microservices.
        </li>
        <li>
          <strong>Enterprises</strong> — organisations that need role-based access control,
          audit-grade collaboration, and the security of AWS Bedrock's IAM authentication.
        </li>
      </ul>

      <h2>What can you build?</h2>
      <p>
        Forge AI supports the full range of modern web application types. Here are some of
        the things teams are building today:
      </p>
      <ul>
        <li>SaaS applications with authentication and subscription billing</li>
        <li>REST APIs powered by Fastify and PostgreSQL</li>
        <li>Analytics dashboards with charts and data tables</li>
        <li>Marketing and landing pages</li>
        <li>E-commerce storefronts</li>
        <li>Content blogs and documentation sites</li>
        <li>Internal tools and admin panels</li>
        <li>Personal portfolios</li>
      </ul>

      <h2>The AI model stack</h2>
      <p>
        Every prompt you send is processed by the best available model. Forge AI uses a
        waterfall fallback strategy:
      </p>
      <ol>
        <li>
          <strong>Claude via AWS Bedrock</strong> (primary) — Anthropic's Claude model
          accessed through AWS Bedrock with IAM role-based authentication. Enterprise-grade
          security with no API keys required.
        </li>
        <li>
          <strong>Anthropic direct</strong> (fallback 1) — The same Claude model accessed
          via the Anthropic API directly if Bedrock is unavailable.
        </li>
        <li>
          <strong>Gemini 2.0 Flash</strong> (fallback 2) — Google's fast, efficient model
          via the Google AI API.
        </li>
        <li>
          <strong>GPT-4o</strong> (fallback 3) — OpenAI's flagship model as a final
          fallback.
        </li>
      </ol>
      <p>
        This is entirely automatic. You never need to configure which model to use or worry
        about provider outages — Forge AI handles it transparently.
      </p>

      <Callout type="info" title="Model transparency">
        The model used for each request is selected automatically. You always receive a
        response, regardless of which provider is serving it at that moment.
      </Callout>

      <h2>Quick links</h2>
      <Cards cols={3}>
        <Card
          href="/docs/introduction/quickstart"
          title="Quickstart"
          icon="🚀"
          description="Build your first app in under 5 minutes."
        />
        <Card
          href="/docs/features/ai-chat"
          title="Features"
          icon="✨"
          description="Explore the AI chat, live preview, and editor."
        />
        <Card
          href="/docs/guides/prompting-tips"
          title="Guides"
          icon="📖"
          description="Learn how to write prompts that get great results."
        />
      </Cards>
    </DocsProse>
  )
}
