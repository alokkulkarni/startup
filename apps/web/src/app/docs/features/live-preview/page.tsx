import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'

export const metadata: Metadata = {
  title: 'Live Preview',
  description: 'Your app runs live in the browser using WebContainers — a browser-native Node.js runtime.',
}

export default function LivePreviewPage() {
  return (
    <DocsProse>
      <h1>Live Preview</h1>
      <p className="lead">
        Your app runs live in the browser using WebContainers — a browser-native Node.js
        runtime. No external server required.
      </p>

      <h2>How it works</h2>
      <p>
        When your project opens, Forge AI installs npm dependencies and starts the
        development server — Vite HMR, Next.js dev server, or the equivalent for your
        framework — inside a <strong>WebContainer</strong>: a full Node.js runtime that
        runs entirely inside your browser tab. The preview iframe displays the running
        application.
      </p>

      <Callout type="info" title="100% browser-native">
        Your app executes entirely in your browser. No code is sent to external servers
        for running. This means zero cold starts, instant HMR, and your code stays local
        to your machine during development.
      </Callout>

      <h2>Starting and stopping</h2>
      <p>
        The preview starts automatically when you open a project. The toolbar above the
        preview gives you manual controls:
      </p>
      <ul>
        <li>
          <strong>Refresh</strong> — restarts the dev server without reinstalling
          dependencies. Use this if the server gets into a bad state.
        </li>
        <li>
          <strong>Stop</strong> — halts the WebContainer entirely to free browser memory.
          Useful if you're switching between multiple projects or stepping away.
        </li>
        <li>
          <strong>Restart</strong> — full reinstall of dependencies plus restart. Use this
          after adding new packages or if the preview is consistently failing.
        </li>
      </ul>

      <h2>Hot Module Replacement</h2>
      <p>
        Changes saved in the code editor are picked up instantly by Vite HMR or Next.js
        Fast Refresh. Most changes reflect in the preview in under 100ms without a full
        page reload — component state is preserved where possible. Only changes to
        server-side configuration files (like <code>vite.config.ts</code>) require a full
        restart.
      </p>

      <h2>Viewport modes</h2>
      <p>
        The preview toolbar includes a viewport size toggle so you can verify your
        responsive layouts without leaving Forge AI:
      </p>
      <ul>
        <li>
          <strong>Desktop</strong> — full panel width (the default)
        </li>
        <li>
          <strong>Tablet</strong> — approximately 768px wide
        </li>
        <li>
          <strong>Mobile</strong> — approximately 375px wide
        </li>
      </ul>
      <p>
        Switch between modes freely — the preview re-renders at the selected width
        immediately, simulating a real device viewport.
      </p>

      <h2>The console</h2>
      <p>
        Click the <strong>console toggle</strong> in the preview toolbar to reveal a
        real-time log panel at the bottom of the preview. It shows:
      </p>
      <ul>
        <li><code>console.log</code> output from your running application</li>
        <li>Runtime errors and warnings</li>
        <li>Build output from Vite or the Next.js compiler</li>
      </ul>

      <Callout type="tip">
        Use the console to debug runtime errors. The AI can read error output too — paste
        the full error from the console into the chat for targeted, precise fixes.
      </Callout>

      <h2>WebContainer status</h2>
      <p>
        The preview panel header shows a coloured status dot that reflects the current
        state of the WebContainer:
      </p>
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Colour</th>
            <th>Meaning</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>idle</code></td>
            <td>Grey</td>
            <td>Container is loaded but no dev server is running</td>
          </tr>
          <tr>
            <td><code>installing</code></td>
            <td>Yellow</td>
            <td>Running <code>npm install</code></td>
          </tr>
          <tr>
            <td><code>building</code></td>
            <td>Yellow</td>
            <td>Dev server is starting up</td>
          </tr>
          <tr>
            <td><code>ready</code></td>
            <td>Green</td>
            <td>App is running and the preview is live</td>
          </tr>
          <tr>
            <td><code>error</code></td>
            <td>Red</td>
            <td>The container or dev server has crashed</td>
          </tr>
        </tbody>
      </table>

      <h2>Auto-healing errors</h2>
      <p>
        On a crash, Forge AI captures the full error — message, stack trace, file name,
        and line number — and automatically generates a targeted fix prompt. This
        auto-healing loop runs up to <strong>3 times</strong> before pausing to ask for
        your input.
      </p>
      <p>
        You can always click <strong>"Fix with AI"</strong> in the error overlay to
        manually send the current error to the chat, regardless of whether auto-healing
        has run.
      </p>
    </DocsProse>
  )
}
