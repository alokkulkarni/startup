import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'

export const metadata: Metadata = {
  title: 'Billing & Plans',
  description: 'Forge AI plans and pricing. Start free, upgrade when you need more.',
}

export default function BillingPage() {
  return (
    <DocsProse>
      <h1>Billing &amp; Plans</h1>
      <p className="lead">
        Forge AI plans and pricing. Start free, upgrade when you need more.
      </p>

      <h2>Plans overview</h2>
      <table>
        <thead>
          <tr>
            <th>Feature</th>
            <th>Free</th>
            <th>Pro</th>
            <th>Team</th>
            <th>Enterprise</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>AI messages / day</td>
            <td>50</td>
            <td>500</td>
            <td>2,000</td>
            <td>Unlimited</td>
          </tr>
          <tr>
            <td>Projects</td>
            <td>3</td>
            <td>20</td>
            <td>100</td>
            <td>Unlimited</td>
          </tr>
          <tr>
            <td>Team members</td>
            <td>1</td>
            <td>1</td>
            <td>10</td>
            <td>Unlimited</td>
          </tr>
          <tr>
            <td>Deployments / month</td>
            <td>10</td>
            <td>100</td>
            <td>500</td>
            <td>Unlimited</td>
          </tr>
          <tr>
            <td>Real-time collaboration</td>
            <td>❌</td>
            <td>✅</td>
            <td>✅</td>
            <td>✅</td>
          </tr>
          <tr>
            <td>GitHub sync</td>
            <td>✅</td>
            <td>✅</td>
            <td>✅</td>
            <td>✅</td>
          </tr>
          <tr>
            <td>Version history</td>
            <td>✅</td>
            <td>✅</td>
            <td>✅</td>
            <td>✅</td>
          </tr>
          <tr>
            <td>Custom domains</td>
            <td>❌</td>
            <td>✅</td>
            <td>✅</td>
            <td>✅</td>
          </tr>
          <tr>
            <td><strong>Price</strong></td>
            <td><strong>$0</strong></td>
            <td><strong>$29 / mo</strong></td>
            <td><strong>Contact us</strong></td>
            <td><strong>Contact us</strong></td>
          </tr>
        </tbody>
      </table>

      <h2>Upgrading your plan</h2>
      <ol>
        <li>
          From the dashboard, click your current plan badge in the top-right corner, or
          navigate to <strong>Account → Billing</strong>.
        </li>
        <li>
          Click <strong>Upgrade</strong> to see the available plans.
        </li>
        <li>
          Select a plan and click <strong>Continue</strong>.
        </li>
        <li>
          Complete the Stripe checkout with your card details. Your upgrade takes effect
          immediately — new limits apply as soon as the payment processes.
        </li>
      </ol>

      <h2>Managing your subscription</h2>
      <p>
        Visit <strong>Account → Billing → Manage Subscription</strong> to access the
        Stripe customer portal where you can:
      </p>
      <ul>
        <li>Change between plans (upgrades and downgrades)</li>
        <li>Update your payment method</li>
        <li>View and download previous invoices</li>
        <li>Cancel your subscription</li>
      </ul>

      <h2>AI message rate limits</h2>
      <p>
        When you reach your daily AI message limit, the chat panel shows a notification
        explaining the limit and offering a direct link to upgrade. The limit resets every
        day at midnight UTC — you can see when it resets in the chat panel.
      </p>

      <Callout type="tip">
        On the Free plan, use your 50 daily messages strategically. Write detailed,
        specific prompts rather than many short refinements — a single well-crafted
        prompt produces better results than five vague follow-ups.
      </Callout>

      <h2>Cancellation</h2>
      <p>
        You can cancel your subscription at any time from the Stripe billing portal. Your
        access continues until the end of the current billing period — you won't be
        charged again after cancellation. Your project data is retained for 30 days after
        cancellation, giving you time to export your code to GitHub before it is removed.
      </p>

      <Callout type="info" title="Stripe checkout">
        All payments are processed securely by Stripe. Forge AI never stores your card
        details — they are held exclusively by Stripe's PCI-compliant vault.
      </Callout>
    </DocsProse>
  )
}
