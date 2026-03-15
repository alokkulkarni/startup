# AWS IAM Setup for Forge AI — Bedrock Access

Forge AI uses **IAM role assumption** for AWS Bedrock — no hardcoded credentials.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  Local Dev                Production (EC2/ECS/EKS)              │
│                                                                  │
│  ~/.aws/credentials   OR   Instance/Task/Pod Role               │
│  AWS_PROFILE          →    (automatic, no env vars needed)       │
│         │                          │                            │
│         ▼                          ▼                            │
│    Base Credentials (fromNodeProviderChain)                      │
│         │                                                        │
│         ▼  (if AWS_ROLE_ARN is set)                              │
│    STS AssumeRole → Temporary Credentials (1h TTL)               │
│         │                                                        │
│         ▼                                                        │
│    BedrockRuntimeClient (InvokeModelWithResponseStream)          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Step 1: Create the IAM Policy

```bash
aws iam create-policy \
  --policy-name ForgeAIBedrockPolicy \
  --policy-document file://infra/aws/bedrock-policy.json \
  --description "Allows Forge AI to invoke Bedrock foundation models"
```

Note the returned `PolicyArn` — you'll need it in Step 2.

---

## Step 2: Create the IAM Role

Edit `bedrock-role-trust-policy.json` — replace placeholders:
- `ACCOUNT_ID` → your AWS account ID (e.g. `123456789012`)
- `REGION` → your AWS region (e.g. `us-east-1`)
- `OIDC_ID` → EKS OIDC provider ID (only if using EKS/IRSA)

```bash
aws iam create-role \
  --role-name ForgeAIBedrockRole \
  --assume-role-policy-document file://infra/aws/bedrock-role-trust-policy.json \
  --description "Role assumed by Forge AI API to access Bedrock"

aws iam attach-role-policy \
  --role-name ForgeAIBedrockRole \
  --policy-arn arn:aws:iam::ACCOUNT_ID:policy/ForgeAIBedrockPolicy
```

---

## Step 3: Configure Forge AI

### Option A — Production on EC2 / ECS (recommended)

Attach `ForgeAIBedrockRole` directly as the **instance profile** (EC2) or **task role** (ECS).  
No environment variables needed — the SDK picks up the role automatically.

```bash
# EC2: attach instance profile
aws iam create-instance-profile --instance-profile-name ForgeAIBedrockProfile
aws iam add-role-to-instance-profile \
  --instance-profile-name ForgeAIBedrockProfile \
  --role-name ForgeAIBedrockRole

# ECS: set taskRoleArn in your task definition
# "taskRoleArn": "arn:aws:iam::ACCOUNT_ID:role/ForgeAIBedrockRole"
```

### Option B — Cross-account or explicit role assumption

Set `AWS_ROLE_ARN` in `apps/api/.env`. The API will call `sts:AssumeRole` on startup of each request:

```bash
AWS_REGION=us-east-1
AWS_ROLE_ARN=arn:aws:iam::ACCOUNT_ID:role/ForgeAIBedrockRole
AWS_ROLE_SESSION_NAME=forge-bedrock-session   # optional
```

The base credentials (used to assume the role) come from the standard chain:
- EC2/ECS: instance/task role (no extra config)
- Local dev: `AWS_PROFILE` or `~/.aws/credentials`

### Option C — Local development only

Use a developer IAM user with the Bedrock policy attached directly (not recommended for shared envs):

```bash
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...
```

> ⚠️  Never commit real credentials. Use `AWS_PROFILE` and `~/.aws/credentials` instead.

### Option D — Local dev with AWS SSO / named profile

```bash
# ~/.aws/config
[profile forge-dev]
sso_start_url = https://your-org.awsapps.com/start
sso_region = us-east-1
sso_account_id = 123456789012
sso_role_name = ForgeAIDeveloper
region = us-east-1
```

```bash
# apps/api/.env
AWS_REGION=us-east-1
AWS_PROFILE=forge-dev
# No keys needed — SDK uses the SSO profile
```

---

## Minimum IAM Permissions

The `bedrock-policy.json` grants least-privilege access:

| Action | Resource | Purpose |
|--------|----------|---------|
| `bedrock:InvokeModel` | Claude 3.5 Sonnet, Claude 3 Sonnet, Claude 3 Haiku | Generate AI responses |
| `bedrock:InvokeModelWithResponseStream` | Same models | Streaming AI responses |
| `bedrock:ListFoundationModels` | `*` | Health check / model discovery |
| `bedrock:GetFoundationModel` | `*` | Model metadata |

> Add more model ARNs to the policy if you enable additional Bedrock models.

---

## Enabling Bedrock Models

Before using a model, it must be **enabled** in your AWS account:

1. Open [AWS Bedrock Console](https://console.aws.amazon.com/bedrock/)
2. Go to **Model access** → **Manage model access**
3. Enable: **Anthropic Claude 3.5 Sonnet**, **Claude 3 Sonnet**, **Claude 3 Haiku**
4. Wait for access to be granted (usually instant for Anthropic models)

---

## How the Code Works

```typescript
// services/ai.ts — credential provider logic

function getBedrockCredentialProvider() {
  const roleArn = process.env.AWS_ROLE_ARN

  if (roleArn) {
    // Assume the role via STS (1h TTL, auto-refreshed by SDK)
    return fromTemporaryCredentials({
      params: { RoleArn: roleArn, RoleSessionName: 'forge-bedrock-session' },
      masterCredentials: fromNodeProviderChain(),  // base creds
    })
  }

  // Standard chain: env vars → profile → EC2/ECS instance metadata
  return fromNodeProviderChain()
}

// Client is created per-request with fresh credentials
const client = new BedrockRuntimeClient({
  region: BEDROCK_REGION,
  credentials: getBedrockCredentialProvider(),
})
```
