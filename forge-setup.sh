#!/usr/bin/env bash
# =============================================================================
# forge-setup.sh — Forge AI local development setup & teardown
# =============================================================================
# Usage:
#   ./forge-setup.sh              Full interactive setup (first-time or reset)
#   ./forge-setup.sh --start      Start all services (env files must exist)
#   ./forge-setup.sh --stop       Stop dev servers only (keep Docker running)
#   ./forge-setup.sh --restart    Restart dev servers
#   ./forge-setup.sh --teardown   Tear everything down (stop all + remove containers)
#   ./forge-setup.sh --nuke       Teardown + remove Docker volumes (wipes DB data)
#   ./forge-setup.sh --status     Show health of all running services
#   ./forge-setup.sh --logs       Tail logs from API + web dev servers
# =============================================================================

set -euo pipefail

# ── Constants ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR"
PID_DIR="$PROJECT_ROOT/.forge-pids"
LOG_DIR="$PROJECT_ROOT/.forge-logs"
API_PID_FILE="$PID_DIR/api.pid"
WEB_PID_FILE="$PID_DIR/web.pid"
API_LOG="$LOG_DIR/api.log"
WEB_LOG="$LOG_DIR/web.log"
SETUP_DONE_FLAG="$PROJECT_ROOT/.forge-setup-done"

# ── Colours ──────────────────────────────────────────────────────────────────
BOLD='\033[1m'
DIM='\033[2m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
WHITE='\033[1;37m'
RESET='\033[0m'

# ── Helpers ──────────────────────────────────────────────────────────────────
header()  { echo -e "\n${BOLD}${BLUE}══════════════════════════════════════════${RESET}"; echo -e "${BOLD}${WHITE}  $1${RESET}"; echo -e "${BOLD}${BLUE}══════════════════════════════════════════${RESET}\n"; }
step()    { echo -e "${BOLD}${CYAN}▶ $1${RESET}"; }
ok()      { echo -e "${GREEN}  ✔ $1${RESET}"; }
warn()    { echo -e "${YELLOW}  ⚠ $1${RESET}"; }
error()   { echo -e "${RED}  ✖ $1${RESET}"; }
info()    { echo -e "${DIM}  ℹ $1${RESET}"; }
ask()     { echo -e "${MAGENTA}  ? $1${RESET}"; }
divider() { echo -e "${DIM}  ────────────────────────────────────────${RESET}"; }

prompt_required() {
  local var_name="$1"
  local prompt="$2"
  local example="$3"
  local value=""
  while [[ -z "$value" ]]; do
    ask "$prompt"
    info "Example: $example"
    read -r -p "  → " value
    if [[ -z "$value" ]]; then
      error "This field is required. Please enter a value."
    fi
  done
  eval "$var_name=\"$value\""
}

prompt_secret() {
  local var_name="$1"
  local prompt="$2"
  local example="$3"
  local value=""
  while [[ -z "$value" ]]; do
    ask "$prompt"
    info "Example: $example"
    read -r -s -p "  → " value
    echo ""
    if [[ -z "$value" ]]; then
      error "This field is required. Please enter a value."
    fi
  done
  eval "$var_name=\"$value\""
}

prompt_optional() {
  local var_name="$1"
  local prompt="$2"
  local default_val="$3"
  ask "$prompt ${DIM}(press Enter to skip)${RESET}"
  [[ -n "$default_val" ]] && info "Default: $default_val"
  read -r -p "  → " value
  eval "$var_name=\"${value:-$default_val}\""
}

prompt_optional_secret() {
  local var_name="$1"
  local prompt="$2"
  ask "$prompt ${DIM}(press Enter to skip)${RESET}"
  read -r -s -p "  → " value
  echo ""
  eval "$var_name=\"${value:-}\""
}

prompt_choice() {
  local var_name="$1"
  local prompt="$2"
  shift 2
  local options=("$@")
  ask "$prompt"
  for i in "${!options[@]}"; do
    echo -e "  ${BOLD}$((i+1)))${RESET} ${options[$i]}"
  done
  local choice=""
  while true; do
    read -r -p "  → " choice
    if [[ "$choice" =~ ^[0-9]+$ ]] && (( choice >= 1 && choice <= ${#options[@]} )); then
      eval "$var_name=\"${options[$((choice-1))]}\""
      break
    fi
    error "Please enter a number between 1 and ${#options[@]}"
  done
}

prompt_yn() {
  local var_name="$1"
  local prompt="$2"
  local default="${3:-n}"
  local answer=""
  ask "$prompt [y/N]"
  read -r -p "  → " answer
  answer="${answer:-$default}"
  eval "$var_name=\"${answer,,}\""
}

wait_for_url() {
  local url="$1"
  local name="$2"
  local max="${3:-60}"
  local i=0
  printf "  Waiting for $name"
  while ! curl -sf "$url" > /dev/null 2>&1; do
    if (( i >= max )); then
      echo ""
      error "$name did not become ready within ${max}s"
      return 1
    fi
    printf "."
    sleep 2
    (( i += 2 ))
  done
  echo ""
  ok "$name is ready (${i}s)"
}

wait_for_postgres() {
  local max="${1:-30}"
  local i=0
  printf "  Waiting for PostgreSQL"
  while ! docker compose exec -T postgres pg_isready -U forge -d forge > /dev/null 2>&1; do
    if (( i >= max )); then
      echo ""
      error "PostgreSQL did not become ready within ${max}s"
      return 1
    fi
    printf "."
    sleep 2
    (( i += 2 ))
  done
  echo ""
  ok "PostgreSQL is ready (${i}s)"
}

wait_for_redis() {
  local max="${1:-20}"
  local i=0
  printf "  Waiting for Redis"
  while ! docker compose exec -T redis redis-cli ping > /dev/null 2>&1; do
    if (( i >= max )); then
      echo ""
      error "Redis did not become ready within ${max}s"
      return 1
    fi
    printf "."
    sleep 2
    (( i += 2 ))
  done
  echo ""
  ok "Redis is ready (${i}s)"
}

# ── Preflight checks ─────────────────────────────────────────────────────────
check_prereqs() {
  header "Checking Prerequisites"

  local failed=0

  # Node.js 20+
  if command -v node > /dev/null 2>&1; then
    local node_ver
    node_ver=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
    if (( node_ver >= 20 )); then
      ok "Node.js $(node -v)"
    else
      error "Node.js 20+ required, found $(node -v). Use nvm: nvm install 20 && nvm use 20"
      failed=1
    fi
  else
    error "Node.js not found. Install from https://nodejs.org or via nvm"
    failed=1
  fi

  # pnpm 9+
  if command -v pnpm > /dev/null 2>&1; then
    local pnpm_ver
    pnpm_ver=$(pnpm -v | cut -d. -f1)
    if (( pnpm_ver >= 9 )); then
      ok "pnpm $(pnpm -v)"
    else
      warn "pnpm 9+ recommended, found $(pnpm -v). Upgrading: npm install -g pnpm@9"
    fi
  else
    error "pnpm not found. Install: npm install -g pnpm@9"
    failed=1
  fi

  # Docker
  if command -v docker > /dev/null 2>&1; then
    ok "Docker $(docker --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')"
  else
    error "Docker not found. Install Docker Desktop from https://docker.com/products/docker-desktop"
    failed=1
  fi

  # Docker Compose
  if docker compose version > /dev/null 2>&1; then
    ok "Docker Compose $(docker compose version --short 2>/dev/null || echo 'v2')"
  else
    error "Docker Compose v2 not found (comes bundled with Docker Desktop)"
    failed=1
  fi

  # Docker daemon running
  if ! docker info > /dev/null 2>&1; then
    error "Docker daemon is not running. Start Docker Desktop first."
    failed=1
  fi

  # Git
  if command -v git > /dev/null 2>&1; then
    ok "Git $(git --version | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')"
  else
    warn "Git not found — not needed if already cloned"
  fi

  if (( failed )); then
    echo ""
    error "One or more prerequisites are missing. Please resolve the above and re-run."
    exit 1
  fi

  echo ""
  ok "All prerequisites satisfied."
}

# ── Collect inputs ────────────────────────────────────────────────────────────
collect_inputs() {
  header "Configuration — Required Values"

  echo -e "${BOLD}These 4 values are required for Forge AI to work locally.${RESET}"
  echo -e "All other settings will use safe defaults (Docker-provided services).\n"

  # ── AI API Keys ──────────────────────────────────────────────────────────
  divider
  echo -e "\n${BOLD}AI Provider API Keys${RESET} (Forge AI uses Bedrock → Anthropic → Gemini → OpenAI fallback chain)\n"

  prompt_secret ANTHROPIC_API_KEY \
    "Anthropic API Key (REQUIRED — primary AI fallback)" \
    "sk-ant-api03-..."
  info "Get yours at: https://console.anthropic.com"

  echo ""
  prompt_secret GEMINI_API_KEY \
    "Google Gemini API Key (REQUIRED — secondary fallback)" \
    "AIzaSy..."
  info "Get yours at: https://aistudio.google.com/apikey"

  echo ""
  prompt_secret OPENAI_API_KEY \
    "OpenAI API Key (REQUIRED — tertiary fallback)" \
    "sk-proj-..."
  info "Get yours at: https://platform.openai.com/api-keys"

  # ── Encryption Key ───────────────────────────────────────────────────────
  divider
  echo -e "\n${BOLD}Security${RESET}\n"

  local auto_enc_key
  auto_enc_key=$(node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))" 2>/dev/null || openssl rand -hex 32)

  ask "FORGE_ENCRYPTION_KEY — used to encrypt GitHub tokens at rest"
  echo -e "  ${DIM}Press Enter to auto-generate a secure key (recommended)${RESET}"
  echo -e "  ${DIM}Or paste your own 64-char hex string${RESET}"
  read -r -s -p "  → " user_enc_key
  echo ""
  FORGE_ENCRYPTION_KEY="${user_enc_key:-$auto_enc_key}"
  if [[ -z "$user_enc_key" ]]; then
    ok "Auto-generated encryption key (saved to apps/api/.env)"
  else
    ok "Custom encryption key accepted"
  fi

  # ── JWT Secret — generated here so it's available when writing api .env ────
  JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || LC_ALL=C tr -dc 'a-zA-Z0-9' < /dev/urandom | head -c 64)
  ok "Auto-generated JWT secret"

  # ── AWS Bedrock ──────────────────────────────────────────────────────────
  divider
  echo -e "\n${BOLD}AWS Bedrock Setup (primary AI provider)${RESET}\n"
  echo -e "  ${DIM}Bedrock uses Claude 3.5 Sonnet. If skipped, Anthropic/Gemini/OpenAI is used instead.${RESET}\n"

  # Snapshot any pre-existing env-var values before we write script variables
  local _env_aws_profile="${AWS_PROFILE:-${AWS_DEFAULT_PROFILE:-}}"
  local _env_aws_role_arn="${AWS_ROLE_ARN:-}"
  local _env_aws_key_id="${AWS_ACCESS_KEY_ID:-}"
  local _env_aws_secret="${AWS_SECRET_ACCESS_KEY:-}"
  local _env_aws_region="${AWS_DEFAULT_REGION:-${AWS_REGION:-us-east-1}}"

  # Initialise script variables to clean state
  AWS_REGION="us-east-1"
  AWS_PROFILE=""
  AWS_ROLE_ARN=""
  AWS_ACCESS_KEY_ID=""
  AWS_SECRET_ACCESS_KEY=""
  AWS_ROLE_SESSION_NAME="forge-bedrock-session"
  AWS_SETUP_CHOICE="Skip Bedrock — use Anthropic/Gemini/OpenAI only"

  # ── Auto-detect existing AWS configuration ──────────────────────────────
  local _aws_detected_type=""
  local _aws_detected_summary=""

  if [[ -n "$_env_aws_profile" ]]; then
    _aws_detected_type="profile"
    AWS_PROFILE="$_env_aws_profile"
    AWS_REGION="$_env_aws_region"
    _aws_detected_summary="Named profile '${AWS_PROFILE}' (from \$AWS_PROFILE env var)"
  elif [[ -n "$_env_aws_role_arn" ]]; then
    _aws_detected_type="role"
    AWS_ROLE_ARN="$_env_aws_role_arn"
    AWS_REGION="$_env_aws_region"
    _aws_detected_summary="Role ARN '${AWS_ROLE_ARN}' (from \$AWS_ROLE_ARN env var)"
  elif [[ -n "$_env_aws_key_id" ]]; then
    _aws_detected_type="static"
    AWS_ACCESS_KEY_ID="$_env_aws_key_id"
    AWS_SECRET_ACCESS_KEY="$_env_aws_secret"
    AWS_REGION="$_env_aws_region"
    _aws_detected_summary="Static access key '${AWS_ACCESS_KEY_ID:0:8}...' (from env vars)"
  elif [[ -f "$HOME/.aws/config" ]]; then
    local _file_profiles
    _file_profiles=$(grep -E '^\[(profile )?[a-zA-Z0-9_-]+\]' "$HOME/.aws/config" \
      | sed 's/\[profile //;s/\[//;s/\]//' | head -10)
    if [[ -n "$_file_profiles" ]]; then
      _aws_detected_type="profile"
      if echo "$_file_profiles" | grep -q "^default$"; then
        AWS_PROFILE="default"
      else
        AWS_PROFILE=$(echo "$_file_profiles" | head -1)
      fi
      AWS_REGION="$_env_aws_region"
      local _profile_list
      _profile_list=$(echo "$_file_profiles" | tr '\n' ', ' | sed 's/, $//')
      _aws_detected_summary="~/.aws/config found — profiles: ${_profile_list}"
    fi
  elif [[ -f "$HOME/.aws/credentials" ]]; then
    local _cred_profiles
    _cred_profiles=$(grep '^\[' "$HOME/.aws/credentials" | sed 's/\[//;s/\]//' | head -5)
    if [[ -n "$_cred_profiles" ]]; then
      _aws_detected_type="profile"
      if echo "$_cred_profiles" | grep -q "^default$"; then
        AWS_PROFILE="default"
      else
        AWS_PROFILE=$(echo "$_cred_profiles" | head -1)
      fi
      AWS_REGION="$_env_aws_region"
      local _cred_list
      _cred_list=$(echo "$_cred_profiles" | tr '\n' ', ' | sed 's/, $//')
      _aws_detected_summary="~/.aws/credentials found — profiles: ${_cred_list}"
    fi
  fi

  local _use_detected_aws="n"
  if [[ -n "$_aws_detected_type" ]]; then
    info "Existing AWS configuration detected:"
    echo -e "  ${GREEN}✔${RESET}  ${_aws_detected_summary}"
    echo ""
    prompt_yn _use_detected_aws "Use this existing AWS configuration for Bedrock?" "y"
  fi

  if [[ "$_use_detected_aws" =~ ^[Yy]$ ]]; then
    # ── Use detected config ──────────────────────────────────────────────
    case "$_aws_detected_type" in
      profile)
        # If multiple profiles exist, let user confirm/change
        local _all_profiles=""
        if [[ -f "$HOME/.aws/config" ]]; then
          _all_profiles=$(grep -E '^\[(profile )?[a-zA-Z0-9_-]+\]' "$HOME/.aws/config" \
            | sed 's/\[profile //;s/\[//;s/\]//')
        elif [[ -f "$HOME/.aws/credentials" ]]; then
          _all_profiles=$(grep '^\[' "$HOME/.aws/credentials" | sed 's/\[//;s/\]//')
        fi
        local _profile_count=1
        [[ -n "$_all_profiles" ]] && _profile_count=$(echo "$_all_profiles" | wc -l | tr -d ' ')
        if (( _profile_count > 1 )); then
          echo -e "  ${DIM}Available profiles: $(echo "$_all_profiles" | tr '\n' ' ')${RESET}"
          prompt_optional AWS_PROFILE "Which profile to use?" "$AWS_PROFILE"
        fi
        prompt_optional AWS_REGION "AWS Region" "$AWS_REGION"
        AWS_SETUP_CHOICE="Named AWS profile (~/.aws/config) — recommended for local dev"
        ok "Using AWS profile: ${AWS_PROFILE:-default}, region: ${AWS_REGION}"
        ;;
      role)
        prompt_optional AWS_REGION "AWS Region" "$AWS_REGION"
        prompt_optional AWS_ROLE_SESSION_NAME "Role Session Name" "forge-bedrock-session"
        AWS_SETUP_CHOICE="Explicit IAM role ARN (cross-account / assume-role)"
        ok "Using existing role ARN: ${AWS_ROLE_ARN}, region: ${AWS_REGION}"
        ;;
      static)
        prompt_optional AWS_REGION "AWS Region" "$AWS_REGION"
        AWS_SETUP_CHOICE="Static access keys (last resort — never commit)"
        ok "Using existing static credentials, region: ${AWS_REGION}"
        ;;
    esac
  else
    # ── Manual setup (nothing detected, or user declined existing config) ─
    [[ -n "$_aws_detected_type" ]] && info "Falling back to manual AWS configuration..."
    AWS_REGION="us-east-1"
    AWS_PROFILE=""
    AWS_ROLE_ARN=""
    AWS_ACCESS_KEY_ID=""
    AWS_SECRET_ACCESS_KEY=""
    AWS_ROLE_SESSION_NAME="forge-bedrock-session"

    prompt_choice AWS_SETUP_CHOICE "How do you want to configure AWS Bedrock?" \
      "Skip Bedrock — use Anthropic/Gemini/OpenAI only" \
      "Named AWS profile (~/.aws/config) — recommended for local dev" \
      "Explicit IAM role ARN (cross-account / assume-role)" \
      "Static access keys (last resort — never commit)"

    case "$AWS_SETUP_CHOICE" in
      "Skip Bedrock"*)
        info "Skipping Bedrock. App will use Anthropic → Gemini → OpenAI fallback."
        ;;
      "Named AWS profile"*)
        prompt_optional AWS_PROFILE "AWS Profile name" "forge-dev"
        prompt_optional AWS_REGION "AWS Region" "us-east-1"
        ok "Will use AWS_PROFILE=$AWS_PROFILE"
        ;;
      "Explicit IAM role ARN"*)
        prompt_required AWS_ROLE_ARN \
          "AWS Role ARN" \
          "arn:aws:iam::123456789012:role/ForgeAIBedrockRole"
        prompt_optional AWS_REGION "AWS Region" "us-east-1"
        prompt_optional AWS_ROLE_SESSION_NAME "Role Session Name" "forge-bedrock-session"
        ok "Will assume role: $AWS_ROLE_ARN"
        ;;
      "Static access keys"*)
        warn "Static keys are less secure. Consider using a named profile instead."
        prompt_required AWS_ACCESS_KEY_ID "AWS Access Key ID" "AKIA..."
        prompt_secret AWS_SECRET_ACCESS_KEY "AWS Secret Access Key" "wJalrX..."
        prompt_optional AWS_REGION "AWS Region" "us-east-1"
        ok "Static AWS credentials configured"
        ;;
    esac
  fi

  # ── Optional Features ────────────────────────────────────────────────────
  header "Configuration — Optional Features"
  echo -e "${DIM}Press Enter to skip any optional field.${RESET}\n"

  # GitHub Integration
  divider
  echo -e "\n${BOLD}GitHub Integration${RESET}\n"
  echo -e "  ${BOLD}You need TWO separate GitHub OAuth Apps:${RESET}\n"
  echo -e "  ${BOLD}1) Forge GitHub Integration${RESET} (code import/push/pull)"
  echo -e "     Create at:    ${CYAN}https://github.com/settings/developers${RESET}"
  echo -e "     Homepage URL: ${CYAN}http://localhost${RESET}"
  echo -e "     Callback URL: ${CYAN}http://localhost/api/v1/github/callback${RESET}\n"
  echo -e "  ${BOLD}2) Social Login${RESET} (sign in with GitHub)"
  echo -e "     Create at:    ${CYAN}https://github.com/settings/developers${RESET}"
  echo -e "     Homepage URL: ${CYAN}http://localhost${RESET}"
  echo -e "     Callback URL: ${CYAN}http://localhost/api/v1/auth/github/callback${RESET}\n"
  echo -e "  ${DIM}Enter the credentials for BOTH apps below. Both are optional but highly recommended.${RESET}\n"

  # App #1 — Forge GitHub Integration (code import/push/pull)
  echo -e "  ${BOLD}App #1 credentials${RESET} (Forge GitHub Integration)\n"
  prompt_optional GITHUB_CLIENT_ID "GitHub OAuth App Client ID (App #1 — code integration)" ""
  if [[ -n "$GITHUB_CLIENT_ID" ]]; then
    prompt_optional_secret GITHUB_CLIENT_SECRET "GitHub OAuth App Client Secret (App #1)"
  else
    GITHUB_CLIENT_SECRET=""
    info "GitHub code integration skipped (App #1)."
  fi

  # App #2 — Social Login (sign in with GitHub)
  echo -e "\n  ${BOLD}App #2 credentials${RESET} (Social Login — sign in with GitHub)\n"
  prompt_optional GITHUB_LOGIN_CLIENT_ID "GitHub OAuth App Client ID (App #2 — social login)" ""
  if [[ -n "$GITHUB_LOGIN_CLIENT_ID" ]]; then
    prompt_optional_secret GITHUB_LOGIN_CLIENT_SECRET "GitHub OAuth App Client Secret (App #2)"
  else
    GITHUB_LOGIN_CLIENT_SECRET=""
    info "GitHub social login skipped (App #2) — users won't be able to sign in with GitHub."
  fi

  # Google OAuth
  divider
  echo -e "\n${BOLD}Google OAuth${RESET} (sign in with Google — optional)\n"
  echo -e "  Create at: ${CYAN}https://console.cloud.google.com${RESET} → APIs & Services → Credentials"
  echo -e "  Callback URL: ${CYAN}http://localhost/api/v1/auth/google/callback${RESET}\n"
  prompt_optional GOOGLE_CLIENT_ID "Google OAuth Client ID" ""
  if [[ -n "$GOOGLE_CLIENT_ID" ]]; then
    prompt_optional_secret GOOGLE_CLIENT_SECRET "Google OAuth Client Secret"
  else
    GOOGLE_CLIENT_SECRET=""
    info "Google social login skipped."
  fi

  # Stripe
  divider
  echo -e "\n${BOLD}Stripe Billing${RESET} (Sprint 10 — pricing/subscriptions)\n"
  echo -e "  ${DIM}Without Stripe keys the billing UI is hidden but the app fully works.${RESET}\n"

  prompt_optional_secret STRIPE_SECRET_KEY "Stripe Secret Key (sk_test_...)"
  if [[ -n "$STRIPE_SECRET_KEY" ]]; then
    prompt_optional_secret STRIPE_WEBHOOK_SECRET "Stripe Webhook Secret (whsec_...)"
    prompt_optional STRIPE_PRO_MONTHLY_PRICE_ID "Stripe Pro Monthly Price ID" ""
    prompt_optional STRIPE_PRO_YEARLY_PRICE_ID  "Stripe Pro Yearly Price ID"  ""
    prompt_optional STRIPE_TEAM_MONTHLY_PRICE_ID "Stripe Team Monthly Price ID" ""
    prompt_optional STRIPE_TEAM_YEARLY_PRICE_ID  "Stripe Team Yearly Price ID"  ""
  else
    STRIPE_WEBHOOK_SECRET=""
    STRIPE_PRO_MONTHLY_PRICE_ID=""
    STRIPE_PRO_YEARLY_PRICE_ID=""
    STRIPE_TEAM_MONTHLY_PRICE_ID=""
    STRIPE_TEAM_YEARLY_PRICE_ID=""
    info "Stripe billing skipped."
  fi

  # Resend (email)
  divider
  echo -e "\n${BOLD}Email (Resend)${RESET} (Sprint 11 — team invitations)\n"
  echo -e "  ${DIM}Without this, invitation tokens are logged to the console for manual testing.${RESET}\n"

  prompt_optional_secret RESEND_API_KEY "Resend API Key (re_...)"
  prompt_optional RESEND_FROM_EMAIL "From Email" "noreply@forge.local"

  # Deployment providers
  divider
  echo -e "\n${BOLD}Deployment Providers${RESET} (Sprint 7 — one-click deploy)\n"
  echo -e "  ${DIM}At least one is needed to test the Deploy button.${RESET}\n"

  prompt_optional_secret FORGE_VERCEL_API_KEY    "Vercel API Token (get from vercel.com/account/tokens)"
  prompt_optional_secret FORGE_NETLIFY_API_KEY   "Netlify Personal Token (app.netlify.com/user/applications)"
  prompt_optional_secret FORGE_CF_API_TOKEN      "Cloudflare API Token"
  if [[ -n "$FORGE_CF_API_TOKEN" ]]; then
    prompt_optional FORGE_CF_ACCOUNT_ID "Cloudflare Account ID" ""
  else
    FORGE_CF_ACCOUNT_ID=""
  fi

  # Platform admin
  divider
  echo -e "\n${BOLD}Platform Admin${RESET} (owner bypass — enterprise tier + rate-limit skip)\n"
  echo -e "  ${DIM}Enter the email(s) of platform owners/admins. These accounts get unlimited${RESET}"
  echo -e "  ${DIM}usage (enterprise tier) and bypass AI rate limits on every login.${RESET}"
  echo -e "  ${DIM}Comma-separated for multiple emails.${RESET}\n"

  prompt_optional ADMIN_EMAILS "Admin email(s)" "you@example.com,cofounder@example.com"
  RATE_LIMIT_BYPASS_EMAILS="${ADMIN_EMAILS}"
}

# ── Write env files ──────────────────────────────────────────────────────────
write_env_files() {
  header "Writing Environment Files"

  # Check if files exist
  if [[ -f "$PROJECT_ROOT/apps/api/.env" ]]; then
    prompt_yn OVERWRITE_ENV "apps/api/.env already exists. Overwrite?" "n"
    if [[ "$OVERWRITE_ENV" != "y" ]]; then
      warn "Skipping apps/api/.env (keeping existing)"
      API_ENV_WRITTEN=false
    else
      API_ENV_WRITTEN=true
    fi
  else
    API_ENV_WRITTEN=true
  fi

  if [[ "$API_ENV_WRITTEN" == "true" ]]; then
    step "Writing apps/api/.env"

    # Build AWS section based on user's choice
    local aws_section=""
    case "${AWS_SETUP_CHOICE:-Skip}" in
      "Named AWS profile"*)
        aws_section="AWS_REGION=${AWS_REGION}
AWS_PROFILE=${AWS_PROFILE}"
        ;;
      "Explicit IAM role ARN"*)
        aws_section="AWS_REGION=${AWS_REGION}
AWS_ROLE_ARN=${AWS_ROLE_ARN}
AWS_ROLE_SESSION_NAME=${AWS_ROLE_SESSION_NAME}"
        ;;
      "Static access keys"*)
        aws_section="AWS_REGION=${AWS_REGION}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}"
        ;;
      *)
        aws_section="# AWS_REGION=us-east-1  # Uncomment to enable Bedrock"
        ;;
    esac

    cat > "$PROJECT_ROOT/apps/api/.env" << EOF
# ── Generated by forge-setup.sh ─────────────────────────────────────────────
# Do not commit this file. It contains secrets.

NODE_ENV=development
PORT=3001

# ── Database ────────────────────────────────────────────────────────────────
DATABASE_URL=postgres://forge:forge@localhost:5432/forge

# ── Redis ────────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── MinIO (object storage) ──────────────────────────────────────────────────
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_AVATARS=avatars
MINIO_BUCKET_SNAPSHOTS=snapshots
MINIO_BUCKET_ASSETS=assets

# ── Auth (JWT) ───────────────────────────────────────────────────────────────
JWT_SECRET=${JWT_SECRET:-forge-dev-secret-change-in-production}
APP_URL=http://localhost

# ── AWS Bedrock ──────────────────────────────────────────────────────────────
${aws_section}

# ── AI Provider Fallback Chain (Bedrock → Anthropic → Gemini → OpenAI) ──────
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
GEMINI_API_KEY=${GEMINI_API_KEY}
OPENAI_API_KEY=${OPENAI_API_KEY}

# ── Security ─────────────────────────────────────────────────────────────────
FORGE_ENCRYPTION_KEY=${FORGE_ENCRYPTION_KEY}

# ── GitHub Integration ────────────────────────────────────────────────────────
# App #1: Forge GitHub Integration (code import/push/pull via API)
GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID:-}
GITHUB_CLIENT_SECRET=${GITHUB_CLIENT_SECRET:-}

# App #2: Social Login (sign in with GitHub)
GITHUB_LOGIN_CLIENT_ID=${GITHUB_LOGIN_CLIENT_ID:-}
GITHUB_LOGIN_CLIENT_SECRET=${GITHUB_LOGIN_CLIENT_SECRET:-}

# ── Google OAuth — Social Login ───────────────────────────────────────────────
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-}

# ── Stripe (Sprint 10 — optional, billing UI hidden without these) ───────────
STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY:-}
STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET:-}
STRIPE_PRO_MONTHLY_PRICE_ID=${STRIPE_PRO_MONTHLY_PRICE_ID:-}
STRIPE_PRO_YEARLY_PRICE_ID=${STRIPE_PRO_YEARLY_PRICE_ID:-}
STRIPE_TEAM_MONTHLY_PRICE_ID=${STRIPE_TEAM_MONTHLY_PRICE_ID:-}
STRIPE_TEAM_YEARLY_PRICE_ID=${STRIPE_TEAM_YEARLY_PRICE_ID:-}

# ── Email / Invitations (Sprint 11 — optional) ───────────────────────────────
RESEND_API_KEY=${RESEND_API_KEY:-}
RESEND_FROM_EMAIL=${RESEND_FROM_EMAIL:-noreply@forge.local}
EMAIL_FROM=${RESEND_FROM_EMAIL:-noreply@forge.local}

# ── Deployment Providers (Sprint 7 — optional) ───────────────────────────────
FORGE_VERCEL_API_KEY=${FORGE_VERCEL_API_KEY:-}
FORGE_NETLIFY_API_KEY=${FORGE_NETLIFY_API_KEY:-}
FORGE_CF_API_TOKEN=${FORGE_CF_API_TOKEN:-}
FORGE_CF_ACCOUNT_ID=${FORGE_CF_ACCOUNT_ID:-}

# ── Observability (optional) ──────────────────────────────────────────────────
SENTRY_DSN=

# ── Platform Admin ───────────────────────────────────────────────────────────
# Comma-separated emails that get auto-upgraded to enterprise tier on login
# and bypass AI rate limits entirely.
ADMIN_EMAILS=${ADMIN_EMAILS:-}
RATE_LIMIT_BYPASS_EMAILS=${RATE_LIMIT_BYPASS_EMAILS:-}
EOF
    ok "apps/api/.env written"
  fi

  # Root .env (read by docker-compose for variable substitution)
  _write_root_env

  # Web env
  if [[ -f "$PROJECT_ROOT/apps/web/.env.local" ]]; then
    prompt_yn OVERWRITE_WEB_ENV "apps/web/.env.local already exists. Overwrite?" "n"
    if [[ "$OVERWRITE_WEB_ENV" != "y" ]]; then
      warn "Skipping apps/web/.env.local (keeping existing)"
    else
      _write_web_env
    fi
  else
    _write_web_env
  fi
}

_write_root_env() {
  if [[ -f "$PROJECT_ROOT/.env" ]]; then
    prompt_yn OVERWRITE_ROOT_ENV ".env already exists. Overwrite?" "n"
    [[ "$OVERWRITE_ROOT_ENV" != "y" ]] && { warn "Skipping .env (keeping existing)"; return; }
  fi
  step "Writing .env (docker-compose variables)"
  # Reuse JWT_SECRET already generated in collect_inputs; fallback for --start mode
  local _jwt_secret="${JWT_SECRET:-$(openssl rand -hex 32 2>/dev/null || LC_ALL=C tr -dc 'a-zA-Z0-9' < /dev/urandom | head -c 64)}"
  cat > "$PROJECT_ROOT/.env" << EOF
# ── Generated by forge-setup.sh — read by docker-compose ──────────────────────

# ── JWT (session signing) ─────────────────────────────────────────────────────
JWT_SECRET=${_jwt_secret}

# ── GitHub OAuth App #2 — Social Login ────────────────────────────────────────
# Callback URL: http://localhost/api/v1/auth/github/callback
GITHUB_LOGIN_CLIENT_ID=${GITHUB_LOGIN_CLIENT_ID:-}
GITHUB_LOGIN_CLIENT_SECRET=${GITHUB_LOGIN_CLIENT_SECRET:-}

# ── Google OAuth — Social Login ───────────────────────────────────────────────
# Callback URL: http://localhost/api/v1/auth/google/callback
GOOGLE_CLIENT_ID=${GOOGLE_CLIENT_ID:-}
GOOGLE_CLIENT_SECRET=${GOOGLE_CLIENT_SECRET:-}

# ── AWS Bedrock (primary AI provider) ─────────────────────────────────────────
AWS_REGION=${AWS_REGION:-us-east-1}
AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID:-}
AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY:-}
AWS_SESSION_TOKEN=${AWS_SESSION_TOKEN:-}
AWS_ROLE_ARN=${AWS_ROLE_ARN:-}
AWS_PROFILE=${AWS_PROFILE:-}

# ── AI Fallback Chain ──────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY:-}
GEMINI_API_KEY=${GEMINI_API_KEY:-}
OPENAI_API_KEY=${OPENAI_API_KEY:-}
EOF
  ok ".env written"
}

_write_web_env() {
  step "Writing apps/web/.env.local"
  cat > "$PROJECT_ROOT/apps/web/.env.local" << 'EOF'
# ── Generated by forge-setup.sh ──────────────────────────────────────────────
NEXT_PUBLIC_API_URL=http://localhost/api
EOF
  ok "apps/web/.env.local written"
}

# ── Install dependencies ──────────────────────────────────────────────────────
install_deps() {
  header "Installing Dependencies"
  step "Running pnpm install..."
  cd "$PROJECT_ROOT"
  pnpm install --frozen-lockfile 2>&1 | tail -5
  ok "Dependencies installed"
}

# ── Start Docker services ─────────────────────────────────────────────────────
start_docker() {
  header "Starting Infrastructure (Docker)"
  cd "$PROJECT_ROOT"

  # ── Detect and clean up stale duplicate stacks ──────────────────────────
  # Docker Compose names the project after the directory by default, so
  # running from two different paths (e.g. "startup" vs "forge-ai") creates
  # two stacks that fight over the same ports.
  step "Checking for existing Forge containers..."

  # Fast approach: scan container NAMES (not labels) for forge-like services
  # that are NOT prefixed with "forge_" (the canonical project prefix)
  local _stale_containers
  _stale_containers=$(docker ps -a --format '{{.Names}}' 2>/dev/null \
    | grep -iE '(postgres|redis|minio|keycloak|traefik|forge.api|forge.web)' \
    | grep -vE '^forge_' || true)

  if [[ -n "$_stale_containers" ]]; then
    warn "Found containers from a different stack that may conflict:"
    while IFS= read -r _c; do
      echo -e "  ${YELLOW}⚠${RESET}  $_c"
    done <<< "$_stale_containers"
    echo ""
    # Identify the stale project name from the first offending container
    local _stale_proj
    _stale_proj=$(docker inspect \
      --format '{{index .Config.Labels "com.docker.compose.project"}}' \
      "$(echo "$_stale_containers" | head -1)" 2>/dev/null || true)

    if [[ -n "$_stale_proj" && "$_stale_proj" != "forge" ]]; then
      info "Stopping stale stack: ${_stale_proj}"
      docker compose -p "$_stale_proj" down --remove-orphans 2>/dev/null || true
      ok "Stale stack '${_stale_proj}' removed"
    else
      warn "Could not identify stale project — removing individual containers"
      while IFS= read -r _c; do
        docker rm -f "$_c" 2>/dev/null || true
      done <<< "$_stale_containers"
      ok "Stale containers removed"
    fi
  else
    ok "No conflicting containers found"
  fi

  # ── Skip if forge stack is already fully running ─────────────────────────
  local _already_up
  _already_up=$(docker compose ps --services --filter status=running 2>/dev/null | wc -l | tr -d ' ')
  if (( _already_up >= 4 )); then
    ok "Forge infrastructure already running ($_already_up services) — skipping docker compose up"
    echo ""
    return 0
  fi

  # ── Port conflict check (uses bash /dev/tcp — no lsof needed) ────────────
  local _ports=(80 443 5432 6379 9000 5050)
  local _port_names=(Traefik/HTTP Traefik/HTTPS PostgreSQL Redis MinIO pgAdmin)
  local _conflicts=()
  for i in "${!_ports[@]}"; do
    if (echo >/dev/tcp/localhost/${_ports[$i]}) 2>/dev/null; then
      _conflicts+=("${_ports[$i]} (${_port_names[$i]})")
    fi
  done
  if [[ ${#_conflicts[@]} -gt 0 ]]; then
    warn "The following ports are already in use by another process:"
    for _c in "${_conflicts[@]}"; do echo -e "  ${RED}✖${RESET}  Port ${_c}"; done
    echo ""
    info "Find what's using a port:  lsof -iTCP:<port> -sTCP:LISTEN -n -P"
    echo ""
    local _continue_anyway=""
    prompt_yn _continue_anyway "Continue anyway (docker compose up may fail)?" "n"
    [[ ! "$_continue_anyway" =~ ^[Yy]$ ]] && { error "Aborted. Free the ports above and re-run."; exit 1; }
  fi

  step "Pulling / building / starting Docker Compose services..."
  docker compose up -d --build --remove-orphans

  echo ""
  step "Waiting for services to become healthy..."
  echo ""

  wait_for_postgres 60
  wait_for_redis 30
  wait_for_url "http://localhost:9000/minio/health/live" "MinIO" 30
  wait_for_url "http://localhost:8080/ping" "Traefik" 20

  echo ""
  ok "All infrastructure services are up"
}

# ── Run migrations ─────────────────────────────────────────────────────────────
run_migrations() {
  header "Running Database Migrations"
  cd "$PROJECT_ROOT"

  # Prefer running migrations inside the Docker container (uses internal DB URL)
  # Fall back to host-side pnpm if containers aren't up yet
  if docker compose ps api 2>/dev/null | grep -q "Up"; then
    step "Applying migrations via forge_api container..."
    docker compose exec -T api sh -c \
      "cd /app/apps/api && DATABASE_URL=postgres://forge:forge@postgres:5432/forge pnpm db:migrate 2>&1" \
      | tail -10
  else
    step "Applying migrations from host (container not running)..."
    export DATABASE_URL="${DATABASE_URL:-postgres://forge:forge@localhost:5432/forge}"
    pnpm --filter @forge/api db:migrate 2>&1 | tail -10
  fi
  ok "Migrations complete"
}

# ── Seed database ─────────────────────────────────────────────────────────────
seed_db() {
  header "Seeding Database"
  step "Seeding template marketplace (10 starter templates)..."
  cd "$PROJECT_ROOT"
  if docker compose ps api 2>/dev/null | grep -q "Up"; then
    docker compose exec -T api sh -c \
      "cd /app/apps/api && DATABASE_URL=postgres://forge:forge@postgres:5432/forge pnpm db:seed 2>&1" \
      | tail -5 || warn "Seed script not found or already seeded — continuing"
  else
    export DATABASE_URL="${DATABASE_URL:-postgres://forge:forge@localhost:5432/forge}"
    pnpm --filter @forge/api db:seed 2>&1 | tail -5 || warn "Seed script not found or already seeded — continuing"
  fi
  ok "Database seed complete"
}

# ── Start dev servers ─────────────────────────────────────────────────────────
start_dev_servers() {
  header "Starting Development Servers"

  mkdir -p "$PID_DIR" "$LOG_DIR"

  # Kill any existing dev servers
  _stop_dev_servers_quiet

  cd "$PROJECT_ROOT"

  step "Starting API server (Fastify on :3001)..."
  pnpm --filter @forge/api dev > "$API_LOG" 2>&1 &
  echo $! > "$API_PID_FILE"
  ok "API server started (PID $(cat "$API_PID_FILE")) — logs: $API_LOG"

  step "Starting Web server (Next.js on :3000)..."
  pnpm --filter @forge/web dev > "$WEB_LOG" 2>&1 &
  echo $! > "$WEB_PID_FILE"
  ok "Web server started (PID $(cat "$WEB_PID_FILE")) — logs: $WEB_LOG"

  echo ""
  step "Waiting for servers to be ready..."
  sleep 5

  local api_ready=false
  local web_ready=false
  local attempts=0

  while (( attempts < 30 )); do
    if curl -sf "http://localhost/api/v1/health" > /dev/null 2>&1; then
      api_ready=true
    fi
    if curl -sf "http://localhost" > /dev/null 2>&1; then
      web_ready=true
    fi
    [[ "$api_ready" == "true" && "$web_ready" == "true" ]] && break
    printf "."
    sleep 2
    (( attempts += 1 ))
  done
  echo ""

  if [[ "$api_ready" == "true" ]]; then
    ok "API server is ready at http://localhost/api/v1"
  else
    warn "API server may still be starting — check logs: tail -f $API_LOG"
  fi

  if [[ "$web_ready" == "true" ]]; then
    ok "Web app is ready at http://localhost"
  else
    warn "Web server may still be starting — check logs: tail -f $WEB_LOG"
  fi
}

# ── Health check ──────────────────────────────────────────────────────────────
health_check() {
  header "Health Check"

  local response
  response=$(curl -sf "http://localhost/api/v1/health" 2>/dev/null || echo "UNREACHABLE")

  if [[ "$response" == "UNREACHABLE" ]]; then
    warn "API health check failed — server may still be starting"
    info "Try: curl http://localhost/api/v1/health"
  else
    echo -e "  ${GREEN}API health:${RESET} $response"
    ok "Full stack is healthy"
  fi

  # Show service status
  echo ""
  step "Docker service status:"
  docker compose ps --format "table {{.Name}}\t{{.Status}}\t{{.Ports}}" 2>/dev/null || docker compose ps

  # Dev server status
  echo ""
  step "Dev server processes:"
  if [[ -f "$API_PID_FILE" ]] && kill -0 "$(cat "$API_PID_FILE")" 2>/dev/null; then
    ok "API server running (PID $(cat "$API_PID_FILE"))"
  else
    warn "API server not detected as running"
  fi
  if [[ -f "$WEB_PID_FILE" ]] && kill -0 "$(cat "$WEB_PID_FILE")" 2>/dev/null; then
    ok "Web server running (PID $(cat "$WEB_PID_FILE"))"
  else
    warn "Web server not detected as running"
  fi
}

# ── Print access summary ──────────────────────────────────────────────────────
print_summary() {
  header "Forge AI is Running 🚀"

  echo -e "  ${BOLD}${WHITE}App URLs:${RESET}"
  echo -e "  ${CYAN}Main app:${RESET}          http://localhost"
  echo -e "  ${CYAN}API health:${RESET}        http://localhost/api/v1/health"
  echo -e "  ${CYAN}Analytics:${RESET}         http://localhost/analytics"
  echo -e "  ${CYAN}Pricing:${RESET}           http://localhost/pricing"
  echo -e "  ${CYAN}Templates:${RESET}         http://localhost/templates"
  echo -e "  ${CYAN}Team Members:${RESET}      http://localhost/settings/members"
  echo ""
  echo -e "  ${BOLD}${WHITE}Infrastructure:${RESET}"
  echo -e "  ${CYAN}MinIO Console:${RESET}     http://localhost:9001  (minioadmin / minioadmin)"
  echo -e "  ${CYAN}Traefik Dashboard:${RESET} http://localhost:8080"
  echo ""
  echo -e "  ${BOLD}${WHITE}First-time login:${RESET}"
  echo -e "  1. Open ${CYAN}http://localhost${RESET}"
  echo -e "  2. Sign up with email/password or sign in with GitHub/Google"
  echo -e "  3. You'll land on the dashboard — create your first project!"
  echo ""
  echo -e "  ${BOLD}${WHITE}Useful commands:${RESET}"
  echo -e "  ${DIM}./forge-setup.sh --status${RESET}     Check service health"
  echo -e "  ${DIM}./forge-setup.sh --logs${RESET}       Tail dev server logs"
  echo -e "  ${DIM}./forge-setup.sh --stop${RESET}       Stop dev servers only"
  echo -e "  ${DIM}./forge-setup.sh --teardown${RESET}   Stop everything"
  echo -e "  ${DIM}./forge-setup.sh --nuke${RESET}       Teardown + wipe all data"
  echo ""
  echo -e "  ${BOLD}${WHITE}Dev server logs:${RESET}"
  echo -e "  ${DIM}tail -f ${API_LOG}${RESET}"
  echo -e "  ${DIM}tail -f ${WEB_LOG}${RESET}"
  echo ""
  divider
  echo -e "  ${DIM}To tear everything down: ${RESET}${BOLD}./forge-setup.sh --teardown${RESET}"
  echo ""
}

# ── Stop dev servers (quiet) ──────────────────────────────────────────────────
_stop_dev_servers_quiet() {
  if [[ -f "$API_PID_FILE" ]]; then
    local pid
    pid=$(cat "$API_PID_FILE" 2>/dev/null || echo "")
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$API_PID_FILE"
  fi
  if [[ -f "$WEB_PID_FILE" ]]; then
    local pid
    pid=$(cat "$WEB_PID_FILE" 2>/dev/null || echo "")
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$WEB_PID_FILE"
  fi
  # Also kill any lingering pnpm dev processes for this project
  pkill -f "pnpm.*@forge/(api|web).*dev" 2>/dev/null || true
}

# ── Stop dev servers (verbose) ────────────────────────────────────────────────
stop_dev_servers() {
  header "Stopping Dev Servers"
  _stop_dev_servers_quiet
  sleep 1
  ok "Dev servers stopped"
}

# ── Full teardown ─────────────────────────────────────────────────────────────
teardown() {
  local nuke="${1:-false}"

  header "Tearing Down Forge AI"

  step "Stopping dev servers..."
  _stop_dev_servers_quiet
  ok "Dev servers stopped"

  step "Stopping Docker services..."
  cd "$PROJECT_ROOT"
  if [[ "$nuke" == "true" ]]; then
    warn "NUKE MODE: Removing containers AND volumes (all database data will be lost)"
    prompt_yn CONFIRM_NUKE "Are you sure you want to delete all data?" "n"
    if [[ "$CONFIRM_NUKE" == "y" ]]; then
      docker compose down -v --remove-orphans
      ok "Docker containers and volumes removed"
      rm -f "$SETUP_DONE_FLAG"
      ok "Setup flag cleared (next run will re-collect configuration)"
    else
      info "Nuke cancelled. Running normal teardown instead."
      docker compose down --remove-orphans
      ok "Docker containers stopped (volumes preserved)"
    fi
  else
    docker compose down --remove-orphans
    ok "Docker containers stopped (data volumes preserved)"
    info "To also wipe all data: ./forge-setup.sh --nuke"
  fi

  # Clean up PID/log dirs
  rm -rf "$PID_DIR"
  ok "PID files cleaned up"

  echo ""
  ok "Teardown complete. Run ./forge-setup.sh to start again."
}

# ── Status ────────────────────────────────────────────────────────────────────
show_status() {
  header "Forge AI — Service Status"
  cd "$PROJECT_ROOT"

  step "Docker services:"
  docker compose ps 2>/dev/null || warn "Docker Compose not available or no services running"

  echo ""
  step "API health check:"
  local health
  health=$(curl -sf "http://localhost/api/v1/health" 2>/dev/null || echo "UNREACHABLE")
  if [[ "$health" == "UNREACHABLE" ]]; then
    warn "API unreachable — is the dev server running?"
  else
    echo -e "  ${GREEN}$health${RESET}"
  fi

  echo ""
  step "Dev server processes:"
  if [[ -f "$API_PID_FILE" ]] && kill -0 "$(cat "$API_PID_FILE")" 2>/dev/null; then
    ok "API server running (PID $(cat "$API_PID_FILE"))"
  else
    warn "API server: NOT running"
  fi
  if [[ -f "$WEB_PID_FILE" ]] && kill -0 "$(cat "$WEB_PID_FILE")" 2>/dev/null; then
    ok "Web server running (PID $(cat "$WEB_PID_FILE"))"
  else
    warn "Web server: NOT running"
  fi
}

# ── Tail logs ─────────────────────────────────────────────────────────────────
show_logs() {
  header "Dev Server Logs (Ctrl+C to exit)"
  if [[ ! -f "$API_LOG" && ! -f "$WEB_LOG" ]]; then
    warn "No log files found. Are the dev servers running?"
    info "Start them with: ./forge-setup.sh --start"
    exit 1
  fi
  # Interleave both logs
  tail -f "${API_LOG:-/dev/null}" "${WEB_LOG:-/dev/null}" 2>/dev/null
}

# ── Start only (env already exists) ───────────────────────────────────────────
start_only() {
  if [[ ! -f "$PROJECT_ROOT/apps/api/.env" ]]; then
    error "apps/api/.env not found. Run ./forge-setup.sh first."
    exit 1
  fi
  if [[ ! -f "$PROJECT_ROOT/apps/web/.env.local" ]]; then
    error "apps/web/.env.local not found. Run ./forge-setup.sh first."
    exit 1
  fi

  start_docker
  start_dev_servers
  print_summary
}

# ── Restart dev servers only ──────────────────────────────────────────────────
restart_dev_servers() {
  header "Restarting Dev Servers"
  stop_dev_servers
  start_dev_servers
  print_summary
}

# ── Signal handler (Ctrl+C during full setup) ─────────────────────────────────
trap_sigint() {
  echo ""
  echo ""
  warn "Setup interrupted by user."
  info "Run ./forge-setup.sh --teardown to clean up if needed."
  exit 130
}

# ── Main entry point ──────────────────────────────────────────────────────────
main() {
  cd "$PROJECT_ROOT"

  # Show banner
  echo ""
  echo -e "${BOLD}${MAGENTA}"
  echo "  ███████╗ ██████╗ ██████╗  ██████╗ ███████╗     █████╗ ██╗"
  echo "  ██╔════╝██╔═══██╗██╔══██╗██╔════╝ ██╔════╝    ██╔══██╗██║"
  echo "  █████╗  ██║   ██║██████╔╝██║  ███╗█████╗      ███████║██║"
  echo "  ██╔══╝  ██║   ██║██╔══██╗██║   ██║██╔══╝      ██╔══██║██║"
  echo "  ██║     ╚██████╔╝██║  ██║╚██████╔╝███████╗    ██║  ██║██║"
  echo "  ╚═╝      ╚═════╝ ╚═╝  ╚═╝ ╚═════╝ ╚══════╝    ╚═╝  ╚═╝╚═╝"
  echo -e "${RESET}"
  echo -e "  ${DIM}Local Development Setup Script — Sprints 0–12${RESET}"
  echo ""

  local mode="${1:-setup}"

  case "$mode" in
    --teardown)
      teardown false
      ;;
    --nuke)
      teardown true
      ;;
    --start)
      check_prereqs
      start_only
      ;;
    --stop)
      stop_dev_servers
      ;;
    --restart)
      restart_dev_servers
      ;;
    --status)
      show_status
      ;;
    --logs)
      show_logs
      ;;
    --help|-h)
      echo -e "${BOLD}Usage:${RESET}"
      echo "  ./forge-setup.sh              Full interactive setup"
      echo "  ./forge-setup.sh --start      Start services (env files must exist)"
      echo "  ./forge-setup.sh --stop       Stop dev servers only"
      echo "  ./forge-setup.sh --restart    Restart dev servers"
      echo "  ./forge-setup.sh --teardown   Stop all + remove Docker containers"
      echo "  ./forge-setup.sh --nuke       Teardown + wipe all data (volumes)"
      echo "  ./forge-setup.sh --status     Show service health"
      echo "  ./forge-setup.sh --logs       Tail dev server logs"
      echo "  ./forge-setup.sh --help       Show this message"
      ;;
    setup|*)
      trap trap_sigint INT

      check_prereqs
      collect_inputs
      write_env_files
      install_deps
      start_docker
      run_migrations
      seed_db
      start_dev_servers
      health_check

      # Mark setup as done
      echo "$(date -u +%Y-%m-%dT%H:%M:%SZ)" > "$SETUP_DONE_FLAG"

      print_summary
      ;;
  esac
}

main "$@"
