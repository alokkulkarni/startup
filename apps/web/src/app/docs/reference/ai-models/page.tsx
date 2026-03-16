import type { Metadata } from 'next'
import { DocsProse } from '@/app/docs/_components/DocsProse'
import { Callout } from '@/app/docs/_components/Callout'

export const metadata: Metadata = {
  title: 'AI Models',
  description: 'Forge AI uses a multi-model architecture with Claude as the primary model and automatic fallback to GPT-4o and Gemini.',
}

export default function AiModelsPage() {
  return (
    <DocsProse>
      <h1>AI Models</h1>
      <p className="lead">
        Forge AI uses a multi-model architecture with Claude as the primary model and
        automatic fallback to GPT-4o and Gemini 2.0 Flash.
      </p>

      <h2>Model stack</h2>

      <h3>1. Claude via AWS Bedrock — Primary</h3>
      <p>
        Anthropic's Claude model accessed through AWS Bedrock using IAM role-based
        authentication. This is the first model Forge AI tries on every request.
        AWS Bedrock provides enterprise-grade reliability, compliance, and security —
        no API keys are required because authentication uses AWS IAM, making it
        suitable for corporate and regulated environments.
      </p>
      <ul>
        <li>
          <strong>Model ID:</strong>{' '}
          <code>anthropic.claude-3-5-sonnet-20241022-v2:0</code>
        </li>
        <li>
          <strong>Auth:</strong> AWS IAM role assumption
        </li>
        <li>
          <strong>Use case:</strong> All prompts — code generation, debugging,
          explanations
        </li>
      </ul>

      <h3>2. Claude via Anthropic direct — Fallback 1</h3>
      <p>
        The same Claude model accessed via the Anthropic API directly. Used if AWS
        Bedrock is unavailable due to a regional outage or configuration issue.
        Requires the <code>ANTHROPIC_API_KEY</code> environment variable to be set on
        the Forge AI server.
      </p>

      <h3>3. Gemini 2.0 Flash — Fallback 2</h3>
      <p>
        Google's fast, efficient Gemini 2.0 Flash model via the Google AI API. Used if
        both Claude endpoints are unavailable. Gemini 2.0 Flash offers a large context
        window and strong code generation capability at low latency. Requires the{' '}
        <code>GEMINI_API_KEY</code> environment variable.
      </p>

      <h3>4. GPT-4o (OpenAI) — Fallback 3</h3>
      <p>
        OpenAI's flagship GPT-4o model. Used as the final fallback if all other models
        are unavailable. Requires the <code>OPENAI_API_KEY</code> environment variable.
      </p>

      <h2>How fallback works</h2>
      <p>
        Forge AI tries each model in sequence. If a model throws an error, returns a
        rate-limit response, or is unavailable (provider outage, missing API key), it
        automatically moves to the next model in the chain:
      </p>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          flexWrap: 'wrap',
          margin: '1.5rem 0',
          padding: '1rem',
          background: 'rgba(99,102,241,0.08)',
          borderRadius: '0.75rem',
          border: '1px solid rgba(99,102,241,0.2)',
        }}
      >
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Claude (Bedrock)</span>
        <span style={{ color: '#6b7280' }}>→</span>
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Claude (Direct)</span>
        <span style={{ color: '#6b7280' }}>→</span>
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>Gemini 2.0 Flash</span>
        <span style={{ color: '#6b7280' }}>→</span>
        <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>GPT-4o</span>
      </div>
      <p>
        This happens transparently — you always see a response in the chat panel
        regardless of which model is serving it. The model used for each individual
        request is not shown in the UI.
      </p>

      <h2>Model context window</h2>
      <p>
        Each request to the AI includes:
      </p>
      <ul>
        <li>Your complete file tree with file contents</li>
        <li>The conversation history (last N turns, up to the context limit)</li>
        <li>Your current prompt</li>
      </ul>
      <p>
        The maximum output per response is <strong>8,192 tokens</strong>. For very
        large changes — a complete page rewrite, a new multi-file feature — the AI may
        need to make partial changes in one response and continue in a follow-up. If a
        change feels incomplete, send a follow-up: "Continue from where you left off."
      </p>

      <h2>Rate limits</h2>
      <p>
        Model-level rate limits imposed by the AI providers (e.g., Anthropic, Google,
        OpenAI) are separate from Forge AI's own plan-level daily message limits. If a
        provider's rate limit is hit, Forge AI falls back to the next model
        automatically — you don't see any error or interruption.
      </p>
      <p>
        Your Forge AI plan limits (50/day on Free, 500/day on Pro, etc.) are enforced
        at the application level, regardless of which underlying model serves the
        request.
      </p>

      <Callout type="info" title="Self-hosted option">
        The AWS Bedrock integration supports IAM role assumption, making it suitable for
        corporate environments where API keys are not permitted. Contact your
        administrator to configure the <code>AWS_REGION</code>,{' '}
        <code>AWS_ROLE_ARN</code>, and related IAM settings for a self-hosted Forge AI
        deployment.
      </Callout>
    </DocsProse>
  )
}
