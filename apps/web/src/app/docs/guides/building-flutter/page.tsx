export const metadata = {
  title: 'Building with Flutter',
  description: 'Build a cross-platform Flutter Web application with Forge AI — write once, deploy everywhere.',
}

import { Callout } from '../../_components/Callout'
import { Steps, Step } from '../../_components/Steps'

export default function BuildingFlutterPage() {
  return (
    <div>
      <h1>Building with Flutter</h1>

      <p>
        Flutter lets you write a single Dart codebase that runs on web, iOS, and Android with
        pixel-perfect fidelity. Forge AI supports Flutter Web projects with hot-reload preview,
        widget generation, and state management scaffolding.
      </p>

      <h2>What you will build</h2>
      <ul>
        <li>Flutter Web app with Material 3 design</li>
        <li>Stateful widgets with provider or Riverpod state management</li>
        <li>Navigation with <code>GoRouter</code></li>
        <li>HTTP calls to a backend API</li>
        <li>Responsive layout for desktop and mobile</li>
      </ul>

      <h2>Getting started</h2>
      <Steps>
        <Step title="Create a new project">
          Click <strong>New project</strong> and select the <strong>Flutter Web</strong> template.
          Forge AI generates a complete Flutter project with <code>pubspec.yaml</code>,{' '}
          <code>lib/main.dart</code>, and Material 3 theme pre-configured.
        </Step>
        <Step title="Describe your first screen">
          <blockquote>
            "Create a home screen with a Material 3 app bar, a grid of product cards, and a
            floating action button to add a new product."
          </blockquote>
        </Step>
        <Step title="Add navigation">
          <blockquote>
            "Add GoRouter navigation so tapping a product card navigates to a
            <code>/product/:id</code> detail screen."
          </blockquote>
        </Step>
        <Step title="Add state management">
          <blockquote>
            "Add Riverpod providers for the product list. Fetch data from
            <code>https://api.example.com/products</code> using Dio."
          </blockquote>
        </Step>
        <Step title="Make it responsive">
          <blockquote>
            "Make the product grid responsive: 1 column on mobile, 2 on tablet, 3 on desktop."
          </blockquote>
        </Step>
        <Step title="Deploy">
          Flutter Web builds to static HTML/JS/CSS. Use Forge AI's one-click deploy to publish
          to Vercel, Netlify, or Cloudflare Pages.
        </Step>
      </Steps>

      <h2>Flutter-specific tips</h2>
      <ul>
        <li>
          Specify the state management approach you prefer: <em>"Use Riverpod"</em>,{' '}
          <em>"Use Provider"</em>, or <em>"Use Bloc"</em>.
        </li>
        <li>
          Ask for platform-adaptive layouts: <em>"Make the layout adaptive — use a BottomNavigationBar
          on mobile and a NavigationRail on desktop."</em>
        </li>
        <li>
          Material 3 is enabled by default. Ask for customisation: <em>"Apply a deep purple
          Material 3 colour scheme with a dark mode toggle."</em>
        </li>
      </ul>

      <Callout type="tip">
        Flutter Web apps work best when deployed as single-page applications (SPA). Ask Forge AI:
        <em>"Configure the web build for SPA routing so deep links reload correctly."</em>
      </Callout>

      <h2>Common prompts for Flutter</h2>
      <table>
        <thead><tr><th>What you want</th><th>Prompt</th></tr></thead>
        <tbody>
          <tr><td>Custom widget</td><td>"Create a reusable <code>StatCard</code> widget with an icon, title, and value field"</td></tr>
          <tr><td>Form with validation</td><td>"Add a login form with email and password fields, inline validation, and a submit button"</td></tr>
          <tr><td>Animation</td><td>"Add a hero animation between the product list and product detail screen"</td></tr>
          <tr><td>Dark mode</td><td>"Add a dark/light mode toggle stored in shared preferences"</td></tr>
          <tr><td>Charts</td><td>"Add a line chart using fl_chart to show monthly revenue data"</td></tr>
        </tbody>
      </table>
    </div>
  )
}
