import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'

export const metadata: Metadata = {
  title: 'Keyboard Shortcuts',
  description: 'Keyboard shortcuts available in the Forge AI project editor.',
}

export default function KeyboardShortcutsPage() {
  return (
    <DocsProse>
      <h1>Keyboard Shortcuts</h1>
      <p className="lead">
        Keyboard shortcuts available in the Forge AI project editor.
      </p>

      <h2>Editor shortcuts</h2>
      <table>
        <thead>
          <tr>
            <th>Shortcut</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>⌘Z</code></td>
            <td>Undo the last AI-generated change (single atomic revert)</td>
          </tr>
          <tr>
            <td><code>⌘B</code></td>
            <td>Toggle the file tree panel</td>
          </tr>
          <tr>
            <td><code>⌘⇧E</code></td>
            <td>Toggle the code editor panel</td>
          </tr>
          <tr>
            <td><code>⌘S</code></td>
            <td>Save the current file (files are also auto-saved on every keystroke)</td>
          </tr>
        </tbody>
      </table>

      <h2>Coming soon</h2>
      <p>
        The following shortcuts are planned for a future release:
      </p>
      <table>
        <thead>
          <tr>
            <th>Shortcut</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><code>⌘K</code></td>
            <td>Open the command palette</td>
          </tr>
          <tr>
            <td><code>⌘P</code></td>
            <td>Quick file open (fuzzy search across all project files)</td>
          </tr>
          <tr>
            <td><code>⌘⇧F</code></td>
            <td>Global search across all files in the project</td>
          </tr>
        </tbody>
      </table>

      <h2>Monaco editor shortcuts</h2>
      <p>
        The code editor panel is powered by Monaco Editor — the same engine that powers
        VS Code. All standard VS Code keyboard shortcuts work within the editor panel,
        including:
      </p>
      <ul>
        <li>Multi-cursor editing (<code>⌥ + click</code>)</li>
        <li>Column (box) selection (<code>⌥⇧ + drag</code>)</li>
        <li>Go to definition (<code>F12</code>)</li>
        <li>Rename symbol (<code>F2</code>)</li>
        <li>Format document (<code>⇧⌥F</code>)</li>
        <li>Toggle line comment (<code>⌘/</code>)</li>
      </ul>
      <p>
        For the full Monaco Editor shortcut reference, see the VS Code keyboard shortcuts
        documentation.
      </p>

      <h2>macOS vs Windows / Linux</h2>
      <p>
        All shortcuts listed use macOS notation (<code>⌘</code> for Command,{' '}
        <code>⌥</code> for Option, <code>⇧</code> for Shift). On Windows and Linux,
        replace <code>⌘</code> with <code>Ctrl</code> — all shortcuts work on all
        platforms.
      </p>

      <Callout type="tip">
        Hide both side panels (<strong>⌘B</strong> then <strong>⌘⇧E</strong>) to use
        the full screen width for the AI chat and live preview. Click the thin labelled
        strip on either side to restore a panel whenever you need it.
      </Callout>
    </DocsProse>
  )
}
