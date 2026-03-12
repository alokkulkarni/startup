import {
  pgTable, uuid, text, timestamp, boolean, integer, jsonb, index, uniqueIndex
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
}))

export const aiConversationsRelations = relations(aiConversations, ({ one, many }) => ({
  project: one(projects, { fields: [aiConversations.projectId], references: [projects.id] }),
  messages: many(aiMessages),
}))
