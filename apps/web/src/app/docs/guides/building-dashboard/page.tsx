import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'
import { Steps, Step } from '@/app/docs/_components/Steps'

export const metadata: Metadata = {
  title: 'Building a Dashboard',
  description: 'Build a data-rich analytics dashboard with charts, tables, and real-time data.',
}

export default function BuildingDashboardPage() {
  return (
    <DocsProse>
      <h1>Building a Dashboard</h1>
      <p className="lead">
        Build a data-rich analytics dashboard with charts, tables, and real-time data.
      </p>

      <Callout type="tip">
        Start with hardcoded mock data, get the UI exactly right, then swap in real API
        calls. This is much faster than trying to build UI and API simultaneously — the
        AI can focus on one thing at a time.
      </Callout>

      <Steps>
        <Step step={1} title="Choose a dashboard template">
          From the dashboard, click <strong>Browse Templates</strong> and choose either{' '}
          <strong>React Dashboard</strong> (includes recharts for data visualisation and
          Tailwind CSS for styling) or <strong>Angular Material Dashboard</strong> (for
          Angular teams using Angular Material components). Click{' '}
          <strong>Use Template</strong>.
        </Step>

        <Step step={2} title="Define your metrics">
          <em>
            "Replace the placeholder charts with our actual metrics: (1) a line chart
            showing 'Monthly Revenue' for the last 12 months, (2) a bar chart showing
            'New Users per Week' for the last 8 weeks, (3) four KPI cards at the top:
            Total Revenue, Active Users, Churn Rate, and MRR Growth. Use realistic mock
            data with a slight upward trend."
          </em>
        </Step>

        <Step step={3} title="Add a data table">
          <em>
            "Add a table below the charts showing the last 20 transactions. Columns: Date,
            User, Amount, Status (a badge with green for success, yellow for pending, red
            for failed). Add pagination controls at the bottom and a search box at the
            top."
          </em>
        </Step>

        <Step step={4} title="Add a date range picker">
          <em>
            "Add a date range picker in the dashboard header that filters all the charts
            and the transactions table when the date range changes. Support presets: Last
            7 days, Last 30 days, Last 90 days, and Custom."
          </em>
        </Step>

        <Step step={5} title="Add export functionality">
          <em>
            "Add an 'Export CSV' button to the transactions table. Clicking it should
            download the currently filtered and searched transactions as a CSV file with
            the same columns as the table."
          </em>
        </Step>

        <Step step={6} title="Build the sidebar navigation">
          <em>
            "Add a collapsible sidebar on the left with navigation sections: Overview,
            Revenue, Users, Transactions, Settings. Include the company logo at the top
            and a user avatar menu at the bottom. Use an active state highlight for the
            current page."
          </em>
        </Step>

        <Step step={7} title="Make it real">
          <em>
            "Replace the mock data arrays with <code>fetch()</code> calls to
            <code>/api/v1/metrics</code>. Create the Fastify API endpoints in{' '}
            <code>apps/api/src/routes/metrics.ts</code> that return the metrics data as
            JSON. Use TypeScript interfaces for the response shapes."
          </em>
        </Step>

        <Step step={8} title="Deploy">
          Click <strong>Deploy ▾ → Vercel</strong> (recommended for React dashboards)
          and follow the deployment flow. Your dashboard is live in about 30 seconds.
        </Step>
      </Steps>
    </DocsProse>
  )
}
