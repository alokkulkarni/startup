export const metadata = {
  title: 'Code Editor',
  description: 'The Forge AI code editor provides a full-featured development environment with real-time collaboration.',
}

import { Callout } from '../../_components/Callout'

export default function CodeEditorPage() {
  return (
    <div>
      <h1>Code Editor</h1>

      <p>
        The Forge AI code editor provides a full-featured development environment inside your
        browser. It looks and feels like VS Code, with syntax highlighting, autocompletion,
        error highlighting, and multi-file navigation.
      </p>

      <h2>Key features</h2>
      <ul>
        <li><strong>Syntax highlighting</strong> — for TypeScript, JavaScript, JSX/TSX, CSS, HTML, JSON, and more</li>
        <li><strong>IntelliSense</strong> — autocompletion and type hints powered by the TypeScript language service</li>
        <li><strong>Error highlighting</strong> — type errors and linting issues are underlined inline</li>
        <li><strong>Multi-file tabs</strong> — work on several files at once with a familiar tabbed interface</li>
        <li><strong>File tree</strong> — full project structure in the left panel; create, rename, and delete files</li>
        <li><strong>Find &amp; replace</strong> — search across a single file or the entire project</li>
      </ul>

      <h2>Real-time collaboration</h2>
      <p>
        When multiple collaborators are in the same project, their edits appear in your editor
        in real time. Each collaborator's cursor is shown with a colour-coded label. Changes from
        all collaborators are merged automatically — there are no conflicts and no file locking.
      </p>

      <Callout type="tip">
        Real-time co-editing is available on the Team plan. See the{' '}
        <a href="/docs/features/collaboration">Collaboration</a> page for full details.
      </Callout>

      <h2>Auto-save</h2>
      <p>
        Files are saved automatically on every keystroke. There is no manual save step. The live
        preview reflects saved state continuously.
      </p>

      <h2>Keyboard shortcuts</h2>
      <p>
        The editor supports standard VS Code keyboard shortcuts. See the full list in{' '}
        <a href="/docs/reference/keyboard-shortcuts">Keyboard Shortcuts</a>.
      </p>

      <h2>AI-assisted editing</h2>
      <p>
        You can ask the AI to edit specific files or sections by referencing them in the chat
        panel. For example: <em>"Update the Header component in <code>src/components/Header.tsx</code>{' '}
        to add a search bar."</em>
      </p>
      <p>
        The AI edits exactly the files you reference and leaves others untouched.
      </p>

      <h2>Hiding the editor pane</h2>
      <p>
        Use the <strong>hide panel</strong> icon at the top of the editor or file tree to collapse
        them and give more screen space to the chat or the live preview.
      </p>

      <Callout type="info">
        Version history is tracked per project so you can roll back to any previous state. See{' '}
        <a href="/docs/features/version-history">Version History</a>.
      </Callout>
    </div>
  )
}
