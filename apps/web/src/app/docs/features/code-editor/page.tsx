import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'

export const metadata: Metadata = {
  title: 'Code Editor',
  description: 'A full-featured Monaco editor with TypeScript intellisense, real-time collaboration, and auto-save.',
}

export default function CodeEditorPage() {
  return (
    <DocsProse>
      <h1>Code Editor</h1>
      <p className="lead">
        A full-featured Monaco editor (the engine behind VS Code) with TypeScript
        intellisense, real-time collaboration, and auto-save.
      </p>

      <h2>Overview</h2>
      <p>
        The code editor panel is a Monaco Editor instance with full TypeScript language
        services loaded. It supports syntax highlighting, inline error squiggles,
        autocompletion with type-aware suggestions, go-to-definition, and multi-cursor
        editing. If you've used VS Code, the experience is immediately familiar.
      </p>

      <h2>Supported languages</h2>
      <p>
        The editor provides syntax highlighting and language intelligence for: TypeScript,
        JavaScript, TSX, JSX, CSS, SCSS, HTML, JSON, Markdown, YAML, TOML, and more. Any
        file in your project can be opened and edited.
      </p>

      <h2>Real-time collaboration</h2>
      <p>
        When multiple team members open the same project simultaneously, their changes
        sync in real time using <strong>Yjs CRDTs</strong> (conflict-free replicated data
        types). Unlike traditional file locking, Yjs merges concurrent edits
        automatically — two people can type in the same file at the same time without
        overwriting each other's work.
      </p>
      <p>
        Collaborators' cursors and text selections appear in the editor in distinct
        colours, with their name attached as a label. You can see exactly where everyone
        is working at a glance.
      </p>

      <Callout type="info">
        Real-time collaboration requires all collaborators to have the Editor or Owner
        role. Viewers can read files in the editor but cannot make changes.
      </Callout>

      <h2>Auto-save</h2>
      <p>
        Files are auto-saved on every keystroke and synced to the WebContainer for
        instant HMR pickup. The status bar at the bottom of the screen shows{' '}
        <strong>✓ Auto-saved</strong> briefly after each save — you never need to press
        ⌘S manually, though it still works if you reach for it out of habit.
      </p>
      <p>
        Press <strong>⌘Z</strong> to undo the last AI-generated change as a single atomic
        operation. This is different from the editor's own undo stack — use ⌘Z for
        "revert what the AI just did" and the editor's internal undo (also ⌘Z within the
        editor input) for character-level keypress undos.
      </p>

      <h2>The file tree</h2>
      <p>
        The left panel shows your project's full directory structure. From the file tree
        you can:
      </p>
      <ul>
        <li>
          <strong>Create</strong> new files and folders using the icons in the panel
          header
        </li>
        <li>
          <strong>Rename</strong> any file or folder by double-clicking its name
        </li>
        <li>
          <strong>Delete</strong> files and folders using the right-click context menu
          (note: deletion is irreversible — use version history to recover deleted content)
        </li>
        <li>
          <strong>Open</strong> any file in the editor by clicking it
        </li>
      </ul>

      <h2>Hiding panels for focus</h2>
      <p>
        All four panels in the workspace can be toggled to maximise the space you need
        most. The shortcuts are:
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
            <td><code>⌘B</code></td>
            <td>Toggle file tree panel</td>
          </tr>
          <tr>
            <td><code>⌘⇧E</code></td>
            <td>Toggle code editor panel</td>
          </tr>
          <tr>
            <td>Both hidden</td>
            <td>Maximum chat + preview space</td>
          </tr>
        </tbody>
      </table>
      <p>
        When a panel is hidden it collapses to a thin 28px strip showing a rotated label.
        Click the strip at any time to restore the panel to its previous width.
      </p>

      <h2>Keyboard shortcuts</h2>
      <p>
        See the <a href="/docs/reference/keyboard-shortcuts">Keyboard Shortcuts</a>{' '}
        reference for the full list of editor-level shortcuts. The Monaco editor also
        supports all standard VS Code editing shortcuts — multi-cursor, column select,
        go to definition, and more.
      </p>
    </DocsProse>
  )
}
