import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'

export const metadata: Metadata = {
  title: 'Members & Roles',
  description: 'Manage who has access to your projects and what they can do.',
}

export default function MembersRolesPage() {
  return (
    <DocsProse>
      <h1>Members &amp; Roles</h1>
      <p className="lead">
        Manage who has access to your projects and what they can do.
      </p>

      <h2>Role overview</h2>
      <p>
        Forge AI uses three roles to control what each person can do within a project:
      </p>
      <ul>
        <li>
          <strong>Owner</strong> — Full control over the project. The owner can delete
          the project, manage all members, perform all editor actions, and do anything an
          editor can. There is exactly one owner per project — the person who created it.
          Ownership cannot be transferred.
        </li>
        <li>
          <strong>Editor</strong> — Can send AI prompts, edit files directly in the
          Monaco editor, deploy the project, manage environment variables, and push to
          GitHub. Cannot manage members or delete the project.
        </li>
        <li>
          <strong>Viewer</strong> — Read-only access. Can view all files, read the full
          AI chat history, and see deployment status. Cannot send AI prompts, edit code,
          or deploy. Ideal for clients, stakeholders, and executives who need visibility
          without risk.
        </li>
      </ul>

      <h2>Inviting members</h2>
      <ol>
        <li>In the editor, open <strong>Settings → Members</strong>.</li>
        <li>Enter the member's email address in the invite field.</li>
        <li>Select their role: <strong>Editor</strong> or <strong>Viewer</strong>.</li>
        <li>
          Click <strong>Invite</strong>. They receive an email with a link to join. If
          they don't have a Forge AI account, they'll be prompted to create one when they
          click the link.
        </li>
      </ol>

      <h2>Changing a member's role</h2>
      <p>
        In <strong>Settings → Members</strong>, find the member and click the role
        dropdown next to their name. Select the new role. The change takes effect
        immediately — an editor demoted to viewer loses the ability to send AI prompts
        and edit code the moment you save the change, without any page refresh required.
      </p>

      <h2>Removing a member</h2>
      <p>
        Click the <strong>✕</strong> button next to a member in Settings → Members.
        They lose all access to the project immediately. They will not receive a
        notification — the next time they attempt to open the project they will see an
        access denied message.
      </p>

      <h2>Permissions table</h2>
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
            <td>Push to GitHub</td>
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

      <h2>Plan limits</h2>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Max members per project</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Free</td>
            <td>1 (owner only)</td>
          </tr>
          <tr>
            <td>Pro</td>
            <td>1 (owner only)</td>
          </tr>
          <tr>
            <td>Team</td>
            <td>10</td>
          </tr>
          <tr>
            <td>Enterprise</td>
            <td>Unlimited</td>
          </tr>
        </tbody>
      </table>

      <Callout type="info" title="Viewer role use case">
        The Viewer role is ideal for clients, stakeholders, or executives who need to
        review progress and read the AI chat history without the risk of accidentally
        making changes or consuming AI message quota.
      </Callout>
    </DocsProse>
  )
}
