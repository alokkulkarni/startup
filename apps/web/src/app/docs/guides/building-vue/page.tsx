export const metadata = {
  title: 'Building with Vue',
  description: 'Build a Vue 3 application with Composition API, Pinia, and Vue Router using Forge AI.',
}

import { Callout } from '../../_components/Callout'
import { Steps, Step } from '../../_components/Steps'

export default function BuildingVuePage() {
  return (
    <div>
      <h1>Building with Vue</h1>

      <p>
        Vue 3 with Composition API and Vite is a popular choice for interactive single-page
        applications. Forge AI scaffolds Vue projects with TypeScript, Pinia state management,
        Vue Router, and Tailwind CSS.
      </p>

      <h2>What you will build</h2>
      <ul>
        <li>Vue 3 SPA with Composition API and <code>&lt;script setup&gt;</code></li>
        <li>Vue Router for multi-page navigation</li>
        <li>Pinia store for shared state</li>
        <li>Tailwind CSS for styling</li>
        <li>API integration with <code>fetch</code> or Axios</li>
      </ul>

      <h2>Getting started</h2>
      <Steps>
        <Step title="Create a new project">
          From the dashboard, click <strong>New project</strong> and select the{' '}
          <strong>Vue 3 + Vite</strong> template. The scaffold includes <code>vite.config.ts</code>,{' '}
          <code>src/main.ts</code>, Vue Router, Pinia, and Tailwind already set up.
        </Step>
        <Step title="Add a page">
          <blockquote>
            "Add a <code>/dashboard</code> route with a sidebar layout and a summary stats row
            at the top using Tailwind grid."
          </blockquote>
        </Step>
        <Step title="Add a Pinia store">
          <blockquote>
            "Create a <code>useUserStore</code> Pinia store that holds the authenticated user's
            name and email, and expose a <code>logout</code> action."
          </blockquote>
        </Step>
        <Step title="Fetch data from an API">
          <blockquote>
            "Fetch the list of projects from <code>/api/projects</code> on mount and display
            them in a card grid. Show a loading spinner while fetching."
          </blockquote>
        </Step>
        <Step title="Add route guards">
          <blockquote>
            "Add a Vue Router navigation guard that redirects unauthenticated users to
            <code>/login</code>."
          </blockquote>
        </Step>
        <Step title="Deploy">
          Vite builds a static bundle. Deploy to Vercel, Netlify, or Cloudflare Pages with
          one-click deploy in Forge AI.
        </Step>
      </Steps>

      <h2>Vue-specific tips</h2>
      <ul>
        <li>
          Prefer <code>&lt;script setup&gt;</code> — it is more concise and has better TypeScript
          support. Ask: <em>"Use <code>&lt;script setup lang='ts'&gt;</code> for all components."</em>
        </li>
        <li>
          Use <code>defineProps</code> and <code>defineEmits</code> for typed component interfaces.
        </li>
        <li>
          Composables are the Vue equivalent of React hooks: <em>"Extract the fetch logic into a
          <code>useProjects</code> composable."</em>
        </li>
      </ul>

      <Callout type="tip">
        Forge AI generates Vue 3 composables that mirror the React hooks pattern. If you come from
        React, most concepts translate directly with different syntax.
      </Callout>

      <h2>Common prompts for Vue</h2>
      <table>
        <thead><tr><th>What you want</th><th>Prompt</th></tr></thead>
        <tbody>
          <tr><td>Composable</td><td>"Create a <code>usePagination</code> composable that handles page, pageSize, and total"</td></tr>
          <tr><td>Form binding</td><td>"Add a contact form using <code>v-model</code> with validation and error messages"</td></tr>
          <tr><td>Animation</td><td>"Add a fade transition when navigating between routes"</td></tr>
          <tr><td>Global state</td><td>"Add a notifications Pinia store with <code>addNotification</code> and auto-dismiss"</td></tr>
          <tr><td>Component library</td><td>"Install Headless UI and use it for the dropdown menu and modal components"</td></tr>
        </tbody>
      </table>
    </div>
  )
}
