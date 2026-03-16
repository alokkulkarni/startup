import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'

export const metadata: Metadata = {
  title: 'Prompting Tips',
  description: 'How to write effective prompts that get great results from Forge AI.',
}

export default function PromptingTipsPage() {
  return (
    <DocsProse>
      <h1>Prompting Tips</h1>
      <p className="lead">
        How to write effective prompts that get great results from Forge AI's AI models.
      </p>

      <h2>Be specific and focused</h2>
      <p>
        The AI performs best when you describe one clear, concrete thing at a time. Vague
        or scope-creeping prompts produce vague results.
      </p>
      <p>
        ❌ <strong>Don't:</strong> "Build me a complete SaaS app with auth, payments, and
        a dashboard."
      </p>
      <p>
        ✅ <strong>Do:</strong> "Add a sign-in form with email and password fields, a
        'forgot password' link, and form validation using Zod."
      </p>

      <h2>Reference component names</h2>
      <p>
        The AI has your complete file tree as context on every request. Naming specific
        components makes changes surgical and precise:
      </p>
      <p>
        "In the <code>Navbar.tsx</code> component, add a notification bell icon that
        shows a red badge when <code>unreadCount {'>'} 0</code>."
      </p>
      <p>
        This tells the AI exactly where to make the change, reducing ambiguity and
        preventing it from touching unrelated parts of your codebase.
      </p>

      <h2>Describe the UI, not the implementation</h2>
      <p>
        Describe what the user <em>sees and experiences</em>, not the technical
        implementation. The AI knows the implementation details — your job is to specify
        the outcome:
      </p>
      <p>
        ✅ "Add a sidebar that slides in from the left with a smooth 300ms ease
        transition."
      </p>
      <p>
        ❌ "Use framer-motion to create a <code>motion.div</code> with{' '}
        <code>x: -240</code> initial state and spring animation."
      </p>

      <h2>Build incrementally</h2>
      <p>
        The most successful Forge AI projects follow a rhythm: start from a template,
        get the basic structure running, add one feature at a time, and deploy when
        something is stable. This avoids the AI getting overwhelmed by a multi-feature
        prompt and producing something that half-works.
      </p>

      <h2>Include error messages when debugging</h2>
      <p>
        When something breaks, paste the <em>full</em> error into the chat. Don't
        paraphrase it. The AI uses the exact error message, file name, and line number to
        make a targeted fix rather than guessing:
      </p>
      <p>
        "I'm getting this error in the browser console:{' '}
        <code>
          TypeError: Cannot read properties of undefined (reading 'map') at
          ProductList.tsx:42
        </code>
        . Here's the component: [paste code]"
      </p>

      <h2>Ask for explanations</h2>
      <p>
        The AI can teach you about your own generated code. If you don't understand how
        something works, just ask:
      </p>
      <p>
        "Explain how the authentication middleware in{' '}
        <code>apps/api/src/middleware/auth.ts</code> works."
      </p>
      <p>
        This is especially useful for onboarding teammates to a Forge AI-generated
        codebase.
      </p>

      <h2>Example prompts</h2>
      <pre>
        <code>{`// Starting a SaaS landing page
"Create a hero section with a headline, subheadline, a CTA button, and a screenshot
placeholder. Use a dark gradient background with indigo accents."

// Adding a feature to an existing app
"Add a search bar to the top of the products page. It should filter the product list
in real time as the user types, matching product name and description."

// Debugging an error
"The form submission is throwing 'Cannot POST /api/contact'. Check the Fastify API
route and fix the issue."

// Styling tweaks
"Make the card grid responsive: 1 column on mobile, 2 on tablet, 3 on desktop.
Use Tailwind breakpoints."`}</code>
      </pre>

      <Callout type="tip" title="Iterate, don't restart">
        If a change isn't quite right, refine it with a follow-up prompt rather than
        starting over: "Make the sidebar narrower and move the navigation icons to the
        left edge." Each message builds on the last, so the AI remembers the context of
        what you've already built.
      </Callout>
    </DocsProse>
  )
}
