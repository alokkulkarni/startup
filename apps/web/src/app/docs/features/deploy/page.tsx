import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'
import { Cards, Card } from '@/app/docs/_components/Cards'
import { Steps, Step } from '@/app/docs/_components/Steps'

export const metadata: Metadata = {
  title: 'Deploy',
  description: 'Deploy your Forge AI project to production with one click. Supported platforms: Vercel, Netlify, and Cloudflare Pages.',
}

export default function DeployPage() {
  return (
    <DocsProse>
      <h1>Deploy</h1>
      <p className="lead">
        Deploy your Forge AI project to production with one click. Supported platforms:
        Vercel, Netlify, and Cloudflare Pages.
      </p>

      <h2>Deploying your project</h2>
      <Steps>
        <Step step={1} title="Click Deploy">
          Click the <strong>Deploy ▾</strong> button in the top-right of the editor
          header. A dropdown appears with your available deployment platforms.
        </Step>
        <Step step={2} title="Choose a platform">
          Select <strong>Vercel</strong>, <strong>Netlify</strong>, or{' '}
          <strong>Cloudflare Pages</strong>. If this is your first deployment, you'll be
          prompted to authorise Forge AI with the selected platform.
        </Step>
        <Step step={3} title="Wait for deployment">
          Forge AI packages your project, uploads it to the deployment platform, and
          monitors the build. The entire process typically takes 20–60 seconds. A
          progress indicator in the header tracks the deployment status.
        </Step>
        <Step step={4} title="Your app is live">
          The Deploy button changes to <strong>Live ↗</strong>. Click it to open your
          deployed application in a new tab. The URL is also shown in the Deploys panel.
        </Step>
      </Steps>

      <h2>Supported platforms</h2>
      <Cards cols={3}>
        <Card
          href="https://vercel.com"
          title="Vercel"
          icon="🔺"
          description="Best for Next.js and React. Instant global CDN, automatic HTTPS, preview deployments per branch."
        />
        <Card
          href="https://netlify.com"
          title="Netlify"
          icon="🌐"
          description="Excellent for static sites and JAMstack. Built-in form handling, edge functions, and split testing."
        />
        <Card
          href="https://pages.cloudflare.com"
          title="Cloudflare Pages"
          icon="☁️"
          description="Global edge network with 200+ PoPs, unlimited bandwidth on free tier, and custom domains."
        />
      </Cards>

      <h2>Deployment limits</h2>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Deployments / month</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Free</td>
            <td>10</td>
          </tr>
          <tr>
            <td>Pro</td>
            <td>100</td>
          </tr>
          <tr>
            <td>Team</td>
            <td>500</td>
          </tr>
          <tr>
            <td>Enterprise</td>
            <td>Unlimited</td>
          </tr>
        </tbody>
      </table>

      <h2>Environment variables</h2>
      <p>
        Click 🔧 <strong>Env</strong> in the editor header to open the environment
        variables manager. Variables you add here are passed securely to the deployment
        platform during build — they are not stored in your source code. Use this for API
        keys, database URLs, and any other secrets your application needs at runtime.
      </p>
      <Callout type="warning">
        Never commit secrets to your source code or paste them into the AI chat. Use the
        Env manager to add secrets — they are transmitted securely and never appear in
        your repository.
      </Callout>

      <h2>Deployment history</h2>
      <p>
        Click 📋 <strong>Deploys</strong> in the editor header to see a list of all
        previous deployments for this project. Each entry shows the deployment platform,
        status (success or failed), the timestamp, and the live deployment URL. Failed
        deployments include build logs to help you diagnose the issue.
      </p>

      <h2>Re-deploying after changes</h2>
      <p>
        Making more changes in the editor doesn't automatically update the live
        deployment — Forge AI deployments are explicit snapshots. When you're ready to
        push an update, click <strong>Deploy ▾ → Deploy</strong> again to create a new
        deployment with your latest code.
      </p>

      <Callout type="info">
        Deployments are snapshots. Changing code in the editor does not automatically
        update the live deployment — you must explicitly re-deploy. This gives you full
        control over when production is updated.
      </Callout>
    </DocsProse>
  )
}
