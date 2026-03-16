export const metadata = {
  title: 'FAQ',
  description: 'Frequently asked questions about Forge AI.',
}

import { Callout } from '../../_components/Callout'

function Q({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <div className="mb-6">
      <h3 className="mt-0 mb-2">{q}</h3>
      <div>{children}</div>
    </div>
  )
}

export default function FaqPage() {
  return (
    <div>
      <h1>FAQ</h1>

      <Q q="Do I need to install anything?">
        No. Forge AI runs entirely in your browser. There is no CLI to install, no local Node.js
        version to manage, and no Docker setup required. Your app is previewed live in a browser
        tab.
      </Q>

      <Q q="What programming languages and frameworks are supported?">
        Forge AI supports React, Next.js, Vue 3, SvelteKit, Angular, and Flutter Web on the
        frontend, plus Node.js backends with TypeScript. See the{' '}
        <a href="/docs/reference/supported-frameworks">Supported Frameworks</a> page for the full
        list.
      </Q>

      <Q q="Can multiple people edit the same project at once?">
        Yes. Forge AI has built-in real-time collaboration. Changes from every collaborator are
        merged instantly with no conflicts. See the{' '}
        <a href="/docs/features/collaboration">Collaboration</a> feature page for details.
      </Q>

      <Q q="Where is my code stored?">
        Your code is stored securely on the Forge AI server. You can optionally sync to a GitHub
        repository at any time via the{' '}
        <a href="/docs/features/github-sync">GitHub Sync</a> feature.
      </Q>

      <Q q="Which AI model does Forge AI use?">
        Forge AI uses Claude as its primary AI model, with OpenAI (GPT) and Google Gemini as
        intelligent fallbacks. You never need to choose or configure a model — Forge AI always
        selects the best available option automatically.
      </Q>

      <Q q="Is my code safe?">
        Yes. Your code and credentials are encrypted at rest. The live preview runs entirely inside
        your browser — no code is sent to external execution servers. GitHub tokens are stored
        encrypted and are never exposed in the UI.
      </Q>

      <Q q="How does the live preview work?">
        The live preview runs a full Node.js runtime directly in your browser tab. Your app starts
        instantly — there are no remote servers to spin up.
      </Q>

      <Q q="How many AI messages can I send?">
        <ul>
          <li><strong>Free plan:</strong> 20 messages per day</li>
          <li><strong>Pro plan:</strong> 300 messages per day</li>
          <li><strong>Team plan:</strong> 1,500 messages per day (shared across the workspace)</li>
        </ul>
        See the <a href="/docs/workspace/billing">Billing &amp; Plans</a> page for full details.
      </Q>

      <Q q="Can I export my code?">
        Yes. Use the <strong>Export ZIP</strong> button in any project to download all source
        files. You can also push to GitHub directly using{' '}
        <a href="/docs/features/github-sync">GitHub Sync</a>.
      </Q>

      <Q q="What deploy targets are supported?">
        Forge AI supports Vercel, Netlify, and Cloudflare Pages with one-click deploy. See the{' '}
        <a href="/docs/features/deploy">Deploy</a> feature page.
      </Q>

      <Q q="Can I use Forge AI for a commercial project?">
        Yes. All plans allow commercial use. The Team plan is designed for professional teams and
        includes additional collaboration features and higher limits.
      </Q>

      <Q q="Is there an API?">
        Not yet. The Forge AI API is on the roadmap. Join the waitlist by contacting support.
      </Q>

      <Callout type="info">
        Have a question not answered here?{' '}
        <a href="mailto:support@forgeai.dev">Email support</a> or open a discussion on GitHub.
      </Callout>
    </div>
  )
}
