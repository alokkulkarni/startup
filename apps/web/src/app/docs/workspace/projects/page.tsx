import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'

export const metadata: Metadata = {
  title: 'Managing Projects',
  description: 'Everything you need to know about creating, organising, and managing your Forge AI projects.',
}

export default function ProjectsPage() {
  return (
    <DocsProse>
      <h1>Managing Projects</h1>
      <p className="lead">
        Everything you need to know about creating, organising, and managing your Forge
        AI projects.
      </p>

      <h2>Creating a project</h2>
      <p>
        From the dashboard, click <strong>+ New Project</strong>. You have two starting
        options:
      </p>
      <ol>
        <li>
          <strong>Describe your app</strong> — Type a description of what you want to
          build in the prompt box and press Enter. The AI creates a new project from
          scratch based on your description.
        </li>
        <li>
          <strong>Choose a template</strong> — Click Browse Templates to open the gallery
          of 16 pre-built starters. Select a template to get a working project
          immediately, then customise it with AI prompts.
        </li>
      </ol>

      <h2>The project editor</h2>
      <p>
        Every project opens in the same four-panel workspace:
      </p>
      <table>
        <thead>
          <tr>
            <th>Panel</th>
            <th>Default width</th>
            <th>Purpose</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>File Tree</td>
            <td>15%</td>
            <td>Navigate and manage project files</td>
          </tr>
          <tr>
            <td>AI Chat</td>
            <td>25%</td>
            <td>Send prompts and view conversation history</td>
          </tr>
          <tr>
            <td>Code Editor</td>
            <td>30%</td>
            <td>View and edit code with Monaco</td>
          </tr>
          <tr>
            <td>Live Preview</td>
            <td>30%</td>
            <td>Running the live preview</td>
          </tr>
        </tbody>
      </table>
      <p>
        Drag the dividers between panels to resize them to your preference. Panel widths
        are persisted per-project in localStorage, so your layout is remembered when you
        return.
      </p>

      <h2>Hiding panels for focus</h2>
      <p>
        Use keyboard shortcuts to maximise the space you need most:
      </p>
      <ul>
        <li>
          <strong>⌘B</strong> — hides or shows the file tree panel
        </li>
        <li>
          <strong>⌘⇧E</strong> — hides or shows the code editor panel
        </li>
      </ul>
      <p>
        Hidden panels collapse to a thin labelled strip — click the strip to restore the
        panel. Hiding both the file tree and the code editor at once gives you the maximum
        possible space for the AI chat and live preview, which is ideal when you're
        rapidly iterating on features.
      </p>

      <h2>Duplicating a project</h2>
      <p>
        From the dashboard, click the <strong>⋯</strong> menu on any project card and
        select <strong>Duplicate</strong>. This creates an independent copy of the
        project with all files and chat history intact. Useful for experimenting with a
        major change without risking your working project.
      </p>

      <h2>Deleting a project</h2>
      <p>
        Click <strong>⋯ → Delete</strong> on the project card. This permanently removes
        all project files, AI chat history, and version snapshots. The action cannot be
        undone.
      </p>

      <Callout type="warning" title="Deletion is permanent">
        Deleting a project removes all files, version history, and AI chat. There is no
        recovery. Sync to GitHub before deleting if you need to preserve the code.
      </Callout>

      <h2>Project limits by plan</h2>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Max projects</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Free</td>
            <td>3</td>
          </tr>
          <tr>
            <td>Pro</td>
            <td>20</td>
          </tr>
          <tr>
            <td>Team</td>
            <td>100</td>
          </tr>
          <tr>
            <td>Enterprise</td>
            <td>Unlimited</td>
          </tr>
        </tbody>
      </table>
    </DocsProse>
  )
}
