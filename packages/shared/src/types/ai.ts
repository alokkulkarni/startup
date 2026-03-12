export interface AIConversation {
  id: string
  projectId: string
  createdAt: string
}

export interface AIMessage {
  id: string
  conversationId: string
  role: 'user' | 'assistant'
  content: string
  tokensUsed: number | null
  model: string | null
  costUsd: number | null
  createdAt: string
}

export interface AIStreamChunk {
  type: 'delta' | 'done' | 'error' | 'files_changed'
  content?: string
  files?: FileDiff[]
  error?: string
}

export interface FileDiff {
  path: string
  diff: string
  isNew: boolean
  isDeleted: boolean
}

export interface AITaskType {
  type:
    | 'code-gen-large'
    | 'code-gen-small'
    | 'vision'
    | 'self-heal'
    | 'inline-suggest'
    | 'commit-message'
    | 'error-explain'
    | 'refactor-deep'
    | 'test-gen'
    | 'doc-gen'
}
