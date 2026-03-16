import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'

export const metadata: Metadata = {
  title: 'Team Collaboration',
  description: 'Real-time multi-user editing, shared AI chat history, and role-based access control.',
}

export default function CollaborationPage() {
  return (
    <DocsProse>
      <h1>Team Collaboration</h1>
      <p className="lead">
        Real-time multi-user editing, shared AI chat history, and role-based access
        control so teams can build together efficiently.
      </p>

      <h2>Real-time editing</h2>
      <p>
        Multiple team members can edit the same file simultaneously. Changes are synced
        using <strong>Yjs</strong> — a CRDT (conflict-free replicated data type) library
        that merges concurrent edits automatically. Two people can type in the same
        component at the same time and both changes are preserved without conflict, without
        either person needing to pull or merge manually.
      </p>
      <p>
        Collaborators' cursors and text selections are visible in the Monaco editor in
        real time, each in a distinct colour with the collaborator's name attached. You
        always know exactly where your teammates are working.
      </p>

      <Callout type="info">
        Real-time editing is powered by a WebSocket-based Yjs server. Edits are merged
        automatically — no manual conflict resolution is ever needed.
      </Callout>

      <h2>Shared AI chat</h2>
      <p>
        All AI conversation messages are shared across the project workspace. Every team
        member with project access can see the full chat history, understand the rationale
        behind every AI-generated change, and continue building on previous conversations.
        This means no context is lost when multiple people work on the same project across
        different sessions.
      </p>

      <h2>Roles and permissions</h2>
      <p>
        Forge AI uses a three-level RBAC hierarchy:{' '}
        <strong>Owner (3) → Editor (2) → Viewer (1)</strong>. Higher numbers have more
        permissions.
      </p>
      <table>
        <thead>
          <tr>
            <th>Action</th>
            <th>Owner</th>
            <th>Editor</th>
            <th>Viewer</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>View files &amp; chat history</td>
            <td>✅</td>
            <td>✅</td>
            <td>✅</td>
          </tr>
          <tr>
            <td>Edit files in editor</td>
            <td>✅</td>
            <td>✅</td>
            <td>❌</td>
          </tr>
          <tr>
            <td>Send AI prompts</td>
            <td>✅</td>
            <td>✅</td>
            <td>❌</td>
          </tr>
          <tr>
            <td>Deploy project</td>
            <td>✅</td>
            <td>✅</td>
            <td>❌</td>
          </tr>
          <tr>
            <td>Manage env vars</td>
            <td>✅</td>
            <td>✅</td>
            <td>❌</td>
          </tr>
          <tr>
            <td>Invite / manage members</td>
            <td>✅</td>
            <td>❌</td>
            <td>❌</td>
          </tr>
          <tr>
            <td>Delete project</td>
            <td>✅</td>
            <td>❌</td>
            <td>❌</td>
          </tr>
        </tbody>
      </table>

      <h2>Inviting team members</h2>
      <p>
        Go to <strong>Settings → Members</strong> in the editor. Enter the email address
        of the person you want to invite, select their role (Editor or Viewer), and click{' '}
        <strong>Invite</strong>. They receive an email with a link to join the project.
        If they don't have a Forge AI account yet, they'll be prompted to create one.
      </p>

      <Callout type="info" title="Plan limits">
        Team collaboration is available on all plans, but the number of members per
        project varies. Free and Pro plans support 1 member (owner only). The Team plan
        supports up to 10 members. Enterprise plans support unlimited members.
      </Callout>

      <h2>Changing and revoking roles</h2>
      <p>
        Project owners can change a member's role or remove them entirely from{' '}
        <strong>Settings → Members</strong>. Role changes take effect immediately — an
        editor demoted to viewer loses the ability to send AI prompts and edit code
        instantly, without needing to refresh the page or log out.
      </p>
    </DocsProse>
  )
}
