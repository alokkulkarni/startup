export const metadata = {
  title: 'GitHub Sync',
  description: 'Connect your Forge AI project to a GitHub repository and keep your code in sync.',
}

import { Callout } from '../../_components/Callout'
import { Steps, Step } from '../../_components/Steps'

export default function GitHubSyncPage() {
  return (
    <div>
      <h1>GitHub Sync</h1>

      <p>
        GitHub Sync connects your Forge AI project to a GitHub repository. Every change you make
        in Forge AI can be pushed to GitHub, and you can pull the latest changes back in from
        GitHub at any time.
      </p>

      <h2>Setting up GitHub Sync</h2>
      <Steps>
        <Step title="Open project settings">
          Inside your project, click the <strong>Settings</strong> icon in the top toolbar.
        </Step>
        <Step title="Connect to GitHub">
          Click <strong>Connect GitHub</strong>. You will be redirected to GitHub to authorise
          Forge AI to access your repositories.
        </Step>
        <Step title="Choose a repository">
          Select an existing repository or create a new one. Forge AI will use this repository
          as the remote for your project.
        </Step>
        <Step title="Push your code">
          Click <strong>Push to GitHub</strong> to create an initial commit. All future changes
          can be pushed with a single click.
        </Step>
      </Steps>

      <h2>Pushing changes</h2>
      <p>
        When you are ready to commit your changes:
      </p>
      <ol>
        <li>Open the <strong>Git</strong> panel in the top toolbar</li>
        <li>Review the list of changed files</li>
        <li>Enter a commit message</li>
        <li>Click <strong>Push</strong></li>
      </ol>
      <p>
        Forge AI creates a commit with your message and pushes it to the connected remote branch.
      </p>

      <h2>Pulling from GitHub</h2>
      <p>
        To pull the latest changes from GitHub into Forge AI, click <strong>Pull</strong> in the
        Git panel. If there are conflicts, Forge AI will highlight them so you can resolve them
        manually or ask the AI to help.
      </p>

      <Callout type="tip">
        Ask the AI: <em>"Resolve the merge conflicts in <code>src/App.tsx</code>"</em> and it will
        merge the changes automatically.
      </Callout>

      <h2>Branch management</h2>
      <p>
        You can create, switch, and delete branches from the Git panel. Each branch maps to a
        separate version of your project that you can work on independently.
      </p>

      <h2>Security</h2>
      <p>
        GitHub access tokens are stored securely in the Forge AI backend and are never exposed in
        the UI. You can revoke access at any time from your GitHub account settings under{' '}
        <strong>Authorized OAuth Apps</strong>.
      </p>

      <Callout type="info">
        GitHub Sync is available on all plans including Free.
      </Callout>
    </div>
  )
}
