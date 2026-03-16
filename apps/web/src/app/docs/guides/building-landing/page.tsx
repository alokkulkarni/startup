import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'
import { Steps, Step } from '@/app/docs/_components/Steps'

export const metadata: Metadata = {
  title: 'Building a Landing Page',
  description: 'Build a high-converting landing page in minutes using Forge AI.',
}

export default function BuildingLandingPage() {
  return (
    <DocsProse>
      <h1>Building a Landing Page</h1>
      <p className="lead">
        Build a high-converting landing page in minutes using Forge AI.
      </p>

      <Callout type="tip">
        Use real copy from the start, not "Lorem ipsum". The AI generates better designs
        — better spacing, better hierarchy, better visual balance — when it understands
        the context of what the page is actually selling.
      </Callout>

      <Steps>
        <Step step={1} title="Start from React Landing Page template">
          From the dashboard, click <strong>Browse Templates → React Landing Page →
          Use Template</strong>. The template gives you a pre-built page structure with
          a hero, a features section, a CTA, and a footer — all styled with Tailwind CSS
          and ready to customise.
        </Step>

        <Step step={2} title="Customise the hero">
          <em>
            "Update the hero section: headline 'The faster way to [your product]',
            subheadline describing the core value proposition in one sentence, two CTA
            buttons: 'Get started free' (solid primary) and 'See a demo' (outline).
            Add a product screenshot mockup below the CTAs."
          </em>
        </Step>

        <Step step={3} title="Add a features section">
          <em>
            "Add a 3-column features grid below the hero with icons and short descriptions
            for our three main features: [feature 1], [feature 2], [feature 3]. Use a
            subtle card border and a small icon above each feature title."
          </em>
        </Step>

        <Step step={4} title="Add social proof">
          <em>
            "Add a testimonials section with three quotes from happy customers. Each quote
            includes the customer's name, role, and a company logo placeholder. Use a
            card-based layout with a subtle gradient background."
          </em>
        </Step>

        <Step step={5} title="Add pricing">
          <em>
            "Add a pricing section with two plans: Free ($0/mo, limited features) and Pro
            ($29/mo, all features). Include a 'Most Popular' badge on the Pro plan. Add a
            monthly/annual toggle."
          </em>
        </Step>

        <Step step={6} title="Add a contact / CTA section">
          <em>
            "Add a bottom CTA banner with a large headline 'Ready to get started?' and an
            email capture field with a 'Get early access' button. The section should have
            a high-contrast background to stand out from the rest of the page."
          </em>
        </Step>

        <Step step={7} title="Make it responsive">
          Switch the preview to Mobile viewport using the toggle in the preview header.
          Check that the layout looks right — then prompt the AI to fix any issues:
          <br />
          <br />
          <em>
            "Fix the mobile layout: the nav hamburger menu should open a dropdown, the
            hero stacks vertically on mobile, and the feature cards become a single
            column."
          </em>
        </Step>

        <Step step={8} title="Deploy">
          Click <strong>Deploy ▾</strong> in the header, choose your hosting platform
          (Vercel, Netlify, or Cloudflare Pages), and click Deploy. Your landing page is
          live with a public URL in about 30 seconds.
        </Step>
      </Steps>
    </DocsProse>
  )
}
