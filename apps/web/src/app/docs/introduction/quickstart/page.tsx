import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'
import { Cards, Card } from '@/app/docs/_components/Cards'
import { Steps, Step } from '@/app/docs/_components/Steps'

export const metadata: Metadata = {
  title: 'Quickstart',
  description: 'Get your first AI-generated app running in under 5 minutes.',
}

export default function QuickstartPage() {
  return (
    <DocsProse>
      <h1>Quickstart</h1>
      <p className="lead">
        Get your first AI-generated app running in under 5 minutes.
      </p>

      <Steps>
        <Step step={1} title="Create your account">
          Sign up at your Forge AI instance. You can log in with an email and password or
          use Google or GitHub OAuth for a one-click sign-in experience.
        </Step>

        <Step step={2} title="Create a project">
          Click <strong>+ New Project</strong> on the dashboard, or browse{' '}
          <strong>Templates</strong> and pick a starter that matches what you want to build.
          In the prompt box, type a description of your application — for example:
          <br />
          <br />
          <em>"Build a todo app with React, a REST API, and localStorage persistence."</em>
          <br />
          <br />
          Press <strong>Enter</strong> to kick off generation.
        </Step>

        <Step step={3} title="Wait for generation">
          Forge AI calls Claude to generate your complete codebase — frontend components,
          API routes, file structure, and configuration — typically in 10–30 seconds. The
          editor opens automatically when generation completes.
        </Step>

        <Step step={4} title="Explore the editor">
          The workspace is split into four panels: <strong>File Tree</strong> on the left,
          <strong>AI Chat</strong>, <strong>Code Editor</strong>, and{' '}
          <strong>Live Preview</strong> on the right. The preview boots your app inside a
          a live browser-based runtime, so there
          are no cold starts and no external servers involved.
        </Step>

        <Step step={5} title="Send your first prompt">
          In the Chat panel, type a follow-up instruction, such as:
          <br />
          <br />
          <em>
            "Add a dark mode toggle in the header that persists to localStorage."
          </em>
          <br />
          <br />
          Press <strong>Enter</strong>. The AI streams its response in real time, applies
          the file changes, and the live preview updates automatically via HMR.
        </Step>

        <Step step={6} title="Deploy">
          Click <strong>Deploy ▾</strong> in the editor header, choose your platform —
          Vercel, Netlify, or Cloudflare Pages — and click <strong>Deploy</strong>. In
          roughly 30 seconds your app is live with a public URL.
        </Step>
      </Steps>

      <Callout type="tip" title="Start small">
        Describe one feature at a time rather than your entire application. Build
        incrementally — each prompt builds on the last, and small focused changes are
        easier for the AI to get exactly right.
      </Callout>

      <Callout type="info" title="Focus mode">
        Press <strong>⌘B</strong> to hide the file tree and <strong>⌘⇧E</strong> to hide
        the code editor, giving you maximum screen space to chat with the AI and watch the
        preview.
      </Callout>

      <h2>What's next?</h2>
      <Cards cols={2}>
        <Card
          href="/docs/features/ai-chat"
          title="AI Chat"
          icon="💬"
          description="Learn how the AI understands your full codebase and streams changes in real time."
        />
        <Card
          href="/docs/features/templates"
          title="Templates"
          icon="📋"
          description="Explore all 16 production-ready starter templates."
        />
      </Cards>
    </DocsProse>
  )
}
