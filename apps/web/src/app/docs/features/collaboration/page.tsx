export const metadata = {
  title: 'Team Collaboration',
  description: 'Real-time multi-user editing, shared AI chat history, and role-based access in Forge AI.',
}

import { Callout } from '../../_components/Callout'

export default function CollaborationPage() {
  return (
    <div>
      <h1>Team Collaboration</h1>

      <p>
        Forge AI is built for teams. Multiple people can edit the same project simultaneously,
        share an AI chat history, and work within a clear permission structure — all in real time.
      </p>

      <h2>Real-time co-editing</h2>
      <p>
        Every collaborator's changes appear immediately in every other collaborator's editor.
        Forge AI uses a real-time sync engine that merges concurrent edits without conflicts — no
        file locking, no stale state, no lost work.
      </p>

      <ul>
        <li>Cursor positions for each collaborator are shown with colour-coded labels</li>
        <li>All file changes — code, assets, configuration — are synced in real time</li>
        <li>Changes persist even if one collaborator's connection drops momentarily</li>
      </ul>

      <Callout type="tip">
        Real-time collaboration is available on the <strong>Team plan</strong>. Pro users can share
        a project via GitHub Sync.
      </Callout>

      <h2>Shared AI chat history</h2>
      <p>
        On Team plan workspaces, all collaborators share the same AI chat history for each project.
        This means:
      </p>
      <ul>
        <li>Every teammate can see what was asked and why decisions were made</li>
        <li>New team members can get up to speed by reading the conversation history</li>
        <li>Any team member can continue an AI conversation that another started</li>
      </ul>

      <h2>Role-based access control</h2>
      <p>
        Every workspace member has one of three roles. Roles are enforced on both the frontend and
        the backend — not just a UI restriction.
      </p>

      <table>
        <thead>
          <tr>
            <th>Role</th>
            <th>What they can do</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td><strong>Admin</strong></td>
            <td>
              Full access. Manage members, billing, and settings. Create, edit, and delete any
              project.
            </td>
          </tr>
          <tr>
            <td><strong>Member</strong></td>
            <td>
              Create and edit projects, use AI chat, push to GitHub, and deploy. Cannot manage
              billing or remove other members.
            </td>
          </tr>
          <tr>
            <td><strong>Viewer</strong></td>
            <td>
              Read-only access. Can view projects, browse files, and read AI chat history. Cannot
              make changes or trigger deployments.
            </td>
          </tr>
        </tbody>
      </table>

      <h2>Inviting collaborators</h2>
      <ol>
        <li>Open your workspace settings</li>
        <li>Navigate to the <strong>Members</strong> tab</li>
        <li>Enter an email address and select a role</li>
        <li>Click <strong>Send invite</strong></li>
      </ol>
      <p>
        The invited person receives an email with a link to join the workspace. See{' '}
        <a href="/docs/workspace/members-roles">Members &amp; Roles</a> for full details.
      </p>

      <h2>Project visibility</h2>
      <p>
        Projects are private by default. Only workspace members with the appropriate role can view
        or edit them.
      </p>

      <Callout type="info">
        Team plan workspaces support up to 999 projects and 1,500 AI messages per day shared across
        the workspace. See <a href="/docs/workspace/billing">Billing &amp; Plans</a> for limits.
      </Callout>
    </div>
  )
}
