import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'

export const metadata: Metadata = {
  title: 'Version History',
  description: 'Forge AI takes automatic snapshots after every AI-generated change. Browse, preview, and restore any previous version.',
}

export default function VersionHistoryPage() {
  return (
    <DocsProse>
      <h1>Version History</h1>
      <p className="lead">
        Forge AI takes automatic snapshots after every AI-generated change. Browse,
        preview, and restore any previous version.
      </p>

      <h2>How snapshots work</h2>
      <p>
        After each successful AI code generation, Forge AI saves a complete snapshot of
        your project — every file, in its current state. Snapshots are linked directly to
        the chat message that triggered them, so you always have a clear record of which
        prompt caused which change. This makes it trivial to understand the history of
        your codebase and trace any modification back to its origin.
      </p>

      <h2>Viewing history</h2>
      <p>
        Click the 🕐 <strong>History</strong> button in the editor header. The history
        panel slides in from the right, showing a chronological list of snapshots with:
      </p>
      <ul>
        <li>The timestamp of the change</li>
        <li>The prompt that triggered the generation</li>
        <li>A summary of files modified</li>
      </ul>
      <p>
        Click any snapshot to preview what the code looked like at that point, without
        committing to a restore.
      </p>

      <h2>Restoring a version</h2>
      <p>
        Click <strong>Restore</strong> on any snapshot in the history panel. Forge AI
        replaces all current files with the snapshot's files and restarts the live preview
        so you can immediately verify the restored state.
      </p>

      <Callout type="warning" title="Restore replaces all files">
        Restoring a snapshot is a full rollback — every file in your project reverts to
        the state captured in that snapshot. Make sure you've pushed anything important to
        GitHub first, or the current state will be lost.
      </Callout>

      <h2>Quick undo</h2>
      <p>
        For the most recent AI change, you don't need to open the history panel. Press{' '}
        <strong>⌘Z</strong> (or click ↩ <strong>Undo</strong> in the editor header) to
        revert the last AI-generated change as a single atomic operation. This is the
        fastest way to say "that wasn't what I wanted" and try again with a refined
        prompt.
      </p>

      <h2>GitHub as a backup</h2>
      <p>
        For critical milestones — a working feature, a successful deployment, a
        demo-ready state — push your code to GitHub (click <strong>GitHub → Push</strong>
        in the editor header). GitHub commits are permanent, portable, and independent of
        Forge AI's snapshot system. Even if you delete the Forge AI project, your code
        lives on in GitHub.
      </p>

      <Callout type="tip">
        Combine <strong>⌘Z</strong> for quick, low-stakes undos with GitHub pushes for
        permanent checkpoints at meaningful milestones. This gives you a complete safety
        net for every stage of development.
      </Callout>

      <h2>Storage limits</h2>
      <p>
        Snapshots are stored per-project on the Forge AI server. For most projects and
        plans, all snapshots are retained for the lifetime of the project. On higher
        volume projects, older snapshots may be pruned after a retention window.{' '}
        <strong>Enterprise plans</strong> retain full history with no pruning. For
        long-term archival, GitHub is always the recommended approach.
      </p>
    </DocsProse>
  )
}
