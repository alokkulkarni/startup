export const metadata = {
  title: 'AI Chat',
  description: 'Use the AI chat panel to generate, edit, and debug your application using natural language.',
}

import { Callout } from '../../_components/Callout'
import { Steps, Step } from '../../_components/Steps'

export default function AiChatPage() {
  return (
    <div>
      <h1>AI Chat</h1>

      <p>
        The AI chat panel is the core of Forge AI. Every message you send is processed by Claude
        as the primary model, with automatic fallback to OpenAI (GPT) and Google Gemini if needed.
        You never need to think about which model is running — Forge AI always picks the best
        available option.
      </p>

      <h2>How to use the chat</h2>
      <Steps>
        <Step title="Open a project">
          Create a new project from the dashboard or open an existing one. The AI chat panel is on
          the left side of the editor.
        </Step>
        <Step title="Describe what you want">
          Type a message describing the feature, component, or fix you want. Use plain language —
          you do not need to be technical.
        </Step>
        <Step title="Review generated code">
          Forge AI writes the code and applies it to your project. The live preview refreshes
          automatically.
        </Step>
        <Step title="Iterate">
          Ask follow-up questions, request changes, or describe new features. The AI has full
          context of your entire project.
        </Step>
      </Steps>

      <h2>What you can ask the AI</h2>
      <ul>
        <li>Generate new pages, components, or features</li>
        <li>Fix bugs — paste an error message and ask the AI to resolve it</li>
        <li>Refactor existing code</li>
        <li>Add styling, animations, or layout changes</li>
        <li>Connect frontend forms to backend API endpoints</li>
        <li>Add authentication, validation, or access control</li>
        <li>Write tests for existing components</li>
      </ul>

      <Callout type="tip">
        See the <a href="/docs/guides/prompting-tips">Prompting Tips</a> guide for advice on
        writing prompts that produce the best results.
      </Callout>

      <h2>Context awareness</h2>
      <p>
        Forge AI automatically includes your current project files as context in every message.
        This means you can reference file names, component names, or API routes directly and the
        AI will understand what you mean.
      </p>

      <h2>Chat history</h2>
      <p>
        Your conversation history is saved per project. You can scroll back through all previous
        messages. On Team plan workspaces, all collaborators share the same chat history so
        everyone can see what was asked and why decisions were made.
      </p>

      <h2>Rate limits</h2>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Messages per day</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Free</td>
            <td>20</td>
          </tr>
          <tr>
            <td>Pro</td>
            <td>300</td>
          </tr>
          <tr>
            <td>Team</td>
            <td>1,500 (shared per workspace)</td>
          </tr>
        </tbody>
      </table>

      <Callout type="info">
        Rate limits reset at midnight UTC every day. Upgrade your plan in{' '}
        <a href="/docs/workspace/billing">Billing &amp; Plans</a> to increase your limit.
      </Callout>

      <h2>Streaming responses</h2>
      <p>
        AI responses stream in real time as the model generates them. Code changes are applied
        progressively to your editor so you can see the output being written character by character.
      </p>

      <h2>Error fixing</h2>
      <p>
        If your app throws a runtime error, a <strong>Fix with AI</strong> button appears in the
        error overlay. Clicking it sends the full error, stack trace, and relevant file context to
        the AI automatically — no copying and pasting required.
      </p>

      <h2>Shared AI context in teams</h2>
      <p>
        On Team plan workspaces, every member contributes to and reads from a shared conversation
        history. When one member asks the AI to add a feature, the next member to open the project
        can see exactly what was requested and how the AI responded.
      </p>
    </div>
  )
}
