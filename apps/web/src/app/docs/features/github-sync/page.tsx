import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'
import { Steps, Step } from '@/app/docs/_components/Steps'

export const metadata: Metadata = {
  title: 'GitHub Sync',
  description: 'Connect your project to a GitHub repository to push code, track changes, and integrate with your engineering workflow.',
}

export default function GithubSyncPage() {
  return (
    <DocsProse>
      <h1>GitHub Sync</h1>
      <p className="lead">
        Connect your project to a GitHub repository to push code, track changes, and
        integrate with your engineering workflow.
      </p>

      <h2>Connecting GitHub</h2>
      <Steps>
        <Step step={1} title="Open GitHub panel">
          Click the <strong>GitHub</strong> button in the editor header (top navigation
          bar). If you haven't connected GitHub yet, you'll see a prompt to authorise.
        </Step>
        <Step step={2} title="Authorise Forge AI">
          You'll be redirected to GitHub's OAuth authorisation page. Forge AI requests{' '}
          <code>repo</code> and <code>read:user</code> scopes — the minimum needed to
          read your repositories and push commits. Authorise the app to continue.
        </Step>
        <Step step={3} title="Choose a repository">
          Select an existing repository from your GitHub account, or create a brand-new
          repository directly from the Forge AI interface without leaving the editor.
        </Step>
        <Step step={4} title="Push your code">
          Click <strong>"Push to GitHub"</strong>. Forge AI creates an initial commit
          containing all your project files and pushes it to the selected repository.
        </Step>
      </Steps>

      <h2>Pushing changes</h2>
      <p>
        After making AI-generated or manual code changes, click the{' '}
        <strong>GitHub button → Push to GitHub</strong>. Forge AI automatically generates
        a descriptive commit message based on the files changed — for example:
      </p>
      <pre>
        <code>feat: update Header.tsx, Sidebar.tsx via Forge AI</code>
      </pre>
      <p>
        All files changed since the last push are bundled into a single commit. You don't
        need to stage files or write commit messages manually — Forge AI handles it.
      </p>

      <h2>Sync status</h2>
      <p>
        The sync status badge in the editor header gives you real-time visibility into
        the state of your GitHub connection:
      </p>
      <table>
        <thead>
          <tr>
            <th>Badge</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>✓ <strong>Synced</strong></td>
            <td>All changes have been pushed successfully</td>
          </tr>
          <tr>
            <td>↑ <strong>Changes pending</strong></td>
            <td>There are unpushed local changes</td>
          </tr>
          <tr>
            <td>✗ <strong>Error</strong></td>
            <td>The last sync failed — click to see details and retry</td>
          </tr>
        </tbody>
      </table>

      <h2>Working with branches</h2>
      <p>
        You can push to any branch in your connected repository. This enables a
        PR-based workflow: build a feature in Forge AI, push it to a feature branch,
        create a pull request, and get it reviewed by your engineering team before
        merging to main. This makes Forge AI a first-class citizen in professional
        engineering workflows.
      </p>

      <h2>Security</h2>
      <p>
        GitHub OAuth tokens are stored encrypted using AES-256 in the Forge AI database.
        Plaintext credentials are never stored, logged, or transmitted. The OAuth flow
        uses short-lived tokens that can be revoked from GitHub at any time via{' '}
        <strong>GitHub Settings → Authorised Apps</strong>.
      </p>

      <Callout type="warning">
        Never paste GitHub Personal Access Tokens directly into the AI chat. Always use
        the GitHub OAuth flow built into the Forge AI editor. Tokens pasted in chat
        would appear in your shared chat history — visible to all project members.
      </Callout>
    </DocsProse>
  )
}
