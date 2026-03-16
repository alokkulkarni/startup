import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'
import { NumberedSteps } from '@/app/docs/_components/Steps'

export const metadata: Metadata = {
  title: 'AI Chat',
  description: 'The AI chat panel is your primary interface for building with Forge AI.',
}

export default function AiChatPage() {
  return (
    <DocsProse>
      <h1>AI Chat</h1>
      <p className="lead">
        The AI chat panel is your primary interface for building with Forge AI. Describe
        what you want — the AI understands your entire codebase and makes targeted changes.
      </p>

      <h2>Overview</h2>
      <p>
        Every message you send is processed by Claude (via AWS Bedrock) as the primary
        model, with automatic fallback to Anthropic direct, then Gemini 2.0 Flash, then
        GPT-4o. You never need to think about which model is running — Forge AI always
        gives you a response. The AI has full access to your project's file tree on every
        single request, so it always understands the architecture of what it's working on.
      </p>

      <h2>Sending prompts</h2>
      <p>
        Type any natural language instruction in the chat input and press{' '}
        <strong>Enter</strong> (or click Send). You can reference specific files,
        components, and behaviours. Here are some examples of effective prompts:
      </p>
      <ul>
        <li>"Add a dark mode toggle that persists to localStorage"</li>
        <li>
          "In <code>UserCard.tsx</code>, replace the placeholder avatar with an initials
          circle"
        </li>
        <li>
          "Add form validation to the signup form using react-hook-form"
        </li>
      </ul>

      <h2>Streaming responses</h2>
      <p>
        Responses stream in real time via Server-Sent Events (SSE). As the AI generates
        code, you see its thinking and file changes appear live in the chat panel. File
        updates are applied incrementally to the editor and picked up by the live preview's
        HMR — you often see the app change before the response has finished streaming.
      </p>

      <h2>Full codebase context</h2>
      <p>
        The AI receives your complete file tree and file contents with every request. This
        means it understands your component hierarchy, data models, and existing patterns.
        It doesn't just append code — it integrates changes that fit naturally into your
        existing architecture. You don't need to paste code into the chat; the AI can see
        it all.
      </p>

      <h2>Conversation history</h2>
      <p>
        Your entire chat history is saved and visible to all workspace members with
        project access. Every AI-generated change has a permanent record of the prompt
        that created it, making it easy to understand why the code looks the way it does
        — even weeks later or for a new team member onboarding to the project.
      </p>

      <h2>Rate limits</h2>
      <p>
        The number of AI messages you can send per day depends on your plan:
      </p>
      <table>
        <thead>
          <tr>
            <th>Plan</th>
            <th>Daily limit</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Free</td>
            <td>50 messages</td>
          </tr>
          <tr>
            <td>Pro</td>
            <td>500 messages</td>
          </tr>
          <tr>
            <td>Team</td>
            <td>2,000 messages</td>
          </tr>
          <tr>
            <td>Enterprise</td>
            <td>Unlimited</td>
          </tr>
        </tbody>
      </table>

      <Callout type="info">
        Rate limits reset daily at midnight UTC. When you reach the limit, the chat panel
        shows an upgrade prompt with a link to the billing page.
      </Callout>

      <h2>Auto-healing</h2>
      <p>
        When the live preview crashes or throws an unhandled error, Forge AI doesn't just
        show you the red screen — it automatically attempts to fix the problem:
      </p>
      <ol>
        <li>Captures the full error message and stack trace from the WebContainer</li>
        <li>Sends a targeted diagnostic fix prompt to the AI on your behalf</li>
        <li>Applies the fix and restarts the live preview</li>
      </ol>
      <p>
        This auto-healing loop runs up to <strong>3 times</strong> before Forge AI pauses
        and asks for your input.
      </p>

      <Callout type="tip" title="Let auto-healing work">
        Allow the 3 auto-heal attempts before intervening. The AI uses the real stack
        trace from the crash to make precise, targeted fixes — often resolving the issue
        without you needing to type a single thing.
      </Callout>

      <h2>Best practices</h2>
      <NumberedSteps>
        <div>
          <strong>Be specific</strong> — Include file names when you know them and describe
          what you see (the user-facing behaviour), not the implementation detail. "The
          dropdown doesn't close when you click outside it" is better than "add an
          onClickOutside handler".
        </div>
        <div>
          <strong>One feature at a time</strong> — Don't describe your entire application
          in a single prompt. Break work into discrete features and send them one at a
          time. Each prompt builds on the last.
        </div>
        <div>
          <strong>Reference components by name</strong> — "In the{' '}
          <code>Header</code> component, add a notification bell icon" is more precise
          than "add a notification bell somewhere in the header area".
        </div>
        <div>
          <strong>Include error messages when debugging</strong> — Paste the full error
          text into the chat. The AI uses the exact error message and line number to make
          precise fixes rather than guessing.
        </div>
      </NumberedSteps>
    </DocsProse>
  )
}
