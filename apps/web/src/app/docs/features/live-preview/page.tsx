export const metadata = {
  title: 'Live Preview',
  description: 'Your app runs live in the browser with zero cold starts. See changes in real time as the AI generates code.',
}

import { Callout } from '../../_components/Callout'

export default function LivePreviewPage() {
  return (
    <div>
      <h1>Live Preview</h1>

      <p>
        Your app runs live in the browser with zero cold starts. As the AI generates code, the
        preview refreshes automatically so you can see your application working in real time.
      </p>

      <h2>How it works</h2>
      <p>
        Forge AI runs a full Node.js runtime directly inside your browser tab. Your app is
        compiled, served, and hot-reloaded there — no remote servers, no waiting for a cloud
        environment to boot.
      </p>

      <ul>
        <li><strong>Instant start</strong> — the preview is available as soon as you open a project</li>
        <li><strong>Hot module replacement</strong> — code changes appear without a full page refresh where possible</li>
        <li><strong>Full-stack support</strong> — frontend and backend routes run together in the same preview</li>
        <li><strong>Offline capable</strong> — once loaded, the preview works even if your internet drops</li>
      </ul>

      <Callout type="tip">
        You can pop the preview out into its own window using the <strong>Open in new tab</strong>{' '}
        icon at the top of the preview pane.
      </Callout>

      <h2>Preview controls</h2>
      <p>
        The toolbar above the preview panel has the following controls:
      </p>
      <table>
        <thead>
          <tr>
            <th>Control</th>
            <th>What it does</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Refresh</strong></td>
            <td>Reloads the preview tab without rebuilding</td>
          </tr>
          <tr>
            <td><strong>Restart</strong></td>
            <td>Rebuilds and restarts the running app from scratch</td>
          </tr>
          <tr>
            <td><strong>Stop</strong></td>
            <td>Halts the running app to free browser memory</td>
          </tr>
          <tr>
            <td><strong>Open in new tab</strong></td>
            <td>Opens the preview URL in a separate browser window</td>
          </tr>
        </tbody>
      </table>

      <h2>Supported app types</h2>
      <ul>
        <li>React (Vite, Create React App)</li>
        <li>Next.js (App Router and Pages Router)</li>
        <li>Vue 3 + Vite</li>
        <li>SvelteKit</li>
        <li>Angular CLI apps</li>
        <li>Flutter Web</li>
        <li>Plain HTML/CSS/JavaScript</li>
        <li>Node.js backend APIs</li>
      </ul>

      <h2>Preview URL</h2>
      <p>
        Each project gets a unique preview URL that you can share with others. The URL is live as
        long as the project is open in your browser. For a permanent, publicly accessible URL, use{' '}
        <a href="/docs/features/deploy">Deploy</a>.
      </p>

      <h2>Console and errors</h2>
      <p>
        Runtime errors surface directly in the preview pane with a <strong>Fix with AI</strong>{' '}
        button. The console tab below the preview shows all logs from your running app. You can also
        open the browser DevTools for full debugging.
      </p>

      <Callout type="info">
        If the preview becomes unresponsive, click <strong>Restart</strong> to rebuild from the
        latest saved state.
      </Callout>
    </div>
  )
}
