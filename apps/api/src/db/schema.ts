import {
  pgTable, uuid, text, varchar, timestamp, boolean, integer, jsonb, index, uniqueIndex, unique
} from 'drizzle-orm/pg-core'
import { relations } from 'drizzle-orm'

// ── Users ────────────────────────────────────────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  keycloakId: text('keycloak_id').notNull().unique(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  plan: text('plan').notNull().default('free'),
  onboardingCompleted: boolean('onboarding_completed').notNull().default(false),
  onboardingStep: integer('onboarding_step').notNull().default(0),
  deletedAt: timestamp('deleted_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, t => ({
  emailIdx: uniqueIndex('users_email_idx').on(t.email),
  keycloakIdx: uniqueIndex('users_keycloak_id_idx').on(t.keycloakId),
}))

// ── Workspaces ───────────────────────────────────────────────────────────────
export const workspaces = pgTable('workspaces', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  ownerId: uuid('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  plan: text('plan').notNull().default('free'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, t => ({
  slugIdx: uniqueIndex('workspaces_slug_idx').on(t.slug),
  ownerIdx: index('workspaces_owner_idx').on(t.ownerId),
}))

// ── Workspace Members ────────────────────────────────────────────────────────
export const workspaceMembers = pgTable('workspace_members', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: text('role').notNull().default('member'),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
}, t => ({
  memberIdx: uniqueIndex('workspace_members_idx').on(t.workspaceId, t.userId),
}))

// ── Projects ─────────────────────────────────────────────────────────────────
export const projects = pgTable('projects', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  framework: text('framework').notNull().default('react'),
  status: text('status').notNull().default('active'),
  thumbnail: text('thumbnail'),
  githubRepoUrl: text('github_repo_url'),
  githubRepoOwner: text('github_repo_owner'),
  githubRepoName: text('github_repo_name'),
  githubDefaultBranch: text('github_default_branch').default('main'),
  githubLastPushedSha: text('github_last_pushed_sha'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, t => ({
  workspaceIdx: index('projects_workspace_idx').on(t.workspaceId),
}))

// ── Project Files ─────────────────────────────────────────────────────────────
export const projectFiles = pgTable('project_files', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  content: text('content').notNull().default(''),
  mimeType: text('mime_type').notNull().default('text/plain'),
  sizeBytes: integer('size_bytes').notNull().default(0),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
}, t => ({
  projectFileIdx: uniqueIndex('project_files_idx').on(t.projectId, t.path),
}))

// ── AI Conversations ──────────────────────────────────────────────────────────
export const aiConversations = pgTable('ai_conversations', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

// ── AI Messages ───────────────────────────────────────────────────────────────
export const aiMessages = pgTable('ai_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  conversationId: uuid('conversation_id').notNull().references(() => aiConversations.id, { onDelete: 'cascade' }),
  role: text('role').notNull(),
  content: text('content').notNull(),
  tokensUsed: integer('tokens_used'),
  model: text('model'),
  costUsd: text('cost_usd'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, t => ({
  convIdx: index('ai_messages_conv_idx').on(t.conversationId),
}))

// ── Relations ────────────────────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  workspaces: many(workspaces),
  memberships: many(workspaceMembers),
  githubConnections: many(githubConnections),
}))

export const workspacesRelations = relations(workspaces, ({ one, many }) => ({
  owner: one(users, { fields: [workspaces.ownerId], references: [users.id] }),
  members: many(workspaceMembers),
  projects: many(projects),
}))

export const projectsRelations = relations(projects, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [projects.workspaceId], references: [workspaces.id] }),
  files: many(projectFiles),
  conversations: many(aiConversations),
  snapshots: many(projectSnapshots),
  deployments: many(deployments),
  envVars: many(projectEnvVars),
}))

export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  project: one(projects, { fields: [aiConversations.projectId], references: [projects.id] }),
  messages: many(aiMessages),
}))

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, { fields: [workspaceMembers.workspaceId], references: [workspaces.id] }),
  user: one(users, { fields: [workspaceMembers.userId], references: [users.id] }),
}))

// ── Subscriptions ─────────────────────────────────────────────────────────────
export const subscriptions = pgTable('subscriptions', {
  id: uuid('id').primaryKey().defaultRandom(),
  workspaceId: uuid('workspace_id').notNull().references(() => workspaces.id, { onDelete: 'cascade' }).unique(),
  plan: text('plan').notNull().default('free'),
  status: text('status').notNull().default('active'),
  stripeCustomerId: text('stripe_customer_id'),
  stripeSubscriptionId: text('stripe_subscription_id'),
  stripePriceId: varchar('stripe_price_id', { length: 255 }),
  planTier: varchar('plan_tier', { length: 50 }).default('free').notNull(),
  currentPeriodEnd: timestamp('current_period_end'),
  periodStart: timestamp('period_start'),
  periodEnd: timestamp('period_end'),
  cancelAtPeriodEnd: boolean('cancel_at_period_end').notNull().default(false),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, t => ({
  workspaceIdx: uniqueIndex('subscriptions_workspace_idx').on(t.workspaceId),
}))

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  workspace: one(workspaces, { fields: [subscriptions.workspaceId], references: [workspaces.id] }),
}))

export const aiMessagesRelations = relations(aiMessages, ({ one }) => ({
  conversation: one(aiConversations, { fields: [aiMessages.conversationId], references: [aiConversations.id] }),
}))

// ── Project Snapshots ─────────────────────────────────────────────────────────
export const projectSnapshots = pgTable('project_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  filesJson: jsonb('files_json').notNull().default([]),
  triggeredBy: text('triggered_by').notNull().default('ai'),
  description: text('description'),
  label: text('label'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
})

export const projectSnapshotsRelations = relations(projectSnapshots, ({ one }) => ({
  project: one(projects, { fields: [projectSnapshots.projectId], references: [projects.id] }),
}))

// ── Deployments ───────────────────────────────────────────────────────────────
export const deployments = pgTable('deployments', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  provider: text('provider').notNull().default('vercel'),
  status: text('status').notNull().default('pending'),
  providerId: text('provider_id'),
  deployUrl: text('deploy_url'),
  errorMessage: text('error_message'),
  snapshotId: uuid('snapshot_id').references(() => projectSnapshots.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const projectEnvVars = pgTable('project_env_vars', {
  id: uuid('id').primaryKey().defaultRandom(),
  projectId: uuid('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  key: text('key').notNull(),
  valueEnc: text('value_enc').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (t) => ({
  uniqueKey: uniqueIndex('env_vars_project_key_idx').on(t.projectId, t.key),
}))

export const deploymentsRelations = relations(deployments, ({ one }) => ({
  project: one(projects, { fields: [deployments.projectId], references: [projects.id] }),
}))

export const projectEnvVarsRelations = relations(projectEnvVars, ({ one }) => ({
  project: one(projects, { fields: [projectEnvVars.projectId], references: [projects.id] }),
}))

// ── GitHub Connections ────────────────────────────────────────────────────────
export const githubConnections = pgTable('github_connections', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  githubUserId: integer('github_user_id').notNull(),
  githubLogin: text('github_login').notNull(),
  githubName: text('github_name'),
  githubAvatarUrl: text('github_avatar_url'),
  encryptedToken: text('encrypted_token').notNull(),
  tokenScope: text('token_scope').notNull().default('repo,read:user'),
  connectedAt: timestamp('connected_at').defaultNow().notNull(),
}, (t) => ({
  userIdUnique: unique().on(t.userId),
}))

export const githubConnectionsRelations = relations(githubConnections, ({ one }) => ({
  user: one(users, { fields: [githubConnections.userId], references: [users.id] }),
}))

// ── Templates ─────────────────────────────────────────────────────────────────
export const templates = pgTable('templates', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').notNull(),
  category: text('category').notNull().default('other'),
  framework: text('framework').notNull().default('react'),
  filesJson: jsonb('files_json').notNull().default([]),
  thumbnailUrl: text('thumbnail_url'),
  useCount: integer('use_count').notNull().default(0),
  avgRating: text('avg_rating').notNull().default('0'),
  ratingCount: integer('rating_count').notNull().default(0),
  isOfficial: boolean('is_official').notNull().default(false),
  isPublic: boolean('is_public').notNull().default(true),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const templateRatings = pgTable('template_ratings', {
  id: uuid('id').primaryKey().defaultRandom(),
  templateId: uuid('template_id').notNull().references(() => templates.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
}, (t) => ({
  userTemplateUniq: unique().on(t.templateId, t.userId),
}))

export const templatesRelations = relations(templates, ({ many }) => ({
  ratings: many(templateRatings),
}))

export const templateRatingsRelations = relations(templateRatings, ({ one }) => ({
  template: one(templates, { fields: [templateRatings.templateId], references: [templates.id] }),
  user: one(users, { fields: [templateRatings.userId], references: [users.id] }),
}))
