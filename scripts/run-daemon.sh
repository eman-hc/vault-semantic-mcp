#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/home/node/.openclaw/vault-semantic-mcp"
ENV_FILE="$PROJECT_DIR/.env"

cd "$PROJECT_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing $ENV_FILE; create it before running the daemon" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
source "$ENV_FILE"
set +a

AUTH_PROFILES="$HOME/.openclaw/agents/main/agent/auth-profiles.json"
if [[ -z "${OPENAI_API_KEY:-}" && -f "$AUTH_PROFILES" ]]; then
  OPENAI_API_KEY=$(node -e 'const fs=require("fs");
    const path=process.argv[1];
    try {
      const data=JSON.parse(fs.readFileSync(path, "utf8"));
      const key=data?.profiles?.["openai:default"]?.key || "";
      process.stdout.write(key);
    } catch (err) {
      process.stdout.write("");
    }
  ' "$AUTH_PROFILES")
fi

if [[ -z "${OPENAI_API_KEY:-}" ]]; then
  echo "Missing OPENAI_API_KEY (set it in $ENV_FILE or auth-profiles.json)" >&2
  exit 1
fi

export OPENAI_API_KEY
exec /usr/bin/env node dist/index.js
