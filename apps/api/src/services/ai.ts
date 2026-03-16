import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime'
import {
  fromTemporaryCredentials,
  fromNodeProviderChain,
} from '@aws-sdk/credential-providers'
import Anthropic from '@anthropic-ai/sdk'

const BEDROCK_MODEL = 'anthropic.claude-3-5-sonnet-20241022-v2:0'
const BEDROCK_REGION = process.env.AWS_REGION ?? 'us-east-1'

/**
 * Build the AWS credential provider for Bedrock.
 *
 * Priority order:
 *  1. If AWS_ROLE_ARN is set → AssumeRole via STS (recommended for production).
 *     The base credentials used to assume the role come from the standard chain
 *     (instance profile, ECS task role, env vars, ~/.aws/credentials).
 *  2. Otherwise → standard credential provider chain:
 *     env vars → AWS profile → EC2/ECS instance/task role → container credential URI.
 *
 * This means:
 *  - Local dev: set AWS_PROFILE or AWS_ACCESS_KEY_ID/SECRET in env (no role required)
 *  - EC2/ECS production: attach an instance/task role — no env vars needed
 *  - Cross-account / least-privilege: set AWS_ROLE_ARN to the Bedrock-scoped role
 */
function getBedrockCredentialProvider() {
  const roleArn = process.env.AWS_ROLE_ARN
  const sessionName = process.env.AWS_ROLE_SESSION_NAME ?? 'forge-bedrock-session'

  if (roleArn) {
    return fromTemporaryCredentials({
      params: {
        RoleArn: roleArn,
        RoleSessionName: sessionName,
        DurationSeconds: 3600,
      },
      // Base credentials come from the standard chain (instance profile etc.)
      masterCredentials: fromNodeProviderChain(),
    })
  }

  return fromNodeProviderChain()
}

export interface AIStreamChunk {
  type: 'text' | 'done' | 'error'
  text?: string
  error?: string
  usage?: { inputTokens: number; outputTokens: number }
}

export interface AIMessage {
  role: 'user' | 'assistant'
  content: string
}

async function* streamBedrock(
  messages: AIMessage[],
  systemPrompt: string,
  maxTokens: number,
): AsyncGenerator<AIStreamChunk> {
  const client = new BedrockRuntimeClient({
    region: BEDROCK_REGION,
    credentials: getBedrockCredentialProvider(),
  })
  const body = JSON.stringify({
    anthropic_version: 'bedrock-2023-05-31',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  })
  const cmd = new InvokeModelWithResponseStreamCommand({
    modelId: BEDROCK_MODEL,
    contentType: 'application/json',
    accept: 'application/json',
    body: new TextEncoder().encode(body),
  })
  const response = await client.send(cmd)
  if (!response.body) return

  let inputTokens = 0
  let outputTokens = 0

  for await (const event of response.body) {
    if (event.chunk?.bytes) {
      const decoded = JSON.parse(new TextDecoder().decode(event.chunk.bytes))
      if (decoded.type === 'content_block_delta' && decoded.delta?.type === 'text_delta') {
        yield { type: 'text', text: decoded.delta.text }
      } else if (decoded.type === 'message_start' && decoded.message?.usage) {
        inputTokens = decoded.message.usage.input_tokens ?? 0
      } else if (decoded.type === 'message_delta' && decoded.usage) {
        outputTokens = decoded.usage.output_tokens ?? 0
      } else if (decoded.type === 'message_stop') {
        yield { type: 'done', usage: { inputTokens, outputTokens } }
        return
      }
    }
  }
  yield { type: 'done', usage: { inputTokens, outputTokens } }
}

async function* streamAnthropic(
  messages: AIMessage[],
  systemPrompt: string,
  maxTokens: number,
): AsyncGenerator<AIStreamChunk> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const stream = client.messages.stream({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
  })
  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield { type: 'text', text: event.delta.text }
    } else if (event.type === 'message_stop') {
      const finalMsg = await stream.finalMessage()
      yield {
        type: 'done',
        usage: {
          inputTokens: finalMsg.usage.input_tokens,
          outputTokens: finalMsg.usage.output_tokens,
        },
      }
      return
    }
  }
}

async function* streamGemini(
  messages: AIMessage[],
  systemPrompt: string,
  maxTokens: number,
): AsyncGenerator<AIStreamChunk> {
  // Gemini 3.1 Pro via OpenAI-compat endpoint
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY not set')

  const body = {
    model: 'gemini-3.1-pro-preview',
    max_tokens: maxTokens,
    system: systemPrompt,
    messages,
    stream: true,
  }

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    },
  )

  if (!response.ok || !response.body) throw new Error(`Gemini error: ${response.status}`)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') {
        yield { type: 'done' }
        return
      }
      try {
        const parsed = JSON.parse(data)
        const text = parsed.choices?.[0]?.delta?.content
        if (text) yield { type: 'text', text }
      } catch {}
    }
  }
  yield { type: 'done' }
}

async function* streamOpenAI(
  messages: AIMessage[],
  systemPrompt: string,
  maxTokens: number,
): AsyncGenerator<AIStreamChunk> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY not set')

  const chatMessages = [{ role: 'system' as const, content: systemPrompt }, ...messages]
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: 'gpt-4o', max_tokens: maxTokens, messages: chatMessages, stream: true }),
  })

  if (!response.ok || !response.body) throw new Error(`OpenAI error: ${response.status}`)

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') { yield { type: 'done' }; return }
      try {
        const parsed = JSON.parse(data)
        const text = parsed.choices?.[0]?.delta?.content
        if (text) yield { type: 'text', text }
      } catch {}
    }
  }
  yield { type: 'done' }
}

const PROVIDERS = ['bedrock', 'anthropic', 'gemini', 'openai'] as const

export async function* streamAIResponse(
  messages: AIMessage[],
  systemPrompt: string,
  options?: { maxTokens?: number; temperature?: number },
): AsyncGenerator<AIStreamChunk> {
  const maxTokens = options?.maxTokens ?? 8192

  for (const provider of PROVIDERS) {
    try {
      console.log(`[AI] Trying provider: ${provider}`)
      let gen: AsyncGenerator<AIStreamChunk>
      if (provider === 'bedrock') gen = streamBedrock(messages, systemPrompt, maxTokens)
      else if (provider === 'anthropic') gen = streamAnthropic(messages, systemPrompt, maxTokens)
      else if (provider === 'gemini') gen = streamGemini(messages, systemPrompt, maxTokens)
      else gen = streamOpenAI(messages, systemPrompt, maxTokens)

      for await (const chunk of gen) {
        yield chunk
      }
      console.log(`[AI] Provider ${provider} succeeded`)
      return
    } catch (err) {
      console.warn(`[AI] Provider ${provider} failed:`, (err as Error).message)
      if (provider === 'openai') {
        yield { type: 'error', error: 'All AI providers failed. Please try again.' }
      }
    }
  }
}
