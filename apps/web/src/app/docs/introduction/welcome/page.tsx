export const metadata = {
  title: 'Welcome to Forge AI',
  description: 'Forge AI is an AI-powered full-stack web application builder. Go from idea to deployed app in minutes.',
}

import { Callout } from '../../_components/Callout'
import { Cards, Card } from '../../_components/Cards'

export default function WelcomePage() {
  return (
    <div>
      <h1>Welcome to Forge AI</h1>

      <p>
        Forge AI is an AI-powered full-stack web application builder. Describe what you want to
        build, and Forge AI generates the code, wires up the backend, and gives you a live
        preview — all in your browser, with no local setup needed.
      </p>

      <p>
        Forge AI uses Claude as its primary AI model, with OpenAI (GPT) and Google Gemini as
        intelligent fallbacks. You always get the best available response, regardless of which
        model handles your request.
      </p>

      <Callout type="tip">
        New here? Jump straight to the <a href="/docs/introduction/quickstart">Quickstart guide</a> and
        have your first app running in under 5 minutes.
      </Callout>

      <Cards>
        <Card
          href="/docs/features/ai-chat"
          title="Multi-model AI"
          description="Claude is the primary model with OpenAI (GPT) and Google Gemini as automatic fallbacks — always available."
        />
        <Card
          href="/docs/features/live-preview"
          title="Live preview"
          description="Your app runs live in the browser with zero cold starts, so you can see changes instantly."
        />
        <Card
          href="/docs/features/code-editor"
          title="Full-stack generation"
          description="Frontend, backend, database schema, and API routes — generated together and kept in sync."
        />
        <Card
          href="/docs/features/collaboration"
          title="Team collaboration"
          description="Real-time multi-user editing with role-based access. Admin, Member, and Viewer roles."
        />
        <Card
          href="/docs/features/github-sync"
          title="GitHub sync"
          description="Push to GitHub from inside Forge AI. Your project always has a real Git history."
        />
        <Card
          href="/docs/features/deploy"
          title="One-click deploy"
          description="Deploy to Vercel, Netlify, or Cloudflare Pages directly from the Forge AI UI."
        />
      </Cards>

      <h2>What you can build</h2>
      <ul>
        <li>SaaS dashboards and subscription platforms</li>
        <li>Marketing and landing pages</li>
        <li>Admin panels and internal tools</li>
        <li>REST APIs with typed frontend clients</li>
        <li>Full-stack apps with authentication and user management</li>
        <li>Flutter web apps and Angular single-page applications</li>
      </ul>

      <h2>How Forge AI works</h2>
      <ol>
        <li><strong>Describe your app</strong> — chat with Forge AI in plain language</li>
        <li><strong>AI generates code</strong> — the full project structure is created in seconds</li>
        <li><strong>Preview instantly</strong> — your app launches live in a browser tab</li>
        <li><strong>Iterate</strong> — keep chatting to add features, fix bugs, and refine the UI</li>
        <li><strong>Deploy</strong> — publish to your chosen hosting platform with one click</li>
      </ol>

      <Callout type="info">
        Forge AI manages the infrastructure so you can focus on building. No environment variables
        to juggle, no build scripts to configure.
      </Callout>

      <h2>Explore the docs</h2>
      <p>Use the sidebar to navigate to any section:</p>
      <ul>
        <li><a href="/docs/introduction/quickstart"><strong>Quickstart</strong></a> — build your first app step-by-step</li>
        <li><a href="/docs/features/ai-chat"><strong>AI Chat</strong></a> — learn how to get the best out of Forge AI</li>
        <li><a href="/docs/features/collaboration"><strong>Collaboration</strong></a> — invite your team and manage access</li>
        <li><a href="/docs/guides/prompting-tips"><strong>Prompting tips</strong></a> — write prompts that produce great code</li>
        <li><a href="/docs/workspace/billing"><strong>Billing &amp; Plans</strong></a> — compare Free, Pro, and Team plans</li>
      </ul>
    </div>
  )
}
