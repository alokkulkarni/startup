import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'

export const metadata: Metadata = {
  title: 'FAQ',
  description: 'Answers to the most common questions about Forge AI.',
}

export default function FaqPage() {
  return (
    <DocsProse>
      <h1>FAQ</h1>
      <p className="lead">
        Answers to the most common questions about Forge AI.
      </p>

      <h3>What is Forge AI?</h3>
      <p>
        Forge AI is an AI-powered platform that lets you build full-stack web applications
        by describing what you want in plain English. The AI generates production-ready code
        across React, Next.js, Vue, Svelte, Angular, and Flutter — with backend, database
        schema, and authentication all included.
      </p>

      <h3>Do I need coding experience?</h3>
      <p>
        No. Forge AI is designed for all skill levels. Non-technical users can build
        complete applications entirely through the AI chat interface. Developers can also
        directly edit the generated code in the Monaco editor, extending or customising
        anything the AI produces.
      </p>

      <h3>What languages and frameworks are supported?</h3>
      <p>
        <strong>Frontend:</strong> React, Next.js, Vue 3, SvelteKit, Angular, and Flutter
        Web. <strong>Backend:</strong> Node.js with Fastify. See the{' '}
        <a href="/docs/reference/supported-frameworks">Supported Frameworks</a> reference
        for the full list of templates and capabilities.
      </p>

      <h3>How does billing work?</h3>
      <p>
        Forge AI uses Stripe for all payments. A free plan is available with 50 AI
        messages per day. The Pro plan is $29/month with 500 messages per day. See{' '}
        <a href="/docs/workspace/billing">Billing &amp; Plans</a> for a full feature
        comparison.
      </p>

      <h3>How many AI messages can I send?</h3>
      <p>
        Message limits depend on your plan: <strong>Free</strong> — 50 per day;{' '}
        <strong>Pro</strong> — 500 per day; <strong>Team</strong> — 2,000 per day;{' '}
        <strong>Enterprise</strong> — unlimited. Limits reset daily at midnight UTC.
      </p>

      <h3>Can multiple people collaborate on the same project?</h3>
      <p>
        Yes. Invite team members from <strong>Settings → Members</strong>. Users with the
        Editor or Owner role can send AI prompts and edit code simultaneously — changes are
        merged in real time using Yjs CRDTs, so there are no conflicts. See{' '}
        <a href="/docs/features/collaboration">Team Collaboration</a> for details.
      </p>

      <h3>Where is my code stored?</h3>
      <p>
        Your code is stored in PostgreSQL on the Forge AI server. You can optionally sync
        it to your GitHub repository at any time. You always have full ownership of
        everything you build.
      </p>

      <h3>Can I export my code?</h3>
      <p>
        Yes. Click <strong>Download</strong> in the editor header to download your entire
        project as a ZIP file. You can also connect GitHub and push at any point for full
        portability via version control.
      </p>

      <h3>How do I connect GitHub?</h3>
      <p>
        Click the GitHub button in the editor header, authorise Forge AI via OAuth, and
        choose a repository. See the <a href="/docs/features/github-sync">GitHub Sync</a>{' '}
        guide for the complete walkthrough.
      </p>

      <h3>What AI models does Forge AI use?</h3>
      <p>
        The primary model is Claude accessed via AWS Bedrock. If Bedrock is unavailable,
        Forge AI falls back automatically to Anthropic direct → Gemini 2.0 Flash → GPT-4o.
        The selection is transparent — you always receive a response. See{' '}
        <a href="/docs/reference/ai-models">AI Models</a> for the full architecture.
      </p>

      <h3>Is my data secure?</h3>
      <p>
        Yes. Credentials and API keys are encrypted at rest. GitHub tokens are stored using
        AES encryption. Critically, no code is sent to external servers for execution —
        your app runs entirely inside a WebContainer in your browser, keeping your code
        local.
      </p>

      <Callout type="info" title="Browser-native execution">
        The live preview runs in WebContainers — a browser-native Node.js runtime. Your
        code never leaves your machine for execution purposes.
      </Callout>

      <h3>How do I report a bug or request a feature?</h3>
      <p>
        Open an issue on the Forge AI GitHub repository, or use the feedback button in the
        app header. Feature requests and bug reports are reviewed by the core team.
      </p>
    </DocsProse>
  )
}
