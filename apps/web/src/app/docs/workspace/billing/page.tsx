export const metadata = {
  title: 'Billing & Plans',
  description: 'Compare Forge AI plans and manage your subscription.',
}

import { Callout } from '../../_components/Callout'

export default function BillingPage() {
  return (
    <div>
      <h1>Billing &amp; Plans</h1>

      <p>
        Forge AI offers three plans to suit individuals, growing projects, and professional teams.
      </p>

      <h2>Plan comparison</h2>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Free</th>
            <th>Pro</th>
            <th>Team</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>AI messages per day</td>
            <td>20</td>
            <td>300</td>
            <td>1,500</td>
          </tr>
          <tr>
            <td>Projects</td>
            <td>3</td>
            <td>50</td>
            <td>Unlimited</td>
          </tr>
          <tr>
            <td>Files per project</td>
            <td>20</td>
            <td>200</td>
            <td>Unlimited</td>
          </tr>
          <tr>
            <td>Live preview</td>
            <td>✓</td>
            <td>✓</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>GitHub Sync</td>
            <td>✓</td>
            <td>✓</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Version history</td>
            <td>7 days</td>
            <td>90 days</td>
            <td>Unlimited</td>
          </tr>
          <tr>
            <td>One-click deploy</td>
            <td>✓</td>
            <td>✓</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Real-time collaboration</td>
            <td>—</td>
            <td>—</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Shared AI chat history</td>
            <td>—</td>
            <td>—</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Role-based access (Admin / Member / Viewer)</td>
            <td>—</td>
            <td>—</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Priority support</td>
            <td>—</td>
            <td>✓</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Custom domain on previews</td>
            <td>—</td>
            <td>✓</td>
            <td>✓</td>
          </tr>
          <tr>
            <td>Team members</td>
            <td>1</td>
            <td>1</td>
            <td>Unlimited</td>
          </tr>
        </tbody>
      </table>

      <Callout type="info">
        AI message limits reset at midnight UTC each day.
      </Callout>

      <h2>Upgrading your plan</h2>
      <ol>
        <li>Go to your workspace settings</li>
        <li>Click the <strong>Billing</strong> tab</li>
        <li>Select <strong>Pro</strong> or <strong>Team</strong></li>
        <li>Complete checkout — you will be upgraded immediately</li>
      </ol>

      <h2>Downgrading or cancelling</h2>
      <p>
        You can downgrade or cancel at any time. Your plan stays active until the end of the
        current billing period. No prorated refunds are issued for partial months.
      </p>
      <p>
        On downgrade, if your project count exceeds the new plan limit, existing projects are
        preserved but new projects cannot be created until you are within the limit.
      </p>

      <h2>Free trial</h2>
      <p>
        New workspaces start on the Free plan automatically. No credit card is required.
      </p>

      <h2>Invoices</h2>
      <p>
        Invoices are emailed automatically after each payment. You can also download invoices from
        the <strong>Billing</strong> tab in workspace settings.
      </p>

      <Callout type="tip">
        Need a custom plan for a large team or enterprise? <a href="mailto:sales@forgeai.dev">Contact sales</a>.
      </Callout>
    </div>
  )
}
