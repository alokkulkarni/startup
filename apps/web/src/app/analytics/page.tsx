'use client'
import Link from 'next/link'
import { useAnalytics } from '@/hooks/useAnalytics'
import { StatCard } from '@/components/analytics/StatCard'
import { LineChart } from '@/components/analytics/LineChart'
import { ActivityFeed } from '@/components/analytics/ActivityFeed'
import { Button } from '@/components/ui/button'

export default function AnalyticsPage() {
  const { overview, aiSeries, activity, loading } = useAnalytics()

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Top bar — same pattern as Templates gallery */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between sticky top-0 bg-gray-950/95 backdrop-blur-sm z-10">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center font-bold text-white text-sm">
            F
          </Link>
          <span className="text-gray-600">/</span>
          <span className="font-semibold text-sm text-white">Analytics</span>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="secondary" size="sm">← Dashboard</Button>
          </Link>
        </div>
      </header>

      <div className="p-6 max-w-7xl mx-auto">
        {/* Page heading */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-sm text-gray-500 mt-1">Workspace usage overview · Last 30 days</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard icon="🤖" label="AI Requests" value={overview?.aiRequests ?? 0} loading={loading} sublabel="Last 30 days" />
          <StatCard icon="🚀" label="Deployments" value={overview?.deployments ?? 0} loading={loading} sublabel="Last 30 days" />
          <StatCard icon="📁" label="Active Projects" value={overview?.activeProjects ?? 0} loading={loading} />
          <StatCard icon="👥" label="Active Members" value={overview?.activeMembers ?? 0} loading={loading} />
        </div>

        {/* Charts row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">AI Requests — Last 30 Days</h2>
            <LineChart
              data={aiSeries}
              label=""
              color="#6366f1"
            />
          </div>

          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
            <h2 className="text-sm font-semibold text-gray-300 mb-4">Usage Breakdown</h2>
            <div className="space-y-4">
              {[
                { label: 'Projects Created', value: overview?.projectsCreated ?? 0, max: Math.max(overview?.projectsCreated ?? 1, 1), color: 'bg-violet-500' },
                { label: 'Templates Cloned', value: overview?.templateClones ?? 0, max: Math.max(overview?.templateClones ?? 1, 1), color: 'bg-blue-500' },
                { label: 'Deployments', value: overview?.deployments ?? 0, max: Math.max(overview?.deployments ?? 1, 1), color: 'bg-emerald-500' },
              ].map(item => (
                <div key={item.label}>
                  <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>{item.label}</span>
                    <span className="font-medium text-gray-200">{item.value}</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: loading ? '0%' : `${Math.min((item.value / item.max) * 100, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Activity feed */}
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-300">Recent Activity</h2>
            <span className="text-xs text-gray-500">Last 20 events</span>
          </div>
          <ActivityFeed events={activity} loading={loading} />
        </div>
      </div>
    </div>
  )
}
