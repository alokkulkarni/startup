export const metadata = {
  title: 'Building with Angular',
  description: 'Scaffold and build a full Angular application with Angular Material using Forge AI.',
}

import { Callout } from '../../_components/Callout'
import { Steps, Step } from '../../_components/Steps'

export default function BuildingAngularPage() {
  return (
    <div>
      <h1>Building with Angular</h1>

      <p>
        Angular is a full-featured, TypeScript-first framework built for large-scale applications.
        Forge AI can scaffold Angular CLI projects with Angular Material, reactive forms, and
        service-based architecture.
      </p>

      <h2>What you will build</h2>
      <ul>
        <li>Angular 17+ standalone components</li>
        <li>Angular Material UI (mat-toolbar, mat-table, mat-dialog)</li>
        <li>Angular Router with lazy-loaded feature modules</li>
        <li>Reactive Forms with validation</li>
        <li>HttpClient service for API calls</li>
        <li>Auth guard protecting routes</li>
      </ul>

      <h2>Getting started</h2>
      <Steps>
        <Step title="Create a new project">
          Click <strong>New project</strong> on the Forge AI dashboard and select the{' '}
          <strong>Angular</strong> template. The scaffold includes{' '}
          <code>angular.json</code>, <code>src/app/</code> with AppComponent, routing module,
          and Angular Material already configured.
        </Step>
        <Step title="Describe your first feature">
          In the chat panel:
          <blockquote>
            "Create a products list page at <code>/products</code> using an Angular Material table
            with sortable columns for Name, Price, and Category."
          </blockquote>
        </Step>
        <Step title="Add a service">
          <blockquote>
            "Create a <code>ProductsService</code> that fetches data from
            <code>/api/products</code> using HttpClient. Inject it into the products component."
          </blockquote>
        </Step>
        <Step title="Add a create dialog">
          <blockquote>
            "Add a floating action button that opens an Angular Material dialog with a reactive
            form to create a new product."
          </blockquote>
        </Step>
        <Step title="Add routing and guards">
          <blockquote>
            "Add an auth guard that redirects unauthenticated users to <code>/login</code> when
            they try to access <code>/products</code>."
          </blockquote>
        </Step>
        <Step title="Deploy">
          Angular apps build to a static bundle. Deploy to Vercel, Netlify, or Cloudflare Pages
          using Forge AI's one-click deploy.
        </Step>
      </Steps>

      <h2>Angular-specific prompting tips</h2>
      <ul>
        <li>
          Specify whether you want <strong>standalone components</strong> (Angular 15+, no NgModules)
          or traditional module-based architecture: <em>"Use standalone components with no NgModule."</em>
        </li>
        <li>
          Ask for reactive state: <em>"Use RxJS BehaviorSubject in the service to share state
          across components."</em>
        </li>
        <li>
          Angular Material theming: <em>"Apply a custom Material 3 theme with a blue primary and
          green secondary palette."</em>
        </li>
      </ul>

      <Callout type="tip">
        Angular 17 introduced control flow (<code>@if</code>, <code>@for</code>) directly in
        templates. Ask Forge AI to use the new syntax: <em>"Use Angular 17 control flow syntax
        instead of <code>*ngIf</code> and <code>*ngFor</code>."</em>
      </Callout>

      <h2>Common prompts for Angular</h2>
      <table>
        <thead><tr><th>What you want</th><th>Prompt</th></tr></thead>
        <tbody>
          <tr><td>Feature module</td><td>"Create a lazy-loaded <code>AdminModule</code> with its own routing"</td></tr>
          <tr><td>Form validation</td><td>"Add reactive form validation with email format check and custom password strength validator"</td></tr>
          <tr><td>Interceptor</td><td>"Create an HttpInterceptor that adds an Authorization header to every outgoing request"</td></tr>
          <tr><td>Material theming</td><td>"Apply dark mode toggle using Angular Material theme switching"</td></tr>
          <tr><td>Signals</td><td>"Refactor the products service to use Angular Signals instead of BehaviorSubject"</td></tr>
        </tbody>
      </table>
    </div>
  )
}
